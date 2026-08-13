const assert = require('node:assert/strict');
const {
  getRendererRecoveryAction,
  shouldClearWatchdogPause
} = require('../runtime-recovery-utils');

assert.deepEqual(
  [0, 1, 2, 3].map(getRendererRecoveryAction),
  ['reload', 'crash-reload', 'relaunch', 'relaunch']
);
assert.equal(shouldClearWatchdogPause({ protectedUntilExit: false }), true);
assert.equal(shouldClearWatchdogPause({ protectedUntilExit: true }), false);

console.log('runtime recovery verification passed');
