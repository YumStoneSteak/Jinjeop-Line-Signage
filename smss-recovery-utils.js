const SMSS_LOAD_RETRY_DELAYS_MS = [5000, 15000, 60000, 5 * 60 * 1000];

function shouldRecoverSmssLoadFailure({ errorCode, isMainFrame }) {
  return isMainFrame === true && Number(errorCode) !== -3;
}

function getSmssRecoveryDelay(failureCount, delays = SMSS_LOAD_RETRY_DELAYS_MS) {
  const index = Math.min(Math.max(0, Number(failureCount) || 0), delays.length - 1);
  return Number(delays[index]) || delays[delays.length - 1];
}

function canRecoverSmssNow({ destroyed, maintenance, suppressedUntil = 0, now = Date.now() }) {
  return !destroyed && !maintenance && now >= suppressedUntil;
}

module.exports = {
  SMSS_LOAD_RETRY_DELAYS_MS,
  canRecoverSmssNow,
  getSmssRecoveryDelay,
  shouldRecoverSmssLoadFailure
};
