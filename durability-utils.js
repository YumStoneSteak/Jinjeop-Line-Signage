const fs = require('fs');
const path = require('path');

const TRANSIENT_READ_ERROR_CODES = new Set([
  'EACCES',
  'EBUSY',
  'EPERM',
  'EMFILE',
  'ENFILE'
]);
const DEFAULT_READ_RETRY_DELAYS_MS = [20, 50, 100];

function ensureParentDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function sleepSync(delayMs) {
  const durationMs = Math.max(0, Number(delayMs) || 0);
  if (!durationMs) {
    return;
  }
  const waitBuffer = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(waitBuffer, 0, 0, durationMs);
}

function parseJsonFile(filePath, fileSystem = fs) {
  return JSON.parse(fileSystem.readFileSync(filePath, 'utf-8'));
}

function isJsonSyntaxError(err) {
  return err instanceof SyntaxError;
}

function isTransientReadError(err, existedBeforeRead) {
  return TRANSIENT_READ_ERROR_CODES.has(err?.code)
    || (existedBeforeRead && err?.code === 'ENOENT');
}

function readJsonWithRetries(filePath, options = {}) {
  const fileSystem = options.fileSystem || fs;
  const retryDelaysMs = Array.isArray(options.retryDelaysMs)
    ? options.retryDelaysMs
    : DEFAULT_READ_RETRY_DELAYS_MS;
  const wait = typeof options.sleepSync === 'function' ? options.sleepSync : sleepSync;
  const existedBeforeRead = options.existedBeforeRead === true;

  for (let attempt = 0; ; attempt += 1) {
    try {
      return {
        ok: true,
        value: parseJsonFile(filePath, fileSystem),
        error: null,
        failureKind: null,
        attempts: attempt + 1
      };
    } catch (err) {
      if (isJsonSyntaxError(err)) {
        return {
          ok: false,
          value: null,
          error: err,
          failureKind: 'syntax',
          attempts: attempt + 1
        };
      }

      const transient = isTransientReadError(err, existedBeforeRead);
      if (transient && attempt < retryDelaysMs.length) {
        wait(retryDelaysMs[attempt]);
        continue;
      }

      return {
        ok: false,
        value: null,
        error: err,
        failureKind: transient ? 'transient' : 'read-error',
        attempts: attempt + 1
      };
    }
  }
}

function quarantineCorruptFile(filePath, fileSystem = fs) {
  if (!fileSystem.existsSync(filePath)) {
    return null;
  }
  const quarantinePath = `${filePath}.corrupt-${Date.now()}`;
  try {
    fileSystem.renameSync(filePath, quarantinePath);
    return quarantinePath;
  } catch (_) {
    return null;
  }
}

