const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  appendBoundedLogSync,
  readJsonWithBackupSync,
  writeJsonAtomicSync
} = require('../durability-utils');
const {
  getAutomaticWorkPauseStartTime,
  isWithinUnavailableWindow,
  normalizeMaintenanceSettings
} = require('../maintenance-utils');
const {
  getDelayUntilNextLocalDay,
  getNoticePublishState,
  normalizeNoticeSchedule,
  normalizePublishDate
} = require('../notice-utils');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jinjeop-reliability-'));
try {
  const jsonPath = path.join(tempDir, 'state.json');
  writeJsonAtomicSync(jsonPath, { generation: 1 });
  writeJsonAtomicSync(jsonPath, { generation: 2 });
  fs.writeFileSync(jsonPath, '{broken', 'utf8');
  const recovered = readJsonWithBackupSync(jsonPath, () => ({ generation: 0 }));
  assert.equal(recovered.source, 'backup');
  assert.equal(recovered.value.generation, 1);
  assert.deepEqual(JSON.parse(fs.readFileSync(jsonPath, 'utf8')), { generation: 1 });

  const logPath = path.join(tempDir, 'logs', 'runtime.log');
  for (let index = 0; index < 80; index += 1) {
    appendBoundedLogSync(logPath, `${index}:${'x'.repeat(100)}`, { maxBytes: 1024, maxFiles: 3 });
  }
  const logFiles = fs.readdirSync(path.dirname(logPath)).filter((name) => name.startsWith('runtime.log'));
  assert.ok(logFiles.length <= 3);

  const settings = normalizeMaintenanceSettings({});
  assert.equal(settings.updateTime, '00:30');
  assert.equal(settings.unavailableStartTime, '01:30');
  assert.equal(settings.unavailableEndTime, '04:30');
  assert.equal(getAutomaticWorkPauseStartTime(settings), '01:20');
  assert.equal(isWithinUnavailableWindow(new Date('2026-07-02T01:19:59+09:00'), settings), false);
  assert.equal(isWithinUnavailableWindow(new Date('2026-07-02T01:20:00+09:00'), settings), true);
  assert.equal(isWithinUnavailableWindow(new Date('2026-07-02T04:30:00+09:00'), settings), false);

  const endOnlyNotice = normalizeNoticeSchedule({
    publishEndDate: '2026-07-12'
  }, '2026-07-10');
  assert.equal(endOnlyNotice.addedDate, '2026-07-10');
  assert.equal(endOnlyNotice.publishStartDate, '2026-07-10');
  assert.equal(getNoticePublishState(endOnlyNotice, '2026-07-12').playable, true);
  assert.equal(getNoticePublishState(endOnlyNotice, '2026-07-13').code, 'ended');
  assert.equal(getNoticePublishState(endOnlyNotice, '2026-07-13').playable, false);
  assert.equal(normalizePublishDate('2026-02-30'), '');
  assert.equal(getDelayUntilNextLocalDay(new Date(2026, 6, 12, 23, 59, 59, 0)), 2000);

  const rendererSource = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  assert.match(rendererSource, /smss-post-stale-screen-preserved/);
  assert.doesNotMatch(rendererSource, /function recoverSmssPostPolling/);
  assert.match(rendererSource, /keep-current-web-screen-visible/);
  assert.doesNotMatch(rendererSource, /browserView\.classList\.(add|toggle)\([^\n]*(hidden|unavailable)/);
  assert.match(rendererSource, /scheduleNoticePublishStateRefresh\(\)/);
  assert.match(rendererSource, /publishStartDate: addedDate/);
  assert.match(rendererSource, /document\.addEventListener\('selectstart'/);
  assert.match(rendererSource, /selection\?\.removeAllRanges\(\)/);
  assert.match(rendererSource, /-webkit-user-select: none !important/);
  assert.match(rendererSource, /dragReplayInProgress/);
  assert.match(rendererSource, /smss-drag-replay-cleanup/);
  assert.match(rendererSource, /function updateDirtyUi\(dirty\)/);
  assert.match(rendererSource, /function showAppToast\(message/);
  assert.match(rendererSource, /btnSaveNoticeSettings/);
  assert.match(rendererSource, /function addNoticeFiles\(\)/);
  assert.match(rendererSource, /const existing = new Set\(state\.draftConfig\.player\.playlist\.map\(getNoticeIdentity\)\)/);
  assert.match(rendererSource, /toastMessage: '공지 설정이 저장되었습니다\.'/);

  const rendererHtml = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const rendererStyles = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'styles.css'), 'utf8');
  assert.match(rendererHtml, /id="appToast"/);
  assert.match(rendererHtml, /id="btnSaveNoticeSettings"/);
  assert.match(rendererHtml, /class="panel-action-bar"/);
  assert.doesNotMatch(rendererHtml, /\(v2\.2\.1\)/);
  assert.match(rendererStyles, /\.panel-action-bar\s*\{[\s\S]*?position: sticky/);
  assert.match(rendererStyles, /\.app-toast\s*\{/);

  const dragUtilitySource = fs.readFileSync(path.join(__dirname, '..', 'smss-drag-utils.js'), 'utf8');
  assert.match(dragUtilitySource, /finally \{[\s\S]*?type: 'mouseUp'/);

  for (const filename of ['watchdog.ps1', 'register-watchdog.ps1']) {
    const scriptPath = path.join(__dirname, '..', 'watchdog', filename);
    assert.equal(fs.existsSync(scriptPath), true);
    const command = [
      '$tokens=$null;',
      '$errors=$null;',
      '[System.Management.Automation.Language.Parser]::ParseFile($env:WATCHDOG_PARSE_PATH,[ref]$tokens,[ref]$errors) | Out-Null;',
      'if ($errors.Count -gt 0) { $errors | ForEach-Object { Write-Error $_ }; exit 1 }'
    ].join(' ');
    const parsed = spawnSync('powershell.exe', ['-NoProfile', '-Command', command], {
      encoding: 'utf8',
      windowsHide: true,
      env: { ...process.env, WATCHDOG_PARSE_PATH: scriptPath }
    });
    assert.equal(parsed.status, 0, parsed.stderr || parsed.stdout);
  }
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('reliability verification passed');
