(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.dashboardMaintenanceUtils = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DEFAULT_MAINTENANCE_SETTINGS = {
    autoUpdateEnabled: true,
    updateTime: '01:00',
    unavailableStartTime: '02:00',
    unavailableEndTime: '04:30'
  };

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function parseTimeToMinutes(value) {
    const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      return null;
    }
    const hour = Number.parseInt(match[1], 10);
    const minute = Number.parseInt(match[2], 10);
    if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }
    return (hour * 60) + minute;
  }

  function minutesToTime(value) {
    const minutes = Number.parseInt(value, 10);
    const normalized = ((Number.isFinite(minutes) ? minutes : 0) % 1440 + 1440) % 1440;
    return `${pad2(Math.floor(normalized / 60))}:${pad2(normalized % 60)}`;
  }

  function normalizeTime(value, fallback) {
    const parsed = parseTimeToMinutes(value);
    if (parsed === null) {
      return fallback;
    }
    return minutesToTime(parsed);
  }

  function normalizeMaintenanceSettings(input) {
    const source = input && typeof input === 'object' ? input : {};
    return {
      autoUpdateEnabled: Object.prototype.hasOwnProperty.call(source, 'autoUpdateEnabled')
        ? !!source.autoUpdateEnabled
        : DEFAULT_MAINTENANCE_SETTINGS.autoUpdateEnabled,
      updateTime: normalizeTime(source.updateTime, DEFAULT_MAINTENANCE_SETTINGS.updateTime),
      unavailableStartTime: normalizeTime(source.unavailableStartTime, DEFAULT_MAINTENANCE_SETTINGS.unavailableStartTime),
      unavailableEndTime: normalizeTime(source.unavailableEndTime, DEFAULT_MAINTENANCE_SETTINGS.unavailableEndTime)
    };
  }

  function isMinuteWithinWindow(minute, startMinute, endMinute) {
    if (startMinute === endMinute) {
      return false;
    }
    if (startMinute < endMinute) {
      return minute >= startMinute && minute < endMinute;
    }
    return minute >= startMinute || minute < endMinute;
  }

  function getLocalMinuteOfDay(dateInput = new Date()) {
    const date = new Date(dateInput);
    return (date.getHours() * 60) + date.getMinutes();
  }

  function isWithinUnavailableWindow(dateInput = new Date(), settingsInput = {}) {
    const settings = normalizeMaintenanceSettings(settingsInput);
    const minute = getLocalMinuteOfDay(dateInput);
    return isMinuteWithinWindow(
      minute,
      parseTimeToMinutes(settings.unavailableStartTime),
      parseTimeToMinutes(settings.unavailableEndTime)
    );
  }

  function isTimeWithinUnavailableWindow(timeValue, settingsInput = {}) {
    const settings = normalizeMaintenanceSettings(settingsInput);
    const minute = parseTimeToMinutes(timeValue);
    if (minute === null) {
      return false;
    }
    return isMinuteWithinWindow(
      minute,
      parseTimeToMinutes(settings.unavailableStartTime),
      parseTimeToMinutes(settings.unavailableEndTime)
    );
  }

  function getDelayUntilNextDailyTime(timeValue, nowInput = new Date()) {
    const targetMinute = parseTimeToMinutes(normalizeTime(timeValue, DEFAULT_MAINTENANCE_SETTINGS.updateTime));
    const now = new Date(nowInput);
    const target = new Date(now);
    target.setHours(Math.floor(targetMinute / 60), targetMinute % 60, 0, 0);
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }
    return Math.max(1000, target.getTime() - now.getTime());
  }

  function getDelayUntilUnavailableWindowEnds(nowInput = new Date(), settingsInput = {}) {
    const settings = normalizeMaintenanceSettings(settingsInput);
    const now = new Date(nowInput);
    if (!isWithinUnavailableWindow(now, settings)) {
      return 0;
    }
    const endMinute = parseTimeToMinutes(settings.unavailableEndTime);
    const end = new Date(now);
    end.setHours(Math.floor(endMinute / 60), endMinute % 60, 0, 0);
    if (end <= now) {
      end.setDate(end.getDate() + 1);
    }
    return Math.max(1000, end.getTime() - now.getTime());
  }

  function getUnavailableWindowLabel(settingsInput = {}) {
    const settings = normalizeMaintenanceSettings(settingsInput);
    return `${settings.unavailableStartTime}~${settings.unavailableEndTime}`;
  }

  return {
    DEFAULT_MAINTENANCE_SETTINGS: { ...DEFAULT_MAINTENANCE_SETTINGS },
    parseTimeToMinutes,
    minutesToTime,
    normalizeTime,
    normalizeMaintenanceSettings,
    isWithinUnavailableWindow,
    isTimeWithinUnavailableWindow,
    getDelayUntilNextDailyTime,
    getDelayUntilUnavailableWindowEnds,
    getUnavailableWindowLabel
  };
});