function readJsonWithBackupSync(filePath, fallbackFactory, options = {}) {
  const fileSystem = options.fileSystem || fs;
  const retryOptions = {
    fileSystem,
    retryDelaysMs: options.retryDelaysMs,
    sleepSync: options.sleepSync
  };
  const backupPath = `${filePath}.bak`;
  let primaryError = null;
  let primaryFailureKind = 'missing';
  const primaryExists = fileSystem.existsSync(filePath);

  if (primaryExists) {
    const primaryResult = readJsonWithRetries(filePath, {
      ...retryOptions,
      existedBeforeRead: true
    });
    if (primaryResult.ok) {
      return {
        value: primaryResult.value,
        recovered: false,
        degraded: false,
        source: 'primary',
        sourceDetail: 'primary',
        error: null
      };
    }

    primaryError = primaryResult.error;
    primaryFailureKind = primaryResult.failureKind;
    if (primaryFailureKind === 'syntax') {
      quarantineCorruptFile(filePath, fileSystem);
    }
  }

  const backupExists = fileSystem.existsSync(backupPath);
  if (backupExists) {
    const backupResult = readJsonWithRetries(backupPath, {
      ...retryOptions,
      existedBeforeRead: true
    });
    if (backupResult.ok) {
      if (primaryFailureKind === 'transient' || primaryFailureKind === 'read-error') {
        return {
          value: backupResult.value,
          recovered: true,
          degraded: true,
          source: primaryFailureKind === 'transient' ? 'backup-transient' : 'backup-read-error',
          sourceDetail: primaryFailureKind === 'transient' ? 'backup-transient' : 'backup-read-error',
          error: primaryError
        };
      }

      writeJsonAtomicSync(filePath, backupResult.value, { keepBackup: false, fileSystem });
      return {
        value: backupResult.value,
        recovered: true,
        degraded: false,
        // Preserve the legacy source value while making the recovery cause explicit.
        source: 'backup',
        sourceDetail: primaryFailureKind === 'syntax' ? 'backup-corrupt' : 'backup-missing',
        error: primaryError
      };
    }

    if (backupResult.failureKind === 'syntax') {
      quarantineCorruptFile(backupPath, fileSystem);
    }

    if (backupResult.failureKind === 'transient' || backupResult.failureKind === 'read-error') {
      return {
        value: typeof fallbackFactory === 'function' ? fallbackFactory() : fallbackFactory,
        recovered: false,
        degraded: true,
        source: backupResult.failureKind === 'transient' ? 'fallback-transient' : 'fallback-read-error',
        sourceDetail: backupResult.failureKind === 'transient' ? 'fallback-transient' : 'fallback-read-error',
        error: primaryError || backupResult.error
      };
    }
  }

  const degraded = primaryFailureKind === 'transient' || primaryFailureKind === 'read-error';
  const source = primaryFailureKind === 'transient'
    ? 'fallback-transient'
    : primaryFailureKind === 'read-error'
      ? 'fallback-read-error'
      : 'fallback';
  return {
    value: typeof fallbackFactory === 'function' ? fallbackFactory() : fallbackFactory,
    recovered: false,
    degraded,
    source,
    sourceDetail: primaryFailureKind === 'syntax' ? 'fallback-corrupt' : source,
    error: primaryError
  };
}

function writeJsonAtomicSync(filePath, value, options = {}) {
  const { keepBackup = true, fileSystem = fs } = options;
  fileSystem.mkdirSync(path.dirname(filePath), { recursive: true });
  const writeId = `${process.pid}.${Date.now()}`;
  const tempPath = `${filePath}.${writeId}.tmp`;
  const backupPath = `${filePath}.bak`;
  const backupTempPath = `${backupPath}.${writeId}.tmp`;
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  let fd = null;
  let primaryCommitted = false;

  try {
    fd = fileSystem.openSync(tempPath, 'w');
    fileSystem.writeFileSync(fd, payload, 'utf-8');
    fileSystem.fsyncSync(fd);
    fileSystem.closeSync(fd);
    fd = null;

    if (keepBackup && fileSystem.existsSync(filePath)) {
      fileSystem.copyFileSync(filePath, backupTempPath);
    }
    fileSystem.renameSync(tempPath, filePath);
    primaryCommitted = true;

    if (keepBackup && fileSystem.existsSync(backupTempPath)) {
      try {
        fileSystem.renameSync(backupTempPath, backupPath);
      } catch (_) {
        // The primary commit succeeded; retain the previous valid backup if publishing its replacement fails.
      }
    }
  } finally {
    if (fd !== null) {
      try { fileSystem.closeSync(fd); } catch (_) {}
    }
    if (!primaryCommitted && fileSystem.existsSync(tempPath)) {
      try { fileSystem.unlinkSync(tempPath); } catch (_) {}
    }
    if (fileSystem.existsSync(backupTempPath)) {
      try { fileSystem.unlinkSync(backupTempPath); } catch (_) {}
    }
  }

  return value;
}

function rotateLogSync(filePath, options = {}) {
  const maxBytes = Math.max(1024, Number(options.maxBytes) || (5 * 1024 * 1024));
  const maxFiles = Math.max(1, Number(options.maxFiles) || 5);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size < maxBytes) {
    return false;
  }

  for (let index = maxFiles - 1; index >= 1; index -= 1) {
    const source = index === 1 ? filePath : `${filePath}.${index - 1}`;
    const target = `${filePath}.${index}`;
    if (!fs.existsSync(source)) {
      continue;
    }
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
    fs.renameSync(source, target);
  }
  return true;
}

function appendBoundedLogSync(filePath, line, options = {}) {
  ensureParentDirectory(filePath);
  rotateLogSync(filePath, options);
  fs.appendFileSync(filePath, `${line}\n`, 'utf-8');
}

module.exports = {
  appendBoundedLogSync,
  readJsonWithBackupSync,
  rotateLogSync,
  writeJsonAtomicSync
};
