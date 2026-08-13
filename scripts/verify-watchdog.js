const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const watchdogPath = path.join(__dirname, '..', 'watchdog', 'watchdog.ps1');
const result = spawnSync('powershell.exe', [
  '-NoProfile',
  '-ExecutionPolicy', 'Bypass',
  '-File', watchdogPath,
  '-ExecutablePath', path.join(__dirname, 'unused.exe'),
  '-HeartbeatPath', path.join(__dirname, 'unused-heartbeat.json'),
  '-PausePath', path.join(__dirname, 'unused-pause.json'),
  '-SelfTest'
], {
  encoding: 'utf8',
  windowsHide: true
});

assert.equal(result.status, 0, result.stderr || result.stdout);
assert.match(result.stdout, /watchdog self-test passed/);
console.log('watchdog verification passed');
