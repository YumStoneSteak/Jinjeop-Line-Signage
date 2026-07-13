const fs = require('fs');
const path = require('path');

function ensureParentDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function parseJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function quarantineCorruptFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const quarantinePath = `${filePath}.corrupt-${Date.now()}`;
  try {
    fs.renameSync(filePath, quarantinePath);
    return quarantinePath;
  } catch (_) {
    return null;
  }
}

function readJsonWithBackupSync(filePath, fallbackFactory) {
  const backupPath = `${filePath}.bak`;
  let primaryError = null;

  if (fs.existsSync(filePath)) {
    try {
      return { value: parseJsonFile(filePath), recovered: false, source: 'primary', error: null };
    } catch (err) {
      primaryError = err;
      quarantineCorruptFile(filePath);
    }
  }

  if (fs.existsSync(backupPath)) {
    try {
      const value = parseJsonFile(backupPath);
      writeJsonAtomicSync(filePath, value, { keepBackup: false });
      return { value, recovered: true, source: 'backup', error: primaryError };
    } catch (_) {
      quarantineCorruptFile(backupPath);
    }
  }

  return {
    value: typeof fallbackFactory === 'function' ? fallbackFactory() : fallbackFactory,
    recovered: false,
    source: 'fallback',
    error: primaryError
  };
}

function writeJsonAtomicSync(filePath, value, options = {}) {
  const { keepBackup = true } = options;
  ensureParentDirectory(filePath);
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const backupPath = `${filePath}.bak`;
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  let fd = null;

  try {
    fd = fs.openSync(tempPath, 'w');
    fs.writeFileSync(fd, payload, 'utf-8');
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = null;

    if (keepBackup && fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
    }
    fs.renameSync(tempPath, filePath);
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch (_) {}
    }
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (_) {}
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
