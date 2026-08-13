const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  readJsonWithBackupSync,
  writeJsonAtomicSync
} = require('../durability-utils');

function createFsOverride(overrides = {}) {
  return Object.assign(Object.create(fs), overrides);
}

function makeFsError(code, message = code) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function listCorruptFiles(directory, basename) {
  return fs.readdirSync(directory).filter((name) => name.startsWith(`${basename}.corrupt-`));
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jinjeop-durability-'));

try {
  {
    const primaryPath = path.join(tempDir, 'transient-then-success.json');
    fs.writeFileSync(primaryPath, '{"generation":4}\n', 'utf8');
    const retryDelays = [];
    let primaryReadAttempts = 0;
    const transientFs = createFsOverride({
      readFileSync(filePath, ...args) {
        if (filePath === primaryPath && primaryReadAttempts < 3) {
          primaryReadAttempts += 1;
          throw makeFsError('EBUSY');
        }
        primaryReadAttempts += filePath === primaryPath ? 1 : 0;
        return fs.readFileSync(filePath, ...args);
      }
    });

    const result = readJsonWithBackupSync(primaryPath, () => ({ generation: 0 }), {
      fileSystem: transientFs,
      sleepSync: (delayMs) => retryDelays.push(delayMs)
    });

    assert.equal(result.source, 'primary');
    assert.equal(result.degraded, false);
    assert.deepEqual(result.value, { generation: 4 });
    assert.equal(primaryReadAttempts, 4);
    assert.deepEqual(retryDelays, [20, 50, 100]);
    assert.deepEqual(listCorruptFiles(tempDir, path.basename(primaryPath)), []);
  }

  {
    const primaryPath = path.join(tempDir, 'persistent-transient.json');
    const backupPath = `${primaryPath}.bak`;
    const primaryBytes = '{"generation":8}\n';
    const backupBytes = '{"generation":7}\n';
    fs.writeFileSync(primaryPath, primaryBytes, 'utf8');
    fs.writeFileSync(backupPath, backupBytes, 'utf8');
    const retryDelays = [];
    let primaryReadAttempts = 0;
    const transientFs = createFsOverride({
      readFileSync(filePath, ...args) {
        if (filePath === primaryPath) {
          primaryReadAttempts += 1;
          throw makeFsError('EACCES');
        }
        return fs.readFileSync(filePath, ...args);
      }
    });

    const result = readJsonWithBackupSync(primaryPath, () => ({ generation: 0 }), {
      fileSystem: transientFs,
      sleepSync: (delayMs) => retryDelays.push(delayMs)
    });

    assert.equal(result.source, 'backup-transient');
    assert.equal(result.sourceDetail, 'backup-transient');
    assert.equal(result.degraded, true);
    assert.equal(result.recovered, true);
    assert.deepEqual(result.value, { generation: 7 });
    assert.equal(primaryReadAttempts, 4);
    assert.deepEqual(retryDelays, [20, 50, 100]);
    assert.equal(fs.readFileSync(primaryPath, 'utf8'), primaryBytes);
    assert.equal(fs.readFileSync(backupPath, 'utf8'), backupBytes);
    assert.deepEqual(listCorruptFiles(tempDir, path.basename(primaryPath)), []);
  }

  {
    const primaryPath = path.join(tempDir, 'exists-then-missing.json');
    const primaryBytes = '{"generation":3}\n';
    fs.writeFileSync(primaryPath, primaryBytes, 'utf8');
    let primaryReadAttempts = 0;
    const transientFs = createFsOverride({
      readFileSync(filePath, ...args) {
        if (filePath === primaryPath) {
          primaryReadAttempts += 1;
          throw makeFsError('ENOENT');
        }
        return fs.readFileSync(filePath, ...args);
      }
    });

    const result = readJsonWithBackupSync(primaryPath, () => ({ generation: 0 }), {
      fileSystem: transientFs,
      sleepSync: () => {}
    });

    assert.equal(result.source, 'fallback-transient');
    assert.equal(result.degraded, true);
    assert.deepEqual(result.value, { generation: 0 });
    assert.equal(primaryReadAttempts, 4);
    assert.equal(fs.readFileSync(primaryPath, 'utf8'), primaryBytes);
    assert.deepEqual(listCorruptFiles(tempDir, path.basename(primaryPath)), []);
  }

  {
    const primaryPath = path.join(tempDir, 'malformed-with-backup.json');
    const backupPath = `${primaryPath}.bak`;
    fs.writeFileSync(primaryPath, '{broken', 'utf8');
    fs.writeFileSync(backupPath, '{"generation":11}\n', 'utf8');

    const result = readJsonWithBackupSync(primaryPath, () => ({ generation: 0 }));

    assert.equal(result.source, 'backup');
    assert.equal(result.sourceDetail, 'backup-corrupt');
    assert.equal(result.degraded, false);
    assert.equal(result.recovered, true);
    assert.deepEqual(result.value, { generation: 11 });
    assert.deepEqual(JSON.parse(fs.readFileSync(primaryPath, 'utf8')), { generation: 11 });
    assert.equal(listCorruptFiles(tempDir, path.basename(primaryPath)).length, 1);
  }

  {
    const primaryPath = path.join(tempDir, 'rename-failure.json');
    const backupPath = `${primaryPath}.bak`;
    const primaryBytes = '{"generation":20}\n';
    const backupBytes = '{"generation":19}\n';
    fs.writeFileSync(primaryPath, primaryBytes, 'utf8');
    fs.writeFileSync(backupPath, backupBytes, 'utf8');
    const failingFs = createFsOverride({
      renameSync(sourcePath, targetPath) {
        if (targetPath === primaryPath) {
          throw makeFsError('EBUSY', 'simulated target rename failure');
        }
        return fs.renameSync(sourcePath, targetPath);
      }
    });

    assert.throws(
      () => writeJsonAtomicSync(primaryPath, { generation: 21 }, { fileSystem: failingFs }),
      (err) => err?.code === 'EBUSY'
    );
    assert.equal(fs.readFileSync(primaryPath, 'utf8'), primaryBytes);
    assert.equal(fs.readFileSync(backupPath, 'utf8'), backupBytes);
    assert.equal(
      fs.readdirSync(tempDir).some((name) => name.startsWith(`${path.basename(primaryPath)}.`) && name.endsWith('.tmp')),
      false
    );
  }
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('durability verification passed');
