const { app, BrowserWindow, dialog, ipcMain, screen } = require('electron');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

let mainWindow;
let popupWindows = [];
let unsavedChanges = false;
let draftConfig = null;
let persistedConfig = null;
let bypassClosePrompt = false;
let presentationMode = true;
let lastPopupRequest = { url: '', mode: '', at: 0 };

const ADVICE_API_URL = 'https://korean-advice-open-api.vercel.app/api/advice';
const fallbackAdvice = {
  message: '오늘도 좋은 하루 보내세요.',
  author: '',
  authorProfile: ''
};

const defaultSidebarWidgets = [
  { id: 'logo', label: '로고', visible: true },
  { id: 'station', label: '현재 역명', visible: true },
  { id: 'datetime', label: '날짜/시간', visible: true },
  { id: 'weather', label: '날씨', visible: true },
  { id: 'solarTerm', label: '24절기', visible: true },
  { id: 'dailyAdvice', label: '오늘의 한마디', visible: true },
  { id: 'trainSchedule', label: '열차 시간표', visible: false }
];
const SIDEBAR_WIDGET_DEFAULTS_VERSION = 4;
const legacyDefaultSidebarWidgetOrders = [
  ['logo', 'station', 'datetime', 'solarTerm', 'dailyAdvice', 'weather', 'trainSchedule']
];

const defaultConfig = {
  layout: {
    splitRatio: '7:3',
    borderEnabled: false,
    panelSwapped: false
  },
  browser: {
    url: 'https://example.com',
    popupMode: 'block',
    zoomPercent: 125
  },
  player: {
    transition: 'slide',
    videoFirstMode: true,
    playlist: []
  },
  window: {
    alwaysOnTop: true,
    preventMinimize: true
  },
  sidebar: {
    width: 320,
    logoPath: 'files/ncuc_logo.png',
    widgetDefaultsVersion: SIDEBAR_WIDGET_DEFAULTS_VERSION,
    widgets: defaultSidebarWidgets.map((widget) => ({ ...widget })),
    timetable: {
      stationName: '별내별가람역',
      stationId: '0408',
      stationCode: '408',
      direction: '하행',
      displayFormat: 'table'
    }
  }
};

const timetableStations = {
  '408': { stationName: '별내별가람역', stationId: '0408', stationCode: '408' },
  '406': { stationName: '오남역', stationId: '0406', stationCode: '406' },
  '405': { stationName: '진접역', stationId: '0405', stationCode: '405' }
};

function normalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return 'about:blank';
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return 'about:blank';
  }

  if (trimmed === 'about:blank') {
    return trimmed;
  }

  try {
    return new URL(trimmed).toString();
  } catch (_) {
    if (!/^https?:\/\//i.test(trimmed)) {
      try {
        return new URL(`https://${trimmed}`).toString();
      } catch (__ ) {
        return 'about:blank';
      }
    }
    return 'about:blank';
  }
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function getAppIconPath() {
  const filesIconPath = path.join(__dirname, 'files', 'icons', 'ncuc.ico');
  if (fs.existsSync(filesIconPath)) {
    return filesIconPath;
  }

  const legacyIconPath = path.join(__dirname, 'ncuc.ico');
  return fs.existsSync(legacyIconPath) ? legacyIconPath : undefined;
}

function getTimetableCachePath() {
  return path.join(app.getPath('userData'), 'timetable-cache.json');
}

function getDailyAdviceCachePath() {
  return path.join(app.getPath('userData'), 'daily-advice-cache.json');
}

function normalizeLogoPath(input) {
  if (typeof input !== 'string') {
    return defaultConfig.sidebar.logoPath;
  }

  const trimmed = input.trim();
  return trimmed || defaultConfig.sidebar.logoPath;
}

function normalizeSolarTermYear(yearInput) {
  const year = Number.parseInt(yearInput, 10);
  const fallback = new Date().getFullYear();
  if (!Number.isFinite(year) || year < 1900 || year > 2200) {
    return fallback;
  }
  return year;
}

