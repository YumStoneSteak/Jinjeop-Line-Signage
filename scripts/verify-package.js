const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const asar = require('@electron/asar');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const unpackedDir = path.join(distDir, 'win-unpacked');
const resourcesDir = path.join(unpackedDir, 'resources');
const asarPath = path.join(resourcesDir, 'app.asar');
const sourcePackage = require(path.join(projectRoot, 'package.json'));
const installerName = `Jinjeop.Line.Signage.v${sourcePackage.version}.exe`;
const installerPath = path.join(distDir, installerName);
const blockmapPath = `${installerPath}.blockmap`;
const latestYmlPath = path.join(distDir, 'latest.yml');
const appUpdateYmlPath = path.join(resourcesDir, 'app-update.yml');
const maxAsarBytes = 25 * 1024 * 1024;

const requiredAsarEntries = [
  'package.json',
  'main.js',
  'preload.js',
  'config-defaults.js',
  'durability-utils.js',
  'maintenance-utils.js',
  'notice-utils.js',
  'update-schedule-utils.js',
  'settings-help.js',
  'smss-drag-utils.js',
  'smss-recovery-utils.js',
  'runtime-recovery-utils.js',
  'air-quality.js',
  'renderer/index.html',
  'renderer/renderer.js',
  'renderer/styles.css',
  'renderer/fonts/SUIT-Variable.woff2',
  'renderer/fonts/LICENSE-SUIT.txt',
  'files/icons/ncuc.ico',
  'files/icons/line4_down_icon.png',
  'files/icons/line4_up_icon.png',
  'files/logos/ncuc_logo.png',
  'node_modules/electron-updater/out/main.js',
  'node_modules/builder-util-runtime/out/index.js'
];

const sourceBackedAsarEntries = requiredAsarEntries.filter((entry) => (
  entry !== 'package.json' && !entry.startsWith('node_modules/')
));

const allowedTopLevelEntries = new Set([
  'package.json',
  'main.js',
  'preload.js',
  'config-defaults.js',
  'durability-utils.js',
  'maintenance-utils.js',
  'notice-utils.js',
  'update-schedule-utils.js',
  'settings-help.js',
  'smss-drag-utils.js',
  'smss-recovery-utils.js',
  'runtime-recovery-utils.js',
  'air-quality.js',
  'renderer',
  'files',
  'node_modules'
]);

const forbiddenAsarTrees = [
  '.electron-builder-cache',
  'logs',
  'scripts',
  'watchdog',
  'build',
  'node_modules/electron',
  'node_modules/electron-builder',
  'node_modules/app-builder-lib',
  'node_modules/@electron/asar'
];

const forbiddenAsarEntries = new Set([
  'README.md',
  'MANUAL.md',
  'RELEASE_GUIDE.md',
  'RELEASE_NOTES.md',
  'RELEASE_NOTE_CHECKLIST.md',
  'release-github.bat',
  'build-installer.bat',
  'run-dev-check.bat',
  'ncuc.ico',
  'package-lock.json'
]);

function normalizeArchivePath(value) {
  return String(value || '').replace(/^[\\/]+/, '').replace(/\\/g, '/');
}

function toAsarLookupPath(value) {
  return normalizeArchivePath(value).split('/').join(path.sep);
}

function isInTree(entry, tree) {
  return entry === tree || entry.startsWith(`${tree}/`);
}

function mustBeNonEmptyFile(filePath, label = filePath) {
  assert.equal(fs.existsSync(filePath), true, `${label} is missing: ${filePath}`);
  const stat = fs.statSync(filePath);
  assert.equal(stat.isFile(), true, `${label} is not a file: ${filePath}`);
  assert.ok(stat.size > 0, `${label} is empty: ${filePath}`);
  return stat;
}

function hashBuffer(buffer, algorithm = 'sha256', encoding = 'hex') {
  return crypto.createHash(algorithm).update(buffer).digest(encoding);
}

function hashFile(filePath, algorithm = 'sha256', encoding = 'hex') {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const input = fs.createReadStream(filePath);
    input.on('error', reject);
    input.on('data', (chunk) => hash.update(chunk));
    input.on('end', () => resolve(hash.digest(encoding)));
  });
}

