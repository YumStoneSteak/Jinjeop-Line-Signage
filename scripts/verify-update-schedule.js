const assert = require('node:assert/strict');
const {
  getAutomaticInstallDeadline,
  getNextScheduledUpdate,
  getScheduledRetryDecision,
  getScheduledUpdateWindow
} = require('../update-schedule-utils');

const settings = {
  updateTime: '00:30',
  unavailableStartTime: '01:30'
};

function localDate(value) {
  return new Date(value);
}

const beforeDeadline = getScheduledUpdateWindow(localDate('2026-08-12T01:14:00+09:00'), settings);
assert.equal(beforeDeadline.isOpen, true);
assert.equal(beforeDeadline.installDeadline.toISOString(), '2026-08-11T16:15:00.000Z');

const atDeadline = getScheduledUpdateWindow(localDate('2026-08-12T01:15:00+09:00'), settings);
assert.equal(atDeadline.isOpen, false);
assert.equal(atDeadline.installDeadline.toISOString(), '2026-08-11T16:15:00.000Z');

const afterDeadline = getScheduledUpdateWindow(localDate('2026-08-12T04:31:00+09:00'), settings);
assert.equal(afterDeadline.isOpen, false);
assert.equal(afterDeadline.installDeadline.toISOString(), '2026-08-11T16:15:00.000Z');

const catchUp = getScheduledUpdateWindow(localDate('2026-08-12T00:40:00+09:00'), settings);
assert.equal(catchUp.isOpen, true);
assert.equal(catchUp.scheduledFor.toISOString(), '2026-08-11T15:30:00.000Z');

const unsafeAtCutoff = getScheduledUpdateWindow(localDate('2026-08-12T01:18:30+09:00'), {
  ...settings,
  updateTime: '01:18'
});
assert.equal(unsafeAtCutoff.hasSafeWindow, false);
assert.equal(unsafeAtCutoff.isOpen, false);

const crossMidnight = getScheduledUpdateWindow(localDate('2026-08-12T23:05:00+09:00'), {
  ...settings,
  updateTime: '23:00'
});
assert.equal(crossMidnight.hasSafeWindow, true);
assert.equal(crossMidnight.isOpen, true);
assert.equal(crossMidnight.installDeadline.toISOString(), '2026-08-12T16:15:00.000Z');

assert.equal(
  getAutomaticInstallDeadline(localDate('2026-08-12T01:16:00+09:00'), settings).toISOString(),
  '2026-08-11T16:15:00.000Z'
);
assert.equal(
  getNextScheduledUpdate(localDate('2026-08-12T00:40:00+09:00'), settings).toISOString(),
  '2026-08-12T15:30:00.000Z'
);

const retryDelays = [10, 15, 15].map((minutes) => minutes * 60 * 1000);
const midnightRetry = getScheduledRetryDecision(
  localDate('2026-08-12T23:05:00+09:00'),
  crossMidnight.installDeadline,
  0,
  retryDelays
);
assert.equal(midnightRetry.shouldRetry, true);
assert.equal(midnightRetry.retryAt.toISOString(), '2026-08-12T14:15:00.000Z');
assert.deepEqual(
  getScheduledRetryDecision(
    localDate('2026-08-12T01:10:00+09:00'),
    beforeDeadline.installDeadline,
    3,
    retryDelays
  ),
  { shouldRetry: false, reason: 'exhausted', delayMs: null, retryAt: null }
);
assert.equal(
  getScheduledRetryDecision(
    localDate('2026-08-12T01:10:00+09:00'),
    beforeDeadline.installDeadline,
    0,
    retryDelays
  ).reason,
  'deadline'
);

console.log('update schedule verification passed');