function getAdviceDayKey(dateInput = new Date()) {
  const date = new Date(dateInput);
  if (date.getHours() < 4) {
    date.setDate(date.getDate() - 1);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDailyAdvice(input) {
  if (!input || typeof input !== 'object') {
    return { ...fallbackAdvice };
  }

  const message = typeof input.message === 'string' ? input.message.trim() : '';
  if (!message) {
    return { ...fallbackAdvice };
  }

  return {
    message,
    author: typeof input.author === 'string' ? input.author.trim() : '',
    authorProfile: typeof input.authorProfile === 'string' ? input.authorProfile.trim() : ''
  };
}

function createEmptyDailyAdviceCache() {
  return {
    version: 1,
    dayKey: null,
    updatedAt: null,
    advice: null,
    error: null
  };
}

function normalizeDailyAdviceCache(cache) {
  if (!cache || typeof cache !== 'object') {
    return createEmptyDailyAdviceCache();
  }

  return {
    version: 1,
    dayKey: typeof cache.dayKey === 'string' ? cache.dayKey : null,
    updatedAt: cache.updatedAt || null,
    advice: cache.advice ? normalizeDailyAdvice(cache.advice) : null,
    error: cache.error || null
  };
}

function readDailyAdviceCache() {
  const cachePath = getDailyAdviceCachePath();
  try {
    if (!fs.existsSync(cachePath)) {
      return createEmptyDailyAdviceCache();
    }
    return normalizeDailyAdviceCache(JSON.parse(fs.readFileSync(cachePath, 'utf-8')));
  } catch (err) {
    return {
      ...createEmptyDailyAdviceCache(),
      error: err.message || '오늘의 한마디 캐시를 읽을 수 없습니다.'
    };
  }
}

function writeDailyAdviceCache(cache) {
  const normalized = normalizeDailyAdviceCache(cache);
  fs.writeFileSync(getDailyAdviceCachePath(), JSON.stringify(normalized, null, 2), 'utf-8');
  return normalized;
}

function getSolarTermCachePath(yearInput) {
  const year = normalizeSolarTermYear(yearInput);
  return path.join(app.getPath('userData'), `solar_terms_${year}.json`);
}

function normalizeTimetableStation(input) {
  const code = String(input?.stationCode || input?.stationId || defaultConfig.sidebar.timetable.stationCode).replace(/^0+/, '');
  return timetableStations[code] || timetableStations[defaultConfig.sidebar.timetable.stationCode];
}

function normalizeTimetableSettings(input) {
  const station = normalizeTimetableStation(input);
  const direction = input?.direction === '상행' ? '상행' : '하행';
  return {
    stationName: station.stationName,
    stationId: station.stationId,
    stationCode: station.stationCode,
    direction,
    displayFormat: input?.displayFormat === 'time' ? 'time' : 'table'
  };
}

function sameWidgetOrder(left, right) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function normalizeSidebarWidgets(input, widgetDefaultsVersion = SIDEBAR_WIDGET_DEFAULTS_VERSION) {
  const defaultsById = new Map(defaultSidebarWidgets.map((widget) => [widget.id, widget]));
  const defaultIndexById = new Map(defaultSidebarWidgets.map((widget, index) => [widget.id, index]));
  const result = [];
  const seen = new Set();
  const source = Array.isArray(input) ? input : [];
  const shouldApplyNewDefaults = Number(widgetDefaultsVersion) !== SIDEBAR_WIDGET_DEFAULTS_VERSION;
  const sourceOrder = source
    .map((item) => item?.id)
    .filter((id) => defaultsById.has(id));
  const shouldMigrateDefaultOrder = shouldApplyNewDefaults
    && legacyDefaultSidebarWidgetOrders.some((order) => sameWidgetOrder(sourceOrder, order));

  const insertByDefaultOrder = (widget) => {
    const targetIndex = defaultIndexById.get(widget.id) ?? defaultSidebarWidgets.length;
    const insertAt = result.findIndex((existing) => (defaultIndexById.get(existing.id) ?? defaultSidebarWidgets.length) > targetIndex);
    if (insertAt === -1) {
      result.push(widget);
    } else {
      result.splice(insertAt, 0, widget);
    }
  };

  source.forEach((item) => {
    const defaults = defaultsById.get(item?.id);
    if (!defaults || seen.has(defaults.id)) {
      return;
    }
    seen.add(defaults.id);
    result.push({
      ...defaults,
      visible: shouldApplyNewDefaults && defaults.id === 'trainSchedule' ? false : item.visible !== false
    });
  });

  defaultSidebarWidgets.forEach((defaults) => {
    if (!seen.has(defaults.id)) {
      insertByDefaultOrder({ ...defaults });
    }
  });

  if (shouldMigrateDefaultOrder) {
    result.sort((a, b) => (defaultIndexById.get(a.id) ?? defaultSidebarWidgets.length) - (defaultIndexById.get(b.id) ?? defaultSidebarWidgets.length));
  }

  const trainIndex = result.findIndex((widget) => widget.id === 'trainSchedule');
  if (trainIndex >= 0 && result[trainIndex].visible === false) {
    const [trainWidget] = result.splice(trainIndex, 1);
    result.push(trainWidget);
  }

  return result;
}

function createEmptyTimetableCache() {
  return {
    version: 1,
    updatedAt: null,
    stations: {},
    errors: []
  };
}

function normalizeTimetableCache(cache) {
  if (!cache || typeof cache !== 'object') {
    return createEmptyTimetableCache();
  }

  return {
    version: 1,
    updatedAt: cache.updatedAt || null,
    stations: cache.stations && typeof cache.stations === 'object' ? cache.stations : {},
    errors: Array.isArray(cache.errors) ? cache.errors.slice(-5) : []
  };
}

function readTimetableCache() {
  const cachePath = getTimetableCachePath();
  try {
    if (!fs.existsSync(cachePath)) {
      return createEmptyTimetableCache();
    }
    return normalizeTimetableCache(JSON.parse(fs.readFileSync(cachePath, 'utf-8')));
  } catch (err) {
    const cache = createEmptyTimetableCache();
    return appendTimetableLog(cache, '시간표 JSON 파싱 실패', err.message);
  }
}

function normalizeZoomPercent(value) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) {
    return defaultConfig.browser.zoomPercent;
  }
  return Math.min(300, Math.max(25, numeric));
}