function walkFiles(baseDir, currentDir = baseDir) {
  assert.equal(fs.existsSync(baseDir), true, `directory is missing: ${baseDir}`);
  const files = [];
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(baseDir, absolutePath));
      continue;
    }
    if (!entry.isFile() || entry.name === '.gitkeep') {
      continue;
    }
    files.push(normalizeArchivePath(path.relative(baseDir, absolutePath)));
  }
  return files.sort();
}

async function compareTrees(sourceDir, packagedDir, label) {
  const sourceFiles = walkFiles(sourceDir);
  const packagedFiles = walkFiles(packagedDir);
  assert.deepEqual(packagedFiles, sourceFiles, `${label} packaged file list differs from source`);

  await Promise.all(sourceFiles.map(async (relativePath) => {
    const sourcePath = path.join(sourceDir, ...relativePath.split('/'));
    const packagedPath = path.join(packagedDir, ...relativePath.split('/'));
    const [sourceHash, packagedHash] = await Promise.all([
      hashFile(sourcePath),
      hashFile(packagedPath)
    ]);
    assert.equal(packagedHash, sourceHash, `${label} hash differs: ${relativePath}`);
  }));

  return sourceFiles.length;
}

function unquoteYamlScalar(value) {
  const trimmed = String(value || '').trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"');
  }
  return trimmed;
}

