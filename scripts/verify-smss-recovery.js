const assert = require('node:assert/strict');
const {
  canRecoverSmssNow,
  getSmssRecoveryDelay,
  shouldRecoverSmssLoadFailure
} = require('../smss-recovery-utils');

assert.equal(shouldRecoverSmssLoadFailure({ errorCode: -3, isMainFrame: true }), false);
assert.equal(shouldRecoverSmssLoadFailure({ errorCode: -105, isMainFrame: false }), false);
assert.equal(shouldRecoverSmssLoadFailure({ errorCode: -105, isMainFrame: true }), true);
assert.deepEqual([0, 1, 2, 3, 8].map((index) => getSmssRecoveryDelay(index)), [5000, 15000, 60000, 300000, 300000]);
assert.equal(canRecoverSmssNow({ destroyed: true, maintenance: false }), false);
assert.equal(canRecoverSmssNow({ destroyed: false, maintenance: true }), false);
assert.equal(canRecoverSmssNow({ destroyed: false, maintenance: false, suppressedUntil: 2000, now: 1000 }), false);
assert.equal(canRecoverSmssNow({ destroyed: false, maintenance: false, suppressedUntil: 1000, now: 1000 }), true);

console.log('SMSS recovery verification passed');