function getPopupMode() {
  const mode = draftConfig?.browser?.popupMode || persistedConfig?.browser?.popupMode || defaultConfig.browser.popupMode;
  return ['block', 'allow', 'current'].includes(mode) ? mode : 'block';
}

function createPopupWindow(normalizedUrl) {
  const popup = new BrowserWindow({
    width: 1000,
    height: 700,
    autoHideMenuBar: true,
    icon: getAppIconPath()
  });

  popup.loadURL(normalizedUrl);
  popup.on('closed', () => {
    popupWindows = popupWindows.filter((w) => w !== popup);
  });
  popupWindows.push(popup);
  return true;
}

function handlePopupRequest(rawUrl) {
  const normalizedUrl = normalizeUrl(rawUrl);
  if (normalizedUrl === 'about:blank') {
    return false;
  }

  const mode = getPopupMode();
  if (mode === 'block') {
    return false;
  }

  const now = Date.now();
  if (
    lastPopupRequest.url === normalizedUrl &&
    lastPopupRequest.mode === mode &&
    now - lastPopupRequest.at < 800
  ) {
    return true;
  }
  lastPopupRequest = { url: normalizedUrl, mode, at: now };

  if (mode === 'current') {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('browser:openPopupInCurrent', normalizedUrl);
      return true;
    }
    return false;
  }

  return createPopupWindow(normalizedUrl);
}

function attachPopupGuards(contents) {
  if (!contents || contents.isDestroyed?.()) {
    return;
  }

  if (typeof contents.setWindowOpenHandler === 'function') {
    contents.setWindowOpenHandler(({ url }) => {
      handlePopupRequest(url);
      return { action: 'deny' };
    });
  }

  contents.on('javascript-dialog-opening', (event, _details, callback) => {
    if (getPopupMode() === 'block') {
      event.preventDefault();
      if (typeof callback === 'function') {
        callback(false);
      }
    }
  });
}

function attachBrowserZoomControls(contents) {
  if (!contents || contents.isDestroyed?.()) {
    return;
  }

  contents.on('zoom-changed', (event, zoomDirection) => {
    event.preventDefault();

    const currentPercent = normalizeZoomPercent(Math.round(contents.getZoomFactor() * 100));
    let nextPercent = currentPercent;
    if (zoomDirection === 'in') {
      nextPercent += 5;
    } else if (zoomDirection === 'out') {
      nextPercent -= 5;
    } else if (zoomDirection === 'reset') {
      nextPercent = defaultConfig.browser.zoomPercent;
    }
    nextPercent = normalizeZoomPercent(nextPercent);

    contents.setZoomFactor(nextPercent / 100);
    if (draftConfig) {
      draftConfig.browser = {
        ...defaultConfig.browser,
        ...(draftConfig.browser || {}),
        zoomPercent: nextPercent
      };
    }
    unsavedChanges = !!persistedConfig && normalizeZoomPercent(persistedConfig.browser?.zoomPercent) !== nextPercent;

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('browser:zoomChanged', nextPercent);
    }
  });
}

function writeTimetableCache(cache) {
  const normalized = normalizeTimetableCache(cache);
  fs.writeFileSync(getTimetableCachePath(), JSON.stringify(normalized, null, 2), 'utf-8');
  return normalized;
}