function getYamlValues(source, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^\\s*(?:-\\s*)?${escapedKey}:\\s*(.*?)\\s*$`, 'gm');
  return Array.from(source.matchAll(pattern), (match) => unquoteYamlScalar(match[1]));
}

function getSingleYamlValue(source, key) {
  const values = getYamlValues(source, key);
  assert.equal(values.length, 1, `expected exactly one ${key} value in YAML, found ${values.length}`);
  return values[0];
}

async function verifyPackage() {
  const asarStat = mustBeNonEmptyFile(asarPath, 'app.asar');
  assert.ok(
    asarStat.size <= maxAsarBytes,
    `app.asar is unexpectedly large: ${asarStat.size} bytes (limit ${maxAsarBytes})`
  );

  const asarEntries = new Set(asar.listPackage(asarPath).map(normalizeArchivePath).filter(Boolean));
  for (const requiredEntry of requiredAsarEntries) {
    assert.equal(asarEntries.has(requiredEntry), true, `missing from app.asar: ${requiredEntry}`);
  }

  for (const entry of asarEntries) {
    const topLevelEntry = entry.split('/')[0];
    assert.equal(
      allowedTopLevelEntries.has(topLevelEntry),
      true,
      `unexpected top-level app.asar entry: ${entry}`
    );
    assert.equal(forbiddenAsarEntries.has(entry), false, `forbidden app.asar entry: ${entry}`);
    for (const forbiddenTree of forbiddenAsarTrees) {
      assert.equal(isInTree(entry, forbiddenTree), false, `forbidden app.asar tree: ${entry}`);
    }
  }

  const packagedPackage = JSON.parse(asar.extractFile(asarPath, 'package.json').toString('utf8'));
  assert.equal(packagedPackage.name, sourcePackage.name, 'packaged package name differs from source');
  assert.equal(packagedPackage.version, sourcePackage.version, 'packaged package version differs from source');
  assert.equal(packagedPackage.main, sourcePackage.main, 'packaged package main differs from source');

  for (const relativePath of sourceBackedAsarEntries) {
    const sourcePath = path.join(projectRoot, ...relativePath.split('/'));
    mustBeNonEmptyFile(sourcePath, `source file for ${relativePath}`);
    const sourceHash = await hashFile(sourcePath);
    const packagedHash = hashBuffer(asar.extractFile(asarPath, toAsarLookupPath(relativePath)));
    assert.equal(packagedHash, sourceHash, `app.asar content differs from source: ${relativePath}`);
  }

  const watchdogFileCount = await compareTrees(
    path.join(projectRoot, 'watchdog'),
    path.join(resourcesDir, 'watchdog'),
    'watchdog resources'
  );
  const externalFileCount = await compareTrees(
    path.join(projectRoot, 'files'),
    path.join(unpackedDir, 'files'),
    'external files'
  );

  mustBeNonEmptyFile(appUpdateYmlPath, 'app-update.yml');
  const appUpdateYml = fs.readFileSync(appUpdateYmlPath, 'utf8');
  assert.equal(getSingleYamlValue(appUpdateYml, 'provider'), 'github', 'unexpected update provider');
  assert.equal(getSingleYamlValue(appUpdateYml, 'owner'), 'YumStoneSteak', 'unexpected update owner');
  assert.equal(getSingleYamlValue(appUpdateYml, 'repo'), 'Jinjeop-Line-Signage', 'unexpected update repo');
  assert.equal(getSingleYamlValue(appUpdateYml, 'releaseType'), 'release', 'unexpected update release type');

  const installerStat = mustBeNonEmptyFile(installerPath, 'installer');
  mustBeNonEmptyFile(blockmapPath, 'installer blockmap');
  const blockmap = JSON.parse(zlib.gunzipSync(fs.readFileSync(blockmapPath)).toString('utf8'));
  assert.equal(blockmap.version, '2', `unexpected blockmap format version: ${blockmap.version}`);
  assert.ok(Array.isArray(blockmap.files) && blockmap.files.length > 0, 'blockmap contains no files');
  let blockmapFileBytes = 0;
  for (const file of blockmap.files) {
    assert.ok(Array.isArray(file.sizes) && file.sizes.length > 0, `blockmap has no sizes: ${file.name}`);
    assert.ok(Array.isArray(file.checksums), `blockmap has no checksums: ${file.name}`);
    assert.equal(file.checksums.length, file.sizes.length, `blockmap checksum count differs: ${file.name}`);
    for (const size of file.sizes) {
      assert.ok(Number.isInteger(size) && size > 0, `invalid blockmap chunk size: ${file.name}`);
      blockmapFileBytes += size;
    }
    for (const checksum of file.checksums) {
      assert.ok(Buffer.from(checksum, 'base64').length > 0, `invalid blockmap checksum: ${file.name}`);
    }
  }
  assert.equal(blockmapFileBytes, installerStat.size, 'blockmap file size differs from installer');
  mustBeNonEmptyFile(latestYmlPath, 'latest.yml');
  const latestYml = fs.readFileSync(latestYmlPath, 'utf8');
  const installerSha512 = await hashFile(installerPath, 'sha512', 'base64');
  const installerSha256 = await hashFile(installerPath, 'sha256', 'hex');
  const blockmapSha256 = await hashFile(blockmapPath, 'sha256', 'hex');

  assert.equal(getSingleYamlValue(latestYml, 'version'), sourcePackage.version, 'latest.yml version differs');
  assert.equal(getSingleYamlValue(latestYml, 'url'), installerName, 'latest.yml URL differs');
  assert.equal(getSingleYamlValue(latestYml, 'path'), installerName, 'latest.yml path differs');
  assert.equal(Number(getSingleYamlValue(latestYml, 'size')), installerStat.size, 'latest.yml size differs');

  const latestSha512Values = getYamlValues(latestYml, 'sha512');
  assert.ok(latestSha512Values.length >= 2, 'latest.yml must contain file and top-level SHA-512 values');
  for (const sha512Value of latestSha512Values) {
    assert.equal(sha512Value, installerSha512, 'latest.yml SHA-512 differs from installer');
  }

  const releaseDate = getSingleYamlValue(latestYml, 'releaseDate');
  assert.equal(Number.isNaN(Date.parse(releaseDate)), false, `invalid latest.yml releaseDate: ${releaseDate}`);

  console.log(JSON.stringify({
    version: sourcePackage.version,
    asarBytes: asarStat.size,
    asarEntries: asarEntries.size,
    watchdogFiles: watchdogFileCount,
    externalFiles: externalFileCount,
    installerBytes: installerStat.size,
    installerSha256: installerSha256.toUpperCase(),
    blockmapSha256: blockmapSha256.toUpperCase()
  }, null, 2));
  console.log('package verification passed');
}

verifyPackage().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
