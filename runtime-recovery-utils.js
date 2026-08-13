function getRendererRecoveryAction(priorAttemptCount) {
  const count = Math.max(0, Number(priorAttemptCount) || 0);
  if (count >= 2) {
    return 'relaunch';
  }
  if (count === 1) {
    return 'crash-reload';
  }
  return 'reload';
}

function shouldClearWatchdogPause({ protectedUntilExit = false } = {}) {
  return protectedUntilExit !== true;
}

module.exports = {
  getRendererRecoveryAction,
  shouldClearWatchdogPause
};