function appendTimetableLog(cache, type, message) {
  const normalized = normalizeTimetableCache(cache);
  normalized.errors = [
    ...(normalized.errors || []),
    {
      at: new Date().toISOString(),
      type,
      message: String(message || '').slice(0, 300)
    }
  ].slice(-5);
  return normalized;
}

function normalizeSolarTermItem(item) {
  if (!item || typeof item !== 'object' || Number(item.kind) !== 3 || !item.date || !item.name) {
    return null;
  }

  return {
    date: String(item.date),
    name: String(item.name),
    kind: 3,
    time: item.time ? String(item.time) : null
  };
}

function createEmptySolarTermYearCache(yearInput) {
  const year = normalizeSolarTermYear(yearInput);
  return {
    version: 1,
    year,
    updatedAt: null,
    sourceUrl: `https://holidays.dist.be/${year}.json`,
    terms: [],
    error: null
  };
}

function normalizeSolarTermYearCache(cache, yearInput) {
  const year = normalizeSolarTermYear(yearInput || cache?.year);
  const terms = Array.isArray(cache?.terms)
    ? cache.terms.map(normalizeSolarTermItem).filter(Boolean)
    : [];

  return {
    version: 1,
    year,
    updatedAt: cache?.updatedAt || null,
    sourceUrl: cache?.sourceUrl || `https://holidays.dist.be/${year}.json`,
    terms: terms.sort((a, b) => a.date.localeCompare(b.date)),
    error: cache?.error || null
  };
}

function readSolarTermYearCache(yearInput) {
  const year = normalizeSolarTermYear(yearInput);
  const cachePath = getSolarTermCachePath(year);
  try {
    if (!fs.existsSync(cachePath)) {
      return null;
    }
    return normalizeSolarTermYearCache(JSON.parse(fs.readFileSync(cachePath, 'utf-8')), year);
  } catch (err) {
    return {
      ...createEmptySolarTermYearCache(year),
      error: err.message || '24절기 캐시를 읽을 수 없습니다.'
    };
  }
}

function writeSolarTermYearCache(cache, yearInput) {
  const normalized = normalizeSolarTermYearCache(cache, yearInput);
  fs.writeFileSync(getSolarTermCachePath(normalized.year), JSON.stringify(normalized, null, 2), 'utf-8');
  return normalized;
}

function parseSolarTermJson(text, yearInput) {
  const year = normalizeSolarTermYear(yearInput);
  const items = JSON.parse(text);
  if (!Array.isArray(items)) {
    throw new Error('24절기 JSON 배열을 찾을 수 없습니다.');
  }

  const terms = items.map(normalizeSolarTermItem).filter(Boolean);
  if (!terms.length) {
    throw new Error('24절기 항목을 찾을 수 없습니다.');
  }

  return {
    ...createEmptySolarTermYearCache(year),
    updatedAt: new Date().toISOString(),
    terms
  };
}

function mergeConfig(userConfig) {
  const browserConfig = userConfig.browser || {};
  return {
    ...defaultConfig,
    ...userConfig,
    layout: { ...defaultConfig.layout, ...(userConfig.layout || {}), borderEnabled: false },
    browser: {
      url: normalizeUrl(browserConfig.url || defaultConfig.browser.url),
      popupMode: ['block', 'allow', 'current'].includes(browserConfig.popupMode) ? browserConfig.popupMode : defaultConfig.browser.popupMode,
      zoomPercent: normalizeZoomPercent(browserConfig.zoomPercent)
    },
    player: {
      ...defaultConfig.player,
      ...(userConfig.player || {}),
      playlist: Array.isArray(userConfig?.player?.playlist) ? userConfig.player.playlist : []
    },
    window: { ...defaultConfig.window, ...(userConfig.window || {}) },
    sidebar: {
      ...defaultConfig.sidebar,
      ...(userConfig.sidebar || {}),
      logoPath: normalizeLogoPath(userConfig.sidebar?.logoPath),
      widgetDefaultsVersion: SIDEBAR_WIDGET_DEFAULTS_VERSION,
      widgets: normalizeSidebarWidgets(userConfig.sidebar?.widgets, userConfig.sidebar?.widgetDefaultsVersion),
      timetable: normalizeTimetableSettings(userConfig.sidebar?.timetable || defaultConfig.sidebar.timetable)
    }
  };
}

