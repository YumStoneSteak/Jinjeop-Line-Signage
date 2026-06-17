const assert = require('node:assert/strict');
const {
  normalizeMaintenanceSettings,
  isWithinUnavailableWindow,
  isTimeWithinUnavailableWindow,
  getDelayUntilNextDailyTime,
  getDelayUntilUnavailableWindowEnds,
  getUnavailableWindowLabel
} = require('../maintenance-utils');

const defaults = normalizeMaintenanceSettings({});
assert.deepEqual(defaults, {
  autoUpdateEnabled: true,
  updateTime: '01:00',
  unavailableStartTime: '02:00',
  unavailableEndTime: '04:30'
});

assert.equal(getUnavailableWindowLabel(defaults), '02:00~04:30');
assert.equal(isWithinUnavailableWindow(new Date('2026-06-17T01:00:00+09:00'), defaults), false);
assert.equal(isWithinUnavailableWindow(new Date('2026-06-17T01:59:59+09:00'), defaults), false);
assert.equal(isWithinUnavailableWindow(new Date('2026-06-17T02:00:00+09:00'), defaults), true);
assert.equal(isWithinUnavailableWindow(new Date('2026-06-17T03:15:00+09:00'), defaults), true);
assert.equal(isWithinUnavailableWindow(new Date('2026-06-17T04:29:00+09:00'), defaults), true);
assert.equal(isWithinUnavailableWindow(new Date('2026-06-17T04:30:00+09:00'), defaults), false);

assert.equal(isTimeWithinUnavailableWindow('01:00', defaults), false);
assert.equal(isTimeWithinUnavailableWindow('02:00', defaults), true);
assert.equal(isTimeWithinUnavailableWindow('03:00', defaults), true);
assert.equal(isTimeWithinUnavailableWindow('04:30', defaults), false);

assert.equal(normalizeMaintenanceSettings({
  autoUpdateEnabled: false,
  updateTime: '1:05',
  unavailableStartTime: '26:00',
  unavailableEndTime: '4:07'
}).updateTime, '01:05');
assert.equal(normalizeMaintenanceSettings({
  unavailableStartTime: '26:00'
}).unavailableStartTime, '02:00');

assert.equal(
  getDelayUntilNextDailyTime('01:00', new Date('2026-06-17T00:30:00+09:00')),
  30 * 60 * 1000
);
assert.equal(
  getDelayUntilUnavailableWindowEnds(new Date('2026-06-17T03:30:00+09:00'), defaults),
  60 * 60 * 1000
);

console.log('maintenance verification passed');
