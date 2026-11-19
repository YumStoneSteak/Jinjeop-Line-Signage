(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.dashboardNoticeUtils = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function getLocalDateKey(dateInput = new Date()) {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function normalizePublishDate(value) {
    const text = typeof value === 'string' ? value.trim() : '';
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return '';
    }

    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const day = Number.parseInt(match[3], 10);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year
      || date.getMonth() !== month - 1
      || date.getDate() !== day
    ) {
      return '';
    }
    return text;
  }

  function normalizeTime(value) {
    return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : '';
  }

  function normalizeNoticeSchedule(item = {}, fallbackDate = getLocalDateKey()) {
    const validFallback = normalizePublishDate(fallbackDate) || getLocalDateKey();
    const explicitStartDate = normalizePublishDate(item.publishStartDate);
    const addedDate = normalizePublishDate(item.addedDate) || explicitStartDate || validFallback;
    return {
      addedDate,
      publishStartDate: explicitStartDate || addedDate,
      publishEndDate: normalizePublishDate(item.publishEndDate),
      publishStartTime: normalizeTime(item.publishStartTime),
      publishEndTime: item.publishEndDate ? normalizeTime(item.publishEndTime) : ''
    };
  }

  function getBounds(schedule) {
    const start = new Date(schedule.publishStartDate + 'T' + (schedule.publishStartTime || '00:00'));
    let end = Infinity;
    if (schedule.publishEndDate) {
      const date = new Date(schedule.publishEndDate + 'T' + (schedule.publishEndTime || '00:00'));
      if (!schedule.publishEndTime) date.setDate(date.getDate() + 1);
      end = date.getTime();
    }
    return { start: start.getTime(), end };
  }

  function getNoticePublishState(item = {}, nowInput = new Date()) {
    const now = normalizePublishDate(nowInput) ? new Date(nowInput + 'T00:00') : new Date(nowInput);
    const schedule = normalizeNoticeSchedule(item, getLocalDateKey(now));
    const { start, end } = getBounds(schedule);
    let code = 'active';
    if (end <= start) code = 'invalid-period';
    else if (now < start) code = 'scheduled';
    else if (now >= end) code = 'ended';
    return { playable: code === 'active', code, ...schedule };
  }

  function getNoticeRefreshDelay(list, now = new Date()) {
    let delay = getDelayUntilNextLocalDay(now);
    for (const item of list) {
      const { start, end } = getBounds(normalizeNoticeSchedule(item, getLocalDateKey(now)));
      for (const boundary of [start, end]) {
        if (boundary > now) delay = Math.min(delay, boundary - now);
      }
    }
    return delay;
  }

  function getDelayUntilNextLocalDay(dateInput = new Date()) {
    const now = dateInput instanceof Date ? new Date(dateInput.getTime()) : new Date(dateInput);
    if (Number.isNaN(now.getTime())) {
      return 1000;
    }
    const nextDay = new Date(now.getTime());
    nextDay.setHours(24, 0, 1, 0);
    return Math.max(1000, nextDay.getTime() - now.getTime());
  }

  return {
    getNoticeRefreshDelay,
    getDelayUntilNextLocalDay,
    getLocalDateKey,
    getNoticePublishState,
    normalizeNoticeSchedule,
    normalizePublishDate
  };
});
