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

  function normalizeNoticeSchedule(item = {}, fallbackDate = getLocalDateKey()) {
    const validFallback = normalizePublishDate(fallbackDate) || getLocalDateKey();
    const explicitStartDate = normalizePublishDate(item.publishStartDate);
    const addedDate = normalizePublishDate(item.addedDate) || explicitStartDate || validFallback;
    return {
      addedDate,
      publishStartTime: normalizeTime(item.publishStartTime),
      publishEndTime: normalizeTime(item.publishEndTime),
      publishStartDate: explicitStartDate || addedDate,
      publishEndDate: normalizePublishDate(item.publishEndDate)
    };
  }

  function normalizeFullscreenOptions(item) {
    const seconds = Number(item.repeatSeconds);
    return {
      fullscreenNotice: item.fullscreenNotice === true,
      repeatSeconds: Number.isFinite(seconds) && seconds >= 1 ? Math.min(86400, Math.floor(seconds)) : 60,
      playToEnd: item.playToEnd === true
    };
  }

  function normalizeTime(value) {
    return typeof value === 'string' && /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(value) ? value : '';
  }

  function getNoticePublishState(item = {}, now = new Date()) {
    const today = normalizePublishDate(now) || getLocalDateKey(now);
    const time = now instanceof Date ? pad2(now.getHours()) + ':' + pad2(now.getMinutes()) : '00:00';
    const current = today + 'T' + time;
    const schedule = normalizeNoticeSchedule(item, today);
    const start = schedule.publishStartDate + 'T' + (schedule.publishStartTime || '00:00');
    const end = schedule.publishEndDate + 'T' + (schedule.publishEndTime || '23:59');
    if (schedule.publishEndDate && (schedule.publishEndTime ? start >= end : start > end)) {
      return { playable: false, code: 'invalid-period', ...schedule };
    }
    if (schedule.publishStartDate && current < start) {
      return { playable: false, code: 'scheduled', ...schedule };
    }
    if (schedule.publishEndDate && (schedule.publishEndTime ? current >= end : current > end)) {
      return { playable: false, code: 'ended', ...schedule };
    }
    return {
      playable: true,
      code: schedule.publishStartDate || schedule.publishEndDate ? 'active' : 'normal',
      ...schedule
    };
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
    normalizeFullscreenOptions,
    getDelayUntilNextLocalDay,
    getLocalDateKey,
    getNoticePublishState,
    normalizeNoticeSchedule,
    normalizePublishDate
  };
});
