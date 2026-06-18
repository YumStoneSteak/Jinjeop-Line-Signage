const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const packageJson = require(path.join(projectRoot, 'package.json'));
const distDir = path.join(projectRoot, 'dist');
const latestYmlPath = path.join(distDir, 'latest.yml');

function expandArtifactName(template, ext) {
  const build = packageJson.build || {};
  const values = {
    ext,
    name: packageJson.name || '',
    productName: build.productName || packageJson.productName || packageJson.name || '',
    version: packageJson.version || ''
  };

  return String(template || '${productName} Setup ${version}.${ext}')
    .replace(/\$\{(ext|name|productName|version)\}/g, (_match, key) => values[key]);
}

function quoteYaml(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function readExistingReleaseDate() {
  if (!fs.existsSync(latestYmlPath)) {
    return new Date().toISOString();
  }

  const match = fs.readFileSync(latestYmlPath, 'utf8').match(/^releaseDate:\s*['"]?(.+?)['"]?\s*$/m);
  return match ? match[1] : new Date().toISOString();
}

const artifactTemplate = packageJson.build?.nsis?.artifactName || packageJson.build?.artifactName;
const installerName = expandArtifactName(artifactTemplate, 'exe');
const installerPath = path.join(distDir, installerName);

if (!fs.existsSync(installerPath)) {
  throw new Error(`Installer not found: ${installerPath}`);
}

const installer = fs.readFileSync(installerPath);
const sha512 = crypto.createHash('sha512').update(installer).digest('base64');
const size = fs.statSync(installerPath).size;
const releaseDate = readExistingReleaseDate();

const latestYml = [
  `version: ${packageJson.version}`,
  'files:',
  `  - url: ${quoteYaml(installerName)}`,
  `    sha512: ${sha512}`,
  `    size: ${size}`,
  `path: ${quoteYaml(installerName)}`,
  `sha512: ${sha512}`,
  `releaseDate: ${quoteYaml(releaseDate)}`,
  ''
].join('\n');

fs.writeFileSync(latestYmlPath, latestYml, 'utf8');
console.log(`updated ${path.relative(projectRoot, latestYmlPath)} -> ${installerName}`);