function decodeHtmlEntities(text) {
  return String(text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

function stripTags(html) {
  return decodeHtmlEntities(String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim());
}

function parseTableRows(tableHtml) {
  const rows = [];
  const rowMatches = String(tableHtml || '').match(/<tr[\s\S]*?<\/tr>/gi) || [];
  rowMatches.forEach((rowHtml) => {
    const cells = [];
    const cellMatches = rowHtml.match(/<t[hd][\s\S]*?<\/t[hd]>/gi) || [];
    cellMatches.forEach((cellHtml) => {
      cells.push(stripTags(cellHtml));
    });
    if (cells.length) {
      rows.push(cells);
    }
  });
  return rows;
}

function detectDayKey(text, fallbackIndex = 0) {
  const normalized = String(text || '').replace(/\s+/g, '');
  if (/공휴일|휴일|일요일/.test(normalized)) return 'holiday';
  if (/토요일|토요/.test(normalized)) return 'saturday';
  if (/평일/.test(normalized)) return 'weekday';
  return ['weekday', 'saturday', 'holiday'][fallbackIndex % 3];
}

function detectDirectionKey(text) {
  const normalized = String(text || '').replace(/\s+/g, '');
  if (/상행/.test(normalized)) return 'up';
  if (/하행/.test(normalized)) return 'down';
  return null;
}

function parseHourCell(text) {
  const match = String(text || '').match(/\b([0-2]?\d)\b/);
  if (!match) {
    return null;
  }
  const hour = Number(match[1]);
  return Number.isInteger(hour) && hour >= 0 && hour <= 26 ? hour : null;
}

function parseMinuteCell(text) {
  const cleaned = String(text || '').replace(/\([^)]*\)/g, ' ');
  const matches = cleaned.match(/\b([0-5]?\d)\b/g) || [];
  return matches
    .map((value) => Number(value))
    .filter((minute) => Number.isInteger(minute) && minute >= 0 && minute <= 59);
}

function addScheduleMinutes(target, dayKey, directionKey, hour, minutes) {
  if (!dayKey || !directionKey || !Number.isInteger(hour) || !Array.isArray(minutes)) {
    return;
  }
  minutes.forEach((minute) => {
    target[dayKey][directionKey].push(hour * 60 + minute);
  });
}

function parseTimetableHtml(html, station) {
  if (!html || typeof html !== 'string') {
    throw new Error('HTML 응답이 비어 있음');
  }

  const schedules = {
    weekday: { up: [], down: [] },
    saturday: { up: [], down: [] },
    holiday: { up: [], down: [] }
  };

  const tableRegex = /<table[\s\S]*?<\/table>/gi;
  const tableMatches = [...html.matchAll(tableRegex)];
  if (!tableMatches.length) {
    throw new Error('열차시간표 영역 미검출');
  }

  let parsedTableCount = 0;
  tableMatches.forEach((match, index) => {
    const tableHtml = match[0];
    const tableText = stripTags(tableHtml);
    const contextText = stripTags(html.slice(Math.max(0, match.index - 1600), match.index));
    const combinedText = `${contextText} ${tableText}`;
    const rows = parseTableRows(tableHtml);
    if (!rows.length) {
      return;
    }

    const dayKey = detectDayKey(combinedText, index);
    const tableDirectionKey = detectDirectionKey(combinedText);
    const timetableHourMatch = tableHtml.match(/class=['"][^'"]*stationInfoAllTimeTable[^'"]*['"][\s\S]*?\btime=['"](\d{1,2})['"]/i);
    if (timetableHourMatch) {
      const fallbackHour = Number(timetableHourMatch[1]);
      rows.forEach((cells) => {
        const hour = parseHourCell(cells[1]) ?? fallbackHour;
        if (cells.length >= 3) {
          addScheduleMinutes(schedules, dayKey, 'up', hour, parseMinuteCell(cells[0]));
          addScheduleMinutes(schedules, dayKey, 'down', hour, parseMinuteCell(cells[2]));
        }
      });
      parsedTableCount += 1;
      return;
    }

    const headerText = rows.slice(0, 2).flat().join(' ');
    let upIndex = -1;
    let downIndex = -1;
    rows.slice(0, 2).forEach((row) => {
      row.forEach((cell, cellIndex) => {
        const direction = detectDirectionKey(cell);
        if (direction === 'up') upIndex = cellIndex;
        if (direction === 'down') downIndex = cellIndex;
      });
    });

    rows.forEach((cells) => {
      const hour = parseHourCell(cells[0]);
      if (!Number.isInteger(hour)) {
        return;
      }

      if (upIndex > 0 || downIndex > 0) {
        if (upIndex > 0) addScheduleMinutes(schedules, dayKey, 'up', hour, parseMinuteCell(cells[upIndex]));
        if (downIndex > 0) addScheduleMinutes(schedules, dayKey, 'down', hour, parseMinuteCell(cells[downIndex]));
        return;
      }

      if (cells.length >= 3 && /상행|하행/.test(headerText)) {
        addScheduleMinutes(schedules, dayKey, 'up', hour, parseMinuteCell(cells[1]));
        addScheduleMinutes(schedules, dayKey, 'down', hour, parseMinuteCell(cells[2]));
        return;
      }

      if (tableDirectionKey && cells.length >= 2) {
        addScheduleMinutes(schedules, dayKey, tableDirectionKey, hour, parseMinuteCell(cells.slice(1).join(' ')));
      }
    });

    if (Object.values(schedules[dayKey]).some((list) => list.length)) {
      parsedTableCount += 1;
    }
  });

  Object.keys(schedules).forEach((dayKey) => {
    ['up', 'down'].forEach((directionKey) => {
      schedules[dayKey][directionKey] = [...new Set(schedules[dayKey][directionKey])]
        .filter((minute) => Number.isInteger(minute) && minute >= 0 && minute <= 26 * 60 + 59)
        .sort((a, b) => a - b);
    });
  });

  const hasAnySchedule = Object.values(schedules).some((day) => day.up.length || day.down.length);
  if (!parsedTableCount || !hasAnySchedule) {
    throw new Error('시간대별 열차시간표 파싱 실패');
  }

  const missing = [];
  Object.entries({ weekday: '평일', saturday: '토요일', holiday: '공휴일' }).forEach(([dayKey, dayName]) => {
    if (!schedules[dayKey].up.length) missing.push(`${dayName} 상행`);
    if (!schedules[dayKey].down.length) missing.push(`${dayName} 하행`);
  });
  if (missing.length) {
    throw new Error(`${missing[0]} 시간표를 찾을 수 없음`);
  }

  return {
    ...station,
    sourceUrl: `http://www.seoulmetro.co.kr/kr/getStationInfo.do?action=time&stationId=${station.stationId}`,
    updatedAt: new Date().toISOString(),
    schedules
  };
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const request = client.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DashboardTimetable/1.0',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9'
      }
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        resolve(fetchText(new URL(response.headers.location, url).toString()));
        return;
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const contentType = response.headers['content-type'] || '';
        const charsetMatch = String(contentType).match(/charset=([^;\s]+)/i);
        const charset = charsetMatch ? charsetMatch[1].toLowerCase() : 'utf-8';
        try {
          const decoder = new TextDecoder(charset.includes('euc') || charset.includes('ks_c') ? 'euc-kr' : 'utf-8');
          resolve(decoder.decode(buffer));
        } catch (_) {
          resolve(buffer.toString('utf8'));
        }
      });
    });

    request.on('timeout', () => {
      request.destroy(new Error('요청 시간 초과'));
    });
    request.on('error', reject);
  });
}

