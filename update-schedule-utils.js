function parseTime(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid local time: ${value}`);
  }
  return {
    hour: Number.parseInt(match[1], 10),
    minute: Number.parseInt(match[2], 10)
  };
}

function atLocalTime(dateInput, timeValue, minuteOffset = 0) {
  const date = new Date(dateInput);
  const { hour, minute } = parseTime(timeValue);
  date.setHours(hour, minute + minuteOffset, 0, 0);
  return date;
}

function getScheduledUpdateWindow(nowInput, settings, installLeadMinutes = 15) {
  const now = new Date(nowInput);
  const scheduledFor = atLocalTime(now, settings.updateTime);
  if (scheduledFor > now) {
    scheduledFor.setDate(scheduledFor.getDate() - 1);
  }

  const nextUnavailableStart = atLocalTime(scheduledFor, settings.unavailableStartTime);
  if (nextUnavailableStart <= scheduledFor) {
    nextUnavailableStart.setDate(nextUnavailableStart.getDate() + 1);
  }
  const installDeadline = new Date(
    nextUnavailableStart.getTime() - (Math.max(0, Number(installLeadMinutes) || 0) * 60 * 1000)
  );
  const hasSafeWindow = installDeadline > scheduledFor;

  const nextScheduledFor = atLocalTime(now, settings.updateTime);
  if (nextScheduledFor <= now) {
    nextScheduledFor.setDate(nextScheduledFor.getDate() + 1);
  }

  return {
    scheduledFor,
    installDeadline,
    nextScheduledFor,
    hasSafeWindow,
    isOpen: hasSafeWindow && now >= scheduledFor && now < installDeadline
  };
}

function getAutomaticInstallDeadline(nowInput, settings, installLeadMinutes = 15) {
  return getScheduledUpdateWindow(nowInput, settings, installLeadMinutes).installDeadline;
}

function getNextScheduledUpdate(nowInput, settings) {
  const now = new Date(nowInput);
  const nextScheduledFor = atLocalTime(now, settings.updateTime);
  if (nextScheduledFor <= now) {
    nextScheduledFor.setDate(nextScheduledFor.getDate() + 1);
  }
  return nextScheduledFor;
}

function getScheduledRetryDecision(nowInput, deadlineInput, retryIndex, retryDelaysMs) {
  const delayMs = Number(retryDelaysMs?.[retryIndex]) || 0;
  if (!delayMs) {
    return { shouldRetry: false, reason: 'exhausted', delayMs: null, retryAt: null };
  }
  const retryAt = new Date(new Date(nowInput).getTime() + delayMs);
  if (retryAt.getTime() >= new Date(deadlineInput).getTime()) {
    return { shouldRetry: false, reason: 'deadline', delayMs, retryAt };
  }
  return { shouldRetry: true, reason: 'scheduled', delayMs, retryAt };
}

module.exports = {
  getAutomaticInstallDeadline,
  getNextScheduledUpdate,
  getScheduledRetryDecision,
  getScheduledUpdateWindow
};