async function refreshTimetableCache(stationInput) {
  const station = normalizeTimetableStation(stationInput);
  const url = `http://www.seoulmetro.co.kr/kr/getStationInfo.do?action=time&stationId=${station.stationId}`;
  let cache = readTimetableCache();

  try {
    const html = await fetchText(url);
    const stationCache = parseTimetableHtml(html, station);
    cache.stations[station.stationCode] = stationCache;
    cache.updatedAt = stationCache.updatedAt;
    cache = appendTimetableLog(cache, '복구 완료', '시간표 캐시 정상 로드');
    return { ok: true, cache: writeTimetableCache(cache), station: stationCache };
  } catch (err) {
    cache = appendTimetableLog(cache, '시간표 갱신 실패', err.message || '기존 시간표 사용 중');
    writeTimetableCache(cache);
    return { ok: false, cache, error: err.message || '시간표 갱신 요청 실패' };
  }
}

async function refreshSolarTermYearCache(yearInput) {
  const year = normalizeSolarTermYear(yearInput);
  const url = `https://holidays.dist.be/${year}.json`;
  const existingCache = readSolarTermYearCache(year);

  try {
    const text = await fetchText(url);
    const cache = parseSolarTermJson(text, year);
    return { ok: true, cache: writeSolarTermYearCache(cache, year) };
  } catch (err) {
    return {
      ok: false,
      cache: existingCache,
      error: err.message || '24절기 갱신 실패'
    };
  }
}

async function getDailyAdvice(forceRefresh = false) {
  const dayKey = getAdviceDayKey();
  const existingCache = readDailyAdviceCache();
  if (!forceRefresh && existingCache.dayKey === dayKey && existingCache.advice?.message) {
    return {
      ok: true,
      fromCache: true,
      cache: existingCache,
      advice: existingCache.advice
    };
  }

  try {
    const text = await fetchText(ADVICE_API_URL);
    const advice = normalizeDailyAdvice(JSON.parse(text));
    if (!advice.message) {
      throw new Error('오늘의 한마디 응답 형식 오류');
    }

    const cache = writeDailyAdviceCache({
      version: 1,
      dayKey,
      updatedAt: new Date().toISOString(),
      advice,
      error: null
    });

    return {
      ok: true,
      fromCache: false,
      cache,
      advice
    };
  } catch (err) {
    const sameDayAdvice = existingCache.dayKey === dayKey && existingCache.advice?.message
      ? existingCache.advice
      : null;
    return {
      ok: false,
      fromCache: !!sameDayAdvice,
      cache: existingCache,
      advice: sameDayAdvice || { ...fallbackAdvice },
      error: err.message || '오늘의 한마디를 불러올 수 없습니다.'
    };
  }
}

function loadConfig() {
  const configPath = getConfigPath();
  try {
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
      persistedConfig = deepClone(defaultConfig);
      draftConfig = deepClone(defaultConfig);
      return;
    }

    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    persistedConfig = mergeConfig(parsed);
    draftConfig = deepClone(persistedConfig);
  } catch (err) {
    console.error('Failed to load config. Falling back to defaults:', err);
    persistedConfig = deepClone(defaultConfig);
    draftConfig = deepClone(defaultConfig);
  }
}

function writeConfig(config) {
  const configPath = getConfigPath();
  const merged = mergeConfig(config || {});
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf-8');
  persistedConfig = deepClone(merged);
  draftConfig = deepClone(merged);
  unsavedChanges = false;
  return merged;
}

function applyWindowOptions() {
  if (!mainWindow || !persistedConfig) {
    return;
  }

  const { alwaysOnTop } = persistedConfig.window;
  mainWindow.setAlwaysOnTop(!!alwaysOnTop, 'screen-saver');
}

function applyPresentationWindowMode() {
  if (!mainWindow) {
    return;
  }

  if (presentationMode) {
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    mainWindow.setFullScreen(false);
    mainWindow.setBounds(display.bounds);
    mainWindow.setAlwaysOnTop(!!persistedConfig?.window?.alwaysOnTop, 'screen-saver');
    mainWindow.webContents.send('window:fullscreenChanged', true);
    return;
  }

  mainWindow.setFullScreen(false);
  mainWindow.setAlwaysOnTop(!!persistedConfig?.window?.alwaysOnTop, 'screen-saver');
  mainWindow.setSize(1600, 900);
  mainWindow.center();
  mainWindow.webContents.send('window:fullscreenChanged', false);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    frame: false,
    show: false,
    autoHideMenuBar: true,
    icon: getAppIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  applyWindowOptions();

  mainWindow.webContents.on('will-attach-webview', (_event, _webPreferences, params) => {
    if (getPopupMode() === 'block' && params) {
      delete params.allowpopups;
    }
  });

  mainWindow.webContents.on('did-attach-webview', (_event, webContents) => {
    attachPopupGuards(webContents);
    attachBrowserZoomControls(webContents);
  });

  mainWindow.once('ready-to-show', () => {
    applyPresentationWindowMode();
    mainWindow.show();
  });

  mainWindow.on('minimize', (event) => {
    if (persistedConfig?.window?.preventMinimize) {
      event.preventDefault();
    }
  });

  mainWindow.on('close', async (event) => {
    if (bypassClosePrompt || !unsavedChanges) {
      return;
    }

    event.preventDefault();

    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['저장 후 종료', '저장 안 함', '취소'],
      defaultId: 0,
      cancelId: 2,
      message: '설정이 변경되었습니다.',
      detail: '변경 사항을 저장하시겠습니까?'
    });

    if (result.response === 0) {
      try {
        writeConfig(draftConfig);
      } catch (err) {
        await dialog.showMessageBox(mainWindow, {
          type: 'error',
          message: '설정 저장에 실패했습니다.',
          detail: err.message
        });
        return;
      }
      bypassClosePrompt = true;
      mainWindow.close();
      return;
    }

    if (result.response === 1) {
      unsavedChanges = false;
      bypassClosePrompt = true;
      mainWindow.close();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    popupWindows.forEach((w) => {
      if (!w.isDestroyed()) {
        w.destroy();
      }
    });
    popupWindows = [];
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') {
      return;
    }

    if (input.key === 'F11') {
      event.preventDefault();
      presentationMode = !presentationMode;
      applyPresentationWindowMode();
      return;
    }

    if (input.key === 'Escape' && presentationMode) {
      event.preventDefault();
      presentationMode = false;
      applyPresentationWindowMode();
      return;
    }

    if (input.control && input.key === ',') {
      event.preventDefault();
      mainWindow.webContents.send('shortcut:openSettings');
      return;
    }

    if (input.control && input.key.toLowerCase() === 'q') {
      event.preventDefault();
      mainWindow.close();
      return;
    }

    if (input.key === 'Space') {
      event.preventDefault();
      mainWindow.webContents.send('shortcut:togglePause');
    }
  });

  mainWindow.on('resize', () => {
    if (presentationMode) {
      mainWindow.webContents.send('window:fullscreenChanged', true);
    }
  });
}

app.on('web-contents-created', (_event, contents) => {
  attachPopupGuards(contents);
});

app.whenReady().then(() => {
  loadConfig();
  createMainWindow();

  screen.on('display-metrics-changed', () => {
    if (presentationMode) {
      applyPresentationWindowMode();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('config:get', () => deepClone(persistedConfig || defaultConfig));

ipcMain.handle('config:save', (_, config) => {
  const saved = writeConfig(config);
  applyWindowOptions();
  return deepClone(saved);
});

ipcMain.handle('config:updateDraft', (_, config) => {
  draftConfig = mergeConfig(config || {});
  return true;
});

ipcMain.handle('timetable:getCache', () => deepClone(readTimetableCache()));

ipcMain.handle('timetable:refresh', async (_, station) => {
  const result = await refreshTimetableCache(station);
  return deepClone(result);
});

ipcMain.handle('solarTerms:getYear', (_, year) => {
  const cache = readSolarTermYearCache(year);
  return deepClone({ ok: !!(cache && cache.terms?.length), cache });
});

ipcMain.handle('solarTerms:refreshYear', async (_, year) => {
  const result = await refreshSolarTermYearCache(year);
  return deepClone(result);
});

ipcMain.handle('advice:getDaily', async (_, forceRefresh = false) => {
  const result = await getDailyAdvice(!!forceRefresh);
  return deepClone(result);
});

ipcMain.handle('config:setDirty', (_, isDirty) => {
  unsavedChanges = !!isDirty;
  return true;
});

ipcMain.handle('window:setAlwaysOnTop', (_, enabled) => {
  if (!persistedConfig) {
    return false;
  }
  persistedConfig.window.alwaysOnTop = !!enabled;
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(!!enabled, 'screen-saver');
  }
  return true;
});

ipcMain.handle('window:setPreventMinimize', (_, enabled) => {
  if (!persistedConfig) {
    return false;
  }
  persistedConfig.window.preventMinimize = !!enabled;
  return true;
});

ipcMain.handle('window:setFullscreen', (_, enabled) => {
  if (mainWindow) {
    presentationMode = !!enabled;
    applyPresentationWindowMode();
  }
  return true;
});

ipcMain.handle('window:toggleFullscreen', () => {
  if (mainWindow) {
    presentationMode = !presentationMode;
    applyPresentationWindowMode();
    return presentationMode;
  }
  return false;
});

ipcMain.handle('window:isFullscreen', () => {
  if (mainWindow) {
    return presentationMode;
  }
  return false;
});

ipcMain.handle('app:requestQuit', () => {
  if (mainWindow) {
    mainWindow.close();
  }
  return true;
});

ipcMain.handle('dialog:pickMediaFiles', async () => {
  if (!mainWindow) {
    return [];
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    title: '미디어 파일 선택',
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: 'Media',
        extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm']
      }
    ]
  });

  if (result.canceled) {
    return [];
  }
  return result.filePaths || [];
});

ipcMain.handle('dialog:pickImageFile', async () => {
  if (!mainWindow) {
    return null;
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    title: '로고 이미지 선택',
    properties: ['openFile'],
    filters: [
      {
        name: 'Images',
        extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'ico']
      }
    ]
  });

  if (result.canceled) {
    return null;
  }
  return result.filePaths?.[0] || null;
});

ipcMain.handle('media:validatePaths', (_, paths) => {
  if (!Array.isArray(paths)) {
    return [];
  }
  return paths.map((p) => ({ path: p, exists: fs.existsSync(p) }));
});

ipcMain.handle('browser:openPopup', (_, url) => {
  return handlePopupRequest(url);
});
