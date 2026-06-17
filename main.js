const { app, BrowserWindow, dialog, ipcMain, screen, session, shell } = require('electron');
const { execFileSync } = require('child_process');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const {
  DEFAULT_LOGO_RELATIVE_PATH,
  SIDEBAR_WIDGET_DEFAULTS_VERSION,
  defaultSidebarWidgets,
  createDefaultConfig,
  normalizeBrowserZoomPercent
} = require('./config-defaults');
const {
  normalizeMaintenanceSettings,
  isWithinUnavailableWindow,
  isTimeWithinUnavailableWindow,
  getDelayUntilNextDailyTime,
  getUnavailableWindowLabel
} = require('./maintenance-utils');

let mainWindow;
let popupWindows = [];
let unsavedChanges = false;
let draftConfig = null;
let persistedConfig = null;
let bypassClosePrompt = false;
let presentationMode = true;
let pendingAutoStartWarning = null;
let lastPopupRequest = { url: '', mode: '', at: 0 };
let allowProgrammaticMinimize = false;
let lastSmssSuccessAt = null;
let smssWebRequestWatchdogInstalled = false;
let smssWatchdogTimer = null;
let smssLogFilePath = null;
let smssLogFileUnavailable = false;
let updaterInitialized = false;
let maintenanceUpdateTimer = null;
let installAfterDownload = false;
let updateCheckInFlight = false;
let updateState = null;

const SMSS_HOST = 'smss.seoulmetro.co.kr';
const SMSS_WEBREQUEST_FILTER = { urls: [`*://${SMSS_HOST}/*`] };
const AUTO_START_RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const APP_ID = 'kr.or.ncuc.jinjeop-line-signage';
const DISPLAY_APP_NAME = 'Jinjeop Line Signage';
const KOREAN_APP_NAME = '진접선 행선안내 사이니지';
const AUTO_START_VALUE_NAME = 'JinjeopLineSignage';
const LEGACY_AUTO_START_VALUE_NAMES = ['NamyangjuDashboard'];
const smssDiagnosticContents = new Set();
const smssConsoleForwardContents = new Set();
const smokeTestMode = process.argv.includes('--smoke-test');

app.setName(DISPLAY_APP_NAME);
if (process.platform === 'win32') {
  app.setAppUserModelId(APP_ID);
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
  });
}

const ADVICE_API_URL = 'https://korean-advice-open-api.vercel.app/api/advice';
const fallbackAdvice = {
  message: '오늘도 좋은 하루 보내세요.',
  author: '',
  authorProfile: ''
};

function getRuntimeBasePath() {
  return app.isPackaged ? path.dirname(process.execPath) : __dirname;
}

function getRuntimeRelativePath(relativePath) {
  const parts = String(relativePath || '')
    .replace(/^[\\/]+/, '')
    .split(/[\\/]+/)
    .filter(Boolean);
  return path.join(getRuntimeBasePath(), ...parts);
}

function getDefaultLogoPath() {
  const logoParts = DEFAULT_LOGO_RELATIVE_PATH.split('/');
  const candidates = [
    path.join(getRuntimeBasePath(), ...logoParts),
    path.join(__dirname, ...logoParts),
    process.resourcesPath ? path.join(process.resourcesPath, ...logoParts) : '',
    process.resourcesPath ? path.join(process.resourcesPath, 'app', ...logoParts) : ''
  ].filter(Boolean);
  const uniqueCandidates = [...new Set(candidates)];
  return uniqueCandidates.find((candidate) => fs.existsSync(candidate)) || uniqueCandidates[0];
}

const defaultConfig = createDefaultConfig();

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

function normalizeWindowSettings(input) {
  const defaults = defaultConfig.window || {};
  const source = input && typeof input === 'object' ? input : {};
  return {
    ...defaults,
    ...source,
    alwaysOnTop: hasOwn(source, 'alwaysOnTop') ? !!source.alwaysOnTop : !!defaults.alwaysOnTop,
    preventMinimize: hasOwn(source, 'preventMinimize') ? !!source.preventMinimize : !!defaults.preventMinimize,
    autoStart: hasOwn(source, 'autoStart') ? !!source.autoStart : !!defaults.autoStart,
    startFullscreen: hasOwn(source, 'startFullscreen') ? !!source.startFullscreen : !!defaults.startFullscreen
  };
}

function normalizeUiSettings(input) {
  const defaults = defaultConfig.ui || { adminOptionsEnabled: false };
  const source = input && typeof input === 'object' ? input : {};
  return {
    ...defaults,
    ...source,
    adminOptionsEnabled: hasOwn(source, 'adminOptionsEnabled')
      ? !!source.adminOptionsEnabled
      : !!defaults.adminOptionsEnabled
  };
}

function normalizeMaintenanceConfig(input) {
  return normalizeMaintenanceSettings(input || defaultConfig.maintenance);
}

function hasMissingStartupWindowConfig(config) {
  const windowConfig = config?.window || {};
  return !hasOwn(windowConfig, 'autoStart') || !hasOwn(windowConfig, 'startFullscreen');
}

function hasMissingUiConfig(config) {
  const uiConfig = config?.ui || {};
  return !hasOwn(uiConfig, 'adminOptionsEnabled');
}

function hasMissingMaintenanceConfig(config) {
  const maintenanceConfig = config?.maintenance || {};
  return ['autoUpdateEnabled', 'updateTime', 'unavailableStartTime', 'unavailableEndTime']
    .some((key) => !hasOwn(maintenanceConfig, key));
}

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

function getSmssLogTime() {
  return new Date().toISOString();
}

function getSmssLogFilePath() {
  if (smssLogFilePath || smssLogFileUnavailable) {
    return smssLogFilePath;
  }

  const candidates = [
    path.join(__dirname, 'logs', 'smss-diagnostics.log')
  ];

  for (const candidate of candidates) {
    try {
      fs.mkdirSync(path.dirname(candidate), { recursive: true });
      fs.appendFileSync(candidate, '', 'utf-8');
      smssLogFilePath = candidate;
      return smssLogFilePath;
    } catch (_) {
      // Try the next writable location.
    }
  }

  smssLogFileUnavailable = true;
  return null;
}

function writeSmssLogLine(line) {
  console.log(line);

  const logFilePath = getSmssLogFilePath();
  if (!logFilePath) {
    return;
  }

  fs.appendFile(logFilePath, `${line}\n`, 'utf-8', () => {});
}

function logSmss(prefix, payload) {
  writeSmssLogLine(`${prefix} ${JSON.stringify({
    time: getSmssLogTime(),
    ...payload
  })}`);
}

function isSmssUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return false;
  }

  try {
    return new URL(rawUrl).hostname === SMSS_HOST;
  } catch (_) {
    return false;
  }
}

function safeIsDestroyed(contents) {
  try {
    return !contents || contents.isDestroyed?.() === true;
  } catch (_) {
    return true;
  }
}

function safeWebContentsUrl(contents) {
  if (safeIsDestroyed(contents)) {
    return 'destroyed';
  }

  try {
    return contents.getURL();
  } catch (err) {
    return `unavailable: ${err.message || err}`;
  }
}

function getBackgroundThrottlingState(webPreferences) {
  const hasExplicitValue = !!webPreferences
    && Object.prototype.hasOwnProperty.call(webPreferences, 'backgroundThrottling');
  const explicit = hasExplicitValue ? webPreferences.backgroundThrottling : 'undefined';
  return {
    explicit,
    effective: hasExplicitValue ? !!webPreferences.backgroundThrottling : true
  };
}

function logBackgroundThrottling(scope, webPreferences, extra = {}) {
  logSmss('[SMSS VIEW]', {
    event: 'background-throttling',
    scope,
    backgroundThrottling: getBackgroundThrottlingState(webPreferences),
    ...extra
  });
}

function getSmssWebContentsState(contents) {
  if (safeIsDestroyed(contents)) {
    return {
      url: 'destroyed',
      isLoading: false,
      isDestroyed: true
    };
  }

  let isLoading = false;
  try {
    isLoading = contents.isLoading();
  } catch (_) {
    isLoading = false;
  }

  return {
    url: safeWebContentsUrl(contents),
    isLoading,
    isDestroyed: false
  };
}

function readSmssDocumentState(contents) {
  if (safeIsDestroyed(contents) || typeof contents.executeJavaScript !== 'function') {
    return Promise.resolve({
      documentStateError: 'webContents unavailable'
    });
  }

  return contents.executeJavaScript(`
    (() => ({
      href: location.href,
      visibilityState: document.visibilityState,
      hidden: document.hidden
    }))()
  `, false).catch((err) => ({
    documentStateError: err?.message || String(err)
  }));
}

function logSmssViewEvent(contents, event, details = {}) {
  const contentsState = getSmssWebContentsState(contents);
  readSmssDocumentState(contents).then((documentState) => {
    logSmss('[SMSS VIEW]', {
      event,
      ...contentsState,
      ...details,
      document: documentState
    });
  }).catch((err) => {
    logSmss('[SMSS VIEW]', {
      event,
      ...contentsState,
      ...details,
      document: {
        documentStateError: err?.message || String(err)
      }
    });
  });
}

const SMSS_INPAGE_DIAGNOSTIC_SCRIPT = `
  (() => {
    const prefix = '[SMSS INPAGE]';
    const buildPayload = (event, extra = {}) => ({
      event,
      time: new Date().toISOString(),
      href: location.href,
      visibilityState: document.visibilityState,
      hidden: document.hidden,
      ...extra
    });
    const log = (event, extra = {}) => {
      try {
        console.log(prefix + ' ' + JSON.stringify(buildPayload(event, extra)));
      } catch (err) {
        console.log(prefix + ' ' + event);
      }
    };

    if (window.__SMSS_INPAGE_DIAG_INSTALLED__) {
      log('already-installed');
      return true;
    }

    window.__SMSS_INPAGE_DIAG_INSTALLED__ = true;
    log('installed');

    window.addEventListener('beforeunload', () => {
      log('beforeunload');
    });

    document.addEventListener('visibilitychange', () => {
      log('visibilitychange');
    });

    window.addEventListener('error', (event) => {
      log('error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      log('unhandledrejection', {
        reason: reason?.stack || reason?.message || String(reason)
      });
    });

    setInterval(() => {
      log('alive');
    }, 5000);

    return true;
  })();
`;

function injectSmssInPageDiagnostics(contents) {
  if (safeIsDestroyed(contents) || typeof contents.executeJavaScript !== 'function') {
    return;
  }

  const currentUrl = safeWebContentsUrl(contents);
  if (!isSmssUrl(currentUrl)) {
    return;
  }

  contents.executeJavaScript(SMSS_INPAGE_DIAGNOSTIC_SCRIPT, false)
    .then(() => {
      logSmssViewEvent(contents, 'inpage-diagnostics-injected');
    })
    .catch((err) => {
      logSmssViewEvent(contents, 'inpage-diagnostics-inject-failed', {
        error: err?.message || String(err)
      });
    });
}

function attachSmssConsoleForwarding(contents, source) {
  if (!contents || smssConsoleForwardContents.has(contents.id)) {
    return;
  }

  smssConsoleForwardContents.add(contents.id);
  contents.once('destroyed', () => {
    smssConsoleForwardContents.delete(contents.id);
  });

  contents.on('console-message', (_event, levelOrDetails, message, line, sourceId) => {
    const details = typeof levelOrDetails === 'object' && levelOrDetails !== null
      ? levelOrDetails
      : { level: levelOrDetails, message, line, sourceId };
    const text = String(details.message || '');
    if (!/^\[SMSS (VIEW|INPAGE|WEBREQUEST|WATCHDOG)\]/.test(text)) {
      return;
    }
    writeSmssLogLine(text);
  });

  logSmss('[SMSS VIEW]', {
    event: 'console-forwarding-attached',
    source,
    contentsId: contents.id
  });
}

function attachSmssViewDiagnostics(contents) {
  if (!contents || smssDiagnosticContents.has(contents.id)) {
    return;
  }

  smssDiagnosticContents.add(contents.id);
  contents.once('destroyed', () => {
    smssDiagnosticContents.delete(contents.id);
  });

  attachSmssConsoleForwarding(contents, 'smss-webview');
  logSmssViewEvent(contents, 'diagnostics-attached', {
    contentsId: contents.id
  });

  contents.on('did-start-loading', () => {
    logSmssViewEvent(contents, 'did-start-loading');
  });

  contents.on('did-stop-loading', () => {
    logSmssViewEvent(contents, 'did-stop-loading');
    injectSmssInPageDiagnostics(contents);
  });

  contents.on('did-start-navigation', (_event, url, isInPlace, isMainFrame, frameProcessId, frameRoutingId) => {
    logSmssViewEvent(contents, 'did-start-navigation', {
      navigationUrl: url,
      isInPlace,
      isMainFrame,
      frameProcessId,
      frameRoutingId
    });
  });

  contents.on('did-navigate', (_event, url, httpResponseCode, httpStatusText) => {
    logSmssViewEvent(contents, 'did-navigate', {
      navigationUrl: url,
      httpResponseCode,
      httpStatusText
    });
  });

  contents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame, frameProcessId, frameRoutingId) => {
    logSmssViewEvent(contents, 'did-fail-load', {
      errorCode,
      errorDescription,
      validatedURL,
      isMainFrame,
      frameProcessId,
      frameRoutingId
    });
  });

  contents.on('dom-ready', () => {
    logSmssViewEvent(contents, 'dom-ready');
    injectSmssInPageDiagnostics(contents);
  });

  contents.on('did-finish-load', () => {
    logSmssViewEvent(contents, 'did-finish-load');
    injectSmssInPageDiagnostics(contents);
  });

  contents.on('unresponsive', () => {
    logSmssViewEvent(contents, 'unresponsive');
  });

  contents.on('responsive', () => {
    logSmssViewEvent(contents, 'responsive');
  });

  contents.on('render-process-gone', (_event, details) => {
    logSmssViewEvent(contents, 'render-process-gone', {
      details
    });
  });

  contents.on('crashed', (_event, killed) => {
    logSmssViewEvent(contents, 'crashed', {
      killed
    });
  });
}

function installSmssWebRequestWatchdog() {
  if (smssWebRequestWatchdogInstalled) {
    return;
  }

  smssWebRequestWatchdogInstalled = true;

  session.defaultSession.webRequest.onBeforeRequest(SMSS_WEBREQUEST_FILTER, (details, callback) => {
    logSmss('[SMSS WEBREQUEST]', {
      event: 'onBeforeRequest',
      requestId: details.id,
      method: details.method,
      resourceType: details.resourceType,
      url: details.url
    });
    callback({ cancel: false });
  });

  session.defaultSession.webRequest.onCompleted(SMSS_WEBREQUEST_FILTER, (details) => {
    if (details.statusCode >= 200 && details.statusCode <= 399) {
      lastSmssSuccessAt = Date.now();
    }

    logSmss('[SMSS WEBREQUEST]', {
      event: 'onCompleted',
      requestId: details.id,
      method: details.method,
      resourceType: details.resourceType,
      statusCode: details.statusCode,
      url: details.url
    });
  });

  session.defaultSession.webRequest.onErrorOccurred(SMSS_WEBREQUEST_FILTER, (details) => {
    logSmss('[SMSS WEBREQUEST]', {
      event: 'onErrorOccurred',
      requestId: details.id,
      method: details.method,
      resourceType: details.resourceType,
      error: details.error,
      url: details.url
    });
  });

  smssWatchdogTimer = setInterval(() => {
    const now = Date.now();
    logSmss('[SMSS WATCHDOG]', {
      event: 'last-success-check',
      lastSmssSuccessAt: lastSmssSuccessAt ? new Date(lastSmssSuccessAt).toISOString() : null,
      secondsSinceLastSmssSuccess: lastSmssSuccessAt ? Math.round((now - lastSmssSuccessAt) / 1000) : null
    });
  }, 30000);
  smssWatchdogTimer.unref?.();

  logSmss('[SMSS WATCHDOG]', {
    event: 'started',
    host: SMSS_HOST,
    intervalSeconds: 30,
    logFilePath: getSmssLogFilePath()
  });
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
  if (!trimmed) {
    return defaultConfig.sidebar.logoPath;
  }

  if (/^[\\/](?![\\/])/.test(trimmed)) {
    return getRuntimeRelativePath(trimmed);
  }

  return trimmed;
}

function normalizeTransition(value) {
  return ['none', 'fade', 'slide'].includes(value) ? value : defaultConfig.player.transition;
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

function normalizeMultiWidgetSettings(input) {
  const defaults = defaultConfig.sidebar.multiWidget || {
    enabledItems: ['solarTerm', 'dailyAdvice'],
    transition: 'slide',
    intervalSeconds: 10
  };
  const allowedItems = new Set(['solarTerm', 'dailyAdvice']);
  const sourceItems = Array.isArray(input?.enabledItems) ? input.enabledItems : defaults.enabledItems;
  const enabledItems = sourceItems.filter((item) => allowedItems.has(item));
  const numericInterval = Number.parseInt(input?.intervalSeconds, 10);

  return {
    enabledItems,
    transition: ['none', 'fade', 'slide'].includes(input?.transition) ? input.transition : defaults.transition,
    intervalSeconds: Number.isFinite(numericInterval)
      ? Math.min(60, Math.max(5, numericInterval))
      : defaults.intervalSeconds
  };
}

function normalizeSidebarWidgets(input) {
  const defaultsById = new Map(defaultSidebarWidgets.map((widget) => [widget.id, widget]));
  const defaultIndexById = new Map(defaultSidebarWidgets.map((widget, index) => [widget.id, index]));
  const result = [];
  const seen = new Set();
  const source = Array.isArray(input) ? input : [];

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
      visible: item.visible !== false
    });
  });

  defaultSidebarWidgets.forEach((defaults) => {
    if (!seen.has(defaults.id)) {
      insertByDefaultOrder({ ...defaults });
    }
  });

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
  return normalizeBrowserZoomPercent(value);
}

function clampRatio(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return Math.min(1, Math.max(0, numeric));
}

function normalizeDragReplayGesture(input) {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const startXRatio = clampRatio(input.startXRatio);
  const startYRatio = clampRatio(input.startYRatio);
  const endXRatio = clampRatio(input.endXRatio);
  const endYRatio = clampRatio(input.endYRatio);
  if ([startXRatio, startYRatio, endXRatio, endYRatio].some((value) => value === null)) {
    return null;
  }

  const durationMs = Number.parseInt(input.durationMs, 10);
  return {
    startXRatio,
    startYRatio,
    endXRatio,
    endYRatio,
    durationMs: Math.min(5000, Math.max(120, Number.isFinite(durationMs) ? durationMs : 700))
  };
}

function normalizeDragReplaySettings(input) {
  const defaults = defaultConfig.browser?.dragReplay || { enabled: true, gesture: null };
  const source = input && typeof input === 'object' ? input : defaults;
  const defaultGesture = normalizeDragReplayGesture(source.defaultGesture)
    || normalizeDragReplayGesture(defaults.defaultGesture)
    || normalizeDragReplayGesture(defaults.gesture);
  const gesture = hasOwn(source, 'gesture')
    ? normalizeDragReplayGesture(source.gesture) || defaultGesture
    : defaultGesture;
  return {
    enabled: !!source.enabled,
    gesture,
    defaultGesture
  };
}

function normalizePublishDate(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return '';
  }
  const date = new Date(`${text}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '' : text;
}

function normalizePlaylistItem(item) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const pathValue = typeof item.path === 'string' ? item.path : '';
  if (!pathValue) {
    return null;
  }

  return {
    path: pathValue,
    type: item.type === 'video' ? 'video' : 'image',
    duration: Number(item.duration) > 0 ? Number(item.duration) : 5,
    publishStartDate: normalizePublishDate(item.publishStartDate),
    publishEndDate: normalizePublishDate(item.publishEndDate)
  };
}

function normalizePlaylist(playlist) {
  return (Array.isArray(playlist) ? playlist : [])
    .map(normalizePlaylistItem)
    .filter(Boolean);
}

function normalizeTrainInfoAutoRefreshIntervalHours(value) {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) {
    return defaultConfig.browser?.autoRefresh?.intervalHours || 6;
  }
  return Math.min(168, Math.max(1, Math.round(numeric * 10) / 10));
}

function normalizeTrainInfoAutoRefreshSettings(input) {
  const defaults = defaultConfig.browser?.autoRefresh || { enabled: true, intervalHours: 6 };
  const source = input && typeof input === 'object' ? input : defaults;
  return {
    enabled: !!source.enabled,
    intervalHours: normalizeTrainInfoAutoRefreshIntervalHours(source.intervalHours)
  };
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
      zoomPercent: normalizeZoomPercent(browserConfig.zoomPercent),
      dragReplay: normalizeDragReplaySettings(browserConfig.dragReplay),
      autoRefresh: normalizeTrainInfoAutoRefreshSettings(browserConfig.autoRefresh)
    },
    player: {
      transition: normalizeTransition(userConfig.player?.transition),
      playlist: normalizePlaylist(userConfig?.player?.playlist)
    },
    window: normalizeWindowSettings(userConfig.window),
    ui: normalizeUiSettings(userConfig.ui),
    maintenance: normalizeMaintenanceConfig(userConfig.maintenance),
    sidebar: {
      ...defaultConfig.sidebar,
      ...(userConfig.sidebar || {}),
      logoPath: normalizeLogoPath(userConfig.sidebar?.logoPath),
      widgetDefaultsVersion: SIDEBAR_WIDGET_DEFAULTS_VERSION,
      widgets: normalizeSidebarWidgets(userConfig.sidebar?.widgets),
      multiWidget: normalizeMultiWidgetSettings(userConfig.sidebar?.multiWidget),
      timetable: normalizeTimetableSettings(userConfig.sidebar?.timetable || defaultConfig.sidebar.timetable)
    }
  };
}

function hasUnknownPlayerConfig(config) {
  const playerConfig = config?.player;
  if (!playerConfig || typeof playerConfig !== 'object') {
    return false;
  }
  const allowedKeys = new Set(['transition', 'playlist']);
  return Object.keys(playerConfig).some((key) => !allowedKeys.has(key));
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
    if (
      hasUnknownPlayerConfig(parsed)
      || hasMissingStartupWindowConfig(parsed)
      || hasMissingUiConfig(parsed)
      || hasMissingMaintenanceConfig(parsed)
    ) {
      fs.writeFileSync(configPath, JSON.stringify(persistedConfig, null, 2), 'utf-8');
    }
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
  scheduleMaintenanceUpdateCheck();
  return merged;
}

function applyWindowOptions() {
  if (!mainWindow || !persistedConfig) {
    return;
  }

  const { alwaysOnTop } = persistedConfig.window;
  mainWindow.setAlwaysOnTop(!!alwaysOnTop, 'screen-saver');
}

function getMaintenanceConfig() {
  return normalizeMaintenanceConfig(persistedConfig?.maintenance);
}

function getInitialUpdateState() {
  const maintenance = getMaintenanceConfig();
  return {
    supported: false,
    enabled: !!maintenance.autoUpdateEnabled,
    state: 'idle',
    message: '자동 업데이트 초기화 대기 중',
    currentVersion: app.getVersion(),
    nextCheckAt: null,
    lastCheckedAt: null,
    availableVersion: null,
    downloadedVersion: null,
    downloadedAt: null,
    progressPercent: null,
    error: null,
    isUnavailableNow: isWithinUnavailableWindow(new Date(), maintenance),
    unavailableWindow: getUnavailableWindowLabel(maintenance),
    updateTime: maintenance.updateTime
  };
}

function getUpdateStatus() {
  if (!updateState) {
    updateState = getInitialUpdateState();
  }
  const maintenance = getMaintenanceConfig();
  return {
    ...updateState,
    enabled: !!maintenance.autoUpdateEnabled,
    currentVersion: app.getVersion(),
    isUnavailableNow: isWithinUnavailableWindow(new Date(), maintenance),
    unavailableWindow: getUnavailableWindowLabel(maintenance),
    updateTime: maintenance.updateTime
  };
}

function sendUpdateStatus() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.webContents.send('updater:statusChanged', getUpdateStatus());
}

function setUpdateStatus(patch = {}) {
  updateState = {
    ...getUpdateStatus(),
    ...patch
  };
  sendUpdateStatus();
  return getUpdateStatus();
}

function isUpdaterSupported() {
  return process.platform === 'win32' && app.isPackaged && !!autoUpdater;
}

function clearMaintenanceUpdateTimer() {
  if (maintenanceUpdateTimer) {
    clearTimeout(maintenanceUpdateTimer);
    maintenanceUpdateTimer = null;
  }
}

function initializeAutoUpdater() {
  if (updaterInitialized) {
    return getUpdateStatus();
  }
  updaterInitialized = true;

  if (!isUpdaterSupported()) {
    return setUpdateStatus({
      supported: false,
      state: 'unsupported',
      message: app.isPackaged
        ? '현재 환경에서는 자동 업데이트를 사용할 수 없습니다.'
        : '자동 업데이트는 NSIS 설치형 앱에서만 동작합니다.',
      error: null
    });
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('checking-for-update', () => {
    updateCheckInFlight = true;
    setUpdateStatus({
      supported: true,
      state: 'checking',
      message: '업데이트 확인 중',
      lastCheckedAt: new Date().toISOString(),
      progressPercent: null,
      error: null
    });
  });

  autoUpdater.on('update-available', (info) => {
    setUpdateStatus({
      supported: true,
      state: 'available',
      message: `새 버전 ${info?.version || ''} 다운로드 중`,
      availableVersion: info?.version || null,
      error: null
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    setUpdateStatus({
      supported: true,
      state: 'downloading',
      message: `업데이트 다운로드 중 ${Math.round(Number(progress?.percent) || 0)}%`,
      progressPercent: Math.round(Number(progress?.percent) || 0),
      error: null
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    updateCheckInFlight = false;
    installAfterDownload = false;
    setUpdateStatus({
      supported: true,
      state: 'not-available',
      message: '현재 최신 버전입니다.',
      availableVersion: info?.version || null,
      progressPercent: null,
      error: null
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateCheckInFlight = false;
    setUpdateStatus({
      supported: true,
      state: 'downloaded',
      message: `업데이트 ${info?.version || ''} 설치 준비 완료`,
      availableVersion: info?.version || null,
      downloadedVersion: info?.version || null,
      downloadedAt: new Date().toISOString(),
      progressPercent: 100,
      error: null
    });

    if (installAfterDownload) {
      installAfterDownload = false;
      installDownloadedUpdate({ silent: true, forceRunAfter: true });
    }
  });

  autoUpdater.on('error', (err) => {
    updateCheckInFlight = false;
    installAfterDownload = false;
    setUpdateStatus({
      supported: true,
      state: 'error',
      message: '업데이트 처리 중 오류가 발생했습니다.',
      progressPercent: null,
      error: err?.message || String(err)
    });
  });

  return setUpdateStatus({
    supported: true,
    state: 'idle',
    message: '자동 업데이트 준비 완료',
    error: null
  });
}

async function checkForUpdates({ source = 'manual', installWhenDownloaded = false } = {}) {
  initializeAutoUpdater();
  const maintenance = getMaintenanceConfig();
  const scheduled = source === 'scheduled';

  if (scheduled && !maintenance.autoUpdateEnabled) {
    return setUpdateStatus({
      state: 'disabled',
      message: '자동 업데이트가 꺼져 있습니다.',
      error: null
    });
  }

  if (scheduled && isWithinUnavailableWindow(new Date(), maintenance)) {
    return setUpdateStatus({
      state: 'skipped',
      message: `운영 불가능 시간대(${getUnavailableWindowLabel(maintenance)})라 자동 업데이트를 건너뜁니다.`,
      error: null
    });
  }

  if (!isUpdaterSupported()) {
    return getUpdateStatus();
  }

  if (updateCheckInFlight) {
    return getUpdateStatus();
  }

  installAfterDownload = !!installWhenDownloaded;
  try {
    await autoUpdater.checkForUpdates();
    return getUpdateStatus();
  } catch (err) {
    updateCheckInFlight = false;
    installAfterDownload = false;
    return setUpdateStatus({
      state: 'error',
      message: '업데이트 확인에 실패했습니다.',
      error: err?.message || String(err)
    });
  }
}

function installDownloadedUpdate({ silent = true, forceRunAfter = true } = {}) {
  initializeAutoUpdater();
  if (!isUpdaterSupported()) {
    return getUpdateStatus();
  }

  if (getUpdateStatus().state !== 'downloaded') {
    return checkForUpdates({ source: 'manual-install', installWhenDownloaded: true });
  }

  setUpdateStatus({
    state: 'installing',
    message: '업데이트 설치를 시작합니다.',
    error: null
  });
  bypassClosePrompt = true;
  unsavedChanges = false;
  setTimeout(() => {
    autoUpdater.quitAndInstall(silent, forceRunAfter);
  }, 300);
  return getUpdateStatus();
}

function runScheduledUpdateCheck() {
  checkForUpdates({ source: 'scheduled', installWhenDownloaded: true })
    .finally(() => {
      scheduleMaintenanceUpdateCheck();
    });
}

function scheduleMaintenanceUpdateCheck() {
  clearMaintenanceUpdateTimer();
  const maintenance = getMaintenanceConfig();
  initializeAutoUpdater();

  if (!maintenance.autoUpdateEnabled) {
    setUpdateStatus({
      state: 'disabled',
      message: '자동 업데이트가 꺼져 있습니다.',
      nextCheckAt: null,
      error: null
    });
    return;
  }

  if (isTimeWithinUnavailableWindow(maintenance.updateTime, maintenance)) {
    setUpdateStatus({
      state: 'invalid-schedule',
      message: `업데이트 시간이 운영 불가능 시간대(${getUnavailableWindowLabel(maintenance)}) 안에 있습니다.`,
      nextCheckAt: null,
      error: 'Update time is inside the unavailable window.'
    });
    return;
  }

  const delay = getDelayUntilNextDailyTime(maintenance.updateTime);
  const nextCheckAt = new Date(Date.now() + delay).toISOString();
  setUpdateStatus({
    nextCheckAt,
    state: getUpdateStatus().state === 'unsupported' ? 'unsupported' : getUpdateStatus().state,
    message: getUpdateStatus().state === 'unsupported'
      ? getUpdateStatus().message
      : `다음 자동 업데이트 확인: ${maintenance.updateTime}`,
    error: getUpdateStatus().state === 'unsupported' ? getUpdateStatus().error : null
  });
  maintenanceUpdateTimer = setTimeout(runScheduledUpdateCheck, delay);
  maintenanceUpdateTimer.unref?.();
}

function getAutoStartLaunchOptions() {
  const executablePath = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
  const args = process.defaultApp
    ? [app.getAppPath(), '--autostart']
    : ['--autostart'];
  return {
    path: executablePath,
    args,
    name: DISPLAY_APP_NAME
  };
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function quoteCommandLineArg(value) {
  return `"${String(value || '').replace(/"/g, '\\"')}"`;
}

function getAutoStartCommandLine(launchOptions = getAutoStartLaunchOptions()) {
  return [
    quoteCommandLineArg(launchOptions.path),
    ...launchOptions.args.map((arg) => quoteCommandLineArg(arg))
  ].join(' ');
}

function commandLinesEqual(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

function readAutoStartRegistryValue(valueName = AUTO_START_VALUE_NAME) {
  try {
    const output = execFileSync('reg.exe', ['query', AUTO_START_RUN_KEY, '/v', valueName], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 2000,
      stdio: ['ignore', 'pipe', 'ignore']
    });
    const valueLine = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.startsWith(valueName));
    if (!valueLine) {
      return '';
    }
    const match = valueLine.match(new RegExp(`^${escapeRegExp(valueName)}\\s+REG_\\w+\\s+(.+)$`));
    return match ? match[1].trim() : '';
  } catch (_) {
    return '';
  }
}

function writeAutoStartRegistryValue(enabled, launchOptions = getAutoStartLaunchOptions(), valueName = AUTO_START_VALUE_NAME) {
  try {
    if (!enabled) {
      execFileSync('reg.exe', ['delete', AUTO_START_RUN_KEY, '/v', valueName, '/f'], {
        windowsHide: true,
        timeout: 2000,
        stdio: 'ignore'
      });
      return null;
    }

    execFileSync('reg.exe', [
      'add',
      AUTO_START_RUN_KEY,
      '/v',
      valueName,
      '/t',
      'REG_SZ',
      '/d',
      getAutoStartCommandLine(launchOptions),
      '/f'
    ], {
      windowsHide: true,
      timeout: 2000,
      stdio: 'ignore'
    });
    return null;
  } catch (err) {
    if (!enabled) {
      return null;
    }
    return err;
  }
}

function cleanupLegacyAutoStartRegistryValues() {
  LEGACY_AUTO_START_VALUE_NAMES.forEach((valueName) => {
    writeAutoStartRegistryValue(false, getAutoStartLaunchOptions(), valueName);
  });
}

function getAutoStartStatus() {
  const desired = !!persistedConfig?.window?.autoStart;
  if (process.platform !== 'win32') {
    return {
      supported: false,
      desired,
      openAtLogin: false,
      wasOpenedAtLogin: false,
      error: null
    };
  }

  const launchOptions = getAutoStartLaunchOptions();
  const expectedRegistryValue = getAutoStartCommandLine(launchOptions);
  const registryValue = readAutoStartRegistryValue(AUTO_START_VALUE_NAME);
  const legacyRegistryValues = LEGACY_AUTO_START_VALUE_NAMES
    .map((valueName) => ({
      valueName,
      value: readAutoStartRegistryValue(valueName)
    }))
    .filter((entry) => !!entry.value);
  const registryOpenAtLogin = commandLinesEqual(registryValue, expectedRegistryValue)
    || legacyRegistryValues.some((entry) => commandLinesEqual(entry.value, expectedRegistryValue));
  try {
    const settings = app.getLoginItemSettings({
      path: launchOptions.path,
      args: launchOptions.args,
      name: AUTO_START_VALUE_NAME
    });
    return {
      supported: true,
      desired,
      openAtLogin: !!settings.openAtLogin || registryOpenAtLogin,
      wasOpenedAtLogin: !!settings.wasOpenedAtLogin,
      path: launchOptions.path,
      args: launchOptions.args,
      registryValue,
      legacyRegistryValues,
      expectedRegistryValue,
      error: null
    };
  } catch (err) {
    return {
      supported: true,
      desired,
      openAtLogin: registryOpenAtLogin,
      wasOpenedAtLogin: false,
      path: launchOptions.path,
      args: launchOptions.args,
      registryValue,
      legacyRegistryValues,
      expectedRegistryValue,
      error: err.message
    };
  }
}

function queueAutoStartWarning(detail) {
  pendingAutoStartWarning = detail;
  flushAutoStartWarning();
}

function flushAutoStartWarning() {
  if (!pendingAutoStartWarning || !mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const warning = pendingAutoStartWarning;
  pendingAutoStartWarning = null;
  dialog.showMessageBox(mainWindow, {
    type: 'warning',
    buttons: ['확인'],
    defaultId: 0,
    message: 'Windows 시작 프로그램 등록을 자동으로 완료하지 못했습니다.',
    detail: [
      warning.error ? `오류: ${warning.error}` : 'Windows 설정에서 시작 앱 권한이 차단되었을 수 있습니다.',
      '설정 > 앱 > 시작 프로그램에서 이 사이니지 앱을 켜 주세요.',
      '설정 화면에서 "Windows 시작 시 자동 실행"을 껐다가 다시 켜고 저장하면 재등록을 다시 시도합니다.'
    ].join('\n')
  }).catch((err) => {
    console.error('Failed to show auto-start warning:', err);
  });
}

function syncAutoStartSetting({ notifyOnFailure = false } = {}) {
  if (process.platform !== 'win32') {
    return getAutoStartStatus();
  }

  const desired = !!persistedConfig?.window?.autoStart;
  const launchOptions = getAutoStartLaunchOptions();
  try {
    app.setLoginItemSettings({
      openAtLogin: desired,
      openAsHidden: false,
      path: launchOptions.path,
      args: launchOptions.args,
      name: AUTO_START_VALUE_NAME
    });

    if (desired) {
      cleanupLegacyAutoStartRegistryValues();
    }

    if (!desired && launchOptions.args.length) {
      app.setLoginItemSettings({
        openAtLogin: false,
        path: launchOptions.path,
        args: [],
        name: AUTO_START_VALUE_NAME
      });
    }

    let status = getAutoStartStatus();
    const expectedRegistryValue = getAutoStartCommandLine(launchOptions);
    if (desired && !commandLinesEqual(status.registryValue, expectedRegistryValue)) {
      const registryError = writeAutoStartRegistryValue(true, launchOptions);
      cleanupLegacyAutoStartRegistryValues();
      status = getAutoStartStatus();
      if (registryError && !status.openAtLogin) {
        status.error = registryError.message;
      }
    }
    if (!desired) {
      writeAutoStartRegistryValue(false, launchOptions);
      cleanupLegacyAutoStartRegistryValues();
      status = getAutoStartStatus();
    }
    if (notifyOnFailure && desired && !status.openAtLogin) {
      queueAutoStartWarning(status);
    }
    return status;
  } catch (err) {
    const status = {
      supported: true,
      desired,
      openAtLogin: false,
      wasOpenedAtLogin: false,
      path: launchOptions.path,
      args: launchOptions.args,
      error: err.message
    };
    if (desired) {
      const registryError = writeAutoStartRegistryValue(true, launchOptions);
      cleanupLegacyAutoStartRegistryValues();
      const fallbackStatus = getAutoStartStatus();
      status.openAtLogin = fallbackStatus.openAtLogin;
      status.registryValue = fallbackStatus.registryValue;
      status.expectedRegistryValue = fallbackStatus.expectedRegistryValue;
      status.error = status.openAtLogin ? null : (registryError?.message || err.message);
    } else {
      writeAutoStartRegistryValue(false, launchOptions);
      cleanupLegacyAutoStartRegistryValues();
    }
    if (notifyOnFailure && desired && !status.openAtLogin) {
      queueAutoStartWarning(status);
    }
    return status;
  }
}

function getStartupFolderPath() {
  return path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
}

async function openStartupFolder() {
  if (process.platform !== 'win32') {
    return {
      ok: false,
      supported: false,
      error: 'Windows에서만 시작프로그램 폴더를 열 수 있습니다.'
    };
  }

  const folderPath = getStartupFolderPath();
  try {
    fs.mkdirSync(folderPath, { recursive: true });
    const errorMessage = await shell.openPath(folderPath);
    if (errorMessage) {
      return { ok: false, supported: true, path: folderPath, error: errorMessage };
    }
    return { ok: true, supported: true, path: folderPath, error: null };
  } catch (err) {
    return {
      ok: false,
      supported: true,
      path: folderPath,
      error: err.message || String(err)
    };
  }
}

async function openWindowsStartupSettings() {
  if (process.platform !== 'win32') {
    return {
      ok: false,
      supported: false,
      error: 'Windows에서만 시작프로그램 설정 창을 열 수 있습니다.'
    };
  }

  try {
    await shell.openExternal('ms-settings:startupapps');
    return { ok: true, supported: true, error: null };
  } catch (err) {
    return {
      ok: false,
      supported: true,
      error: err.message || String(err)
    };
  }
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
  const mainWindowWebPreferences = {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    webviewTag: true
  };

  mainWindow = new BrowserWindow({
    title: KOREAN_APP_NAME,
    width: 1600,
    height: 900,
    frame: false,
    show: false,
    autoHideMenuBar: true,
    icon: getAppIconPath(),
    webPreferences: mainWindowWebPreferences
  });

  logBackgroundThrottling('main-window', mainWindowWebPreferences);
  attachSmssConsoleForwarding(mainWindow.webContents, 'main-renderer');

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  applyWindowOptions();

  mainWindow.webContents.on('will-attach-webview', (_event, webPreferences, params) => {
    logBackgroundThrottling('webview', webPreferences, {
      src: params?.src || null,
      partition: params?.partition || null
    });

    if (getPopupMode() === 'block' && params) {
      delete params.allowpopups;
    }
  });

  mainWindow.webContents.on('did-attach-webview', (_event, webContents) => {
    attachPopupGuards(webContents);
    attachBrowserZoomControls(webContents);
    attachSmssViewDiagnostics(webContents);
  });

  mainWindow.once('ready-to-show', () => {
    applyPresentationWindowMode();
    mainWindow.show();
    flushAutoStartWarning();
    if (smokeTestMode) {
      setTimeout(() => {
        bypassClosePrompt = true;
        app.quit();
      }, 1200);
    }
  });

  mainWindow.on('minimize', (event) => {
    if (allowProgrammaticMinimize) {
      allowProgrammaticMinimize = false;
      return;
    }
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
        syncAutoStartSetting({ notifyOnFailure: true });
        applyWindowOptions();
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
  presentationMode = !!persistedConfig?.window?.startFullscreen;
  syncAutoStartSetting({ notifyOnFailure: true });
  initializeAutoUpdater();
  scheduleMaintenanceUpdateCheck();
  installSmssWebRequestWatchdog();
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

app.on('before-quit', () => {
  clearMaintenanceUpdateTimer();
  if (smssWatchdogTimer) {
    clearInterval(smssWatchdogTimer);
    smssWatchdogTimer = null;
  }
});

ipcMain.handle('config:get', () => deepClone(persistedConfig || defaultConfig));

ipcMain.handle('config:getDefaults', () => deepClone(defaultConfig));

ipcMain.handle('app:getVersion', () => app.getVersion());

ipcMain.handle('app:getAutoStartStatus', () => getAutoStartStatus());

ipcMain.handle('app:openStartupFolder', () => openStartupFolder());

ipcMain.handle('app:openWindowsStartupSettings', () => openWindowsStartupSettings());

ipcMain.handle('maintenance:getStatus', () => ({
  settings: getMaintenanceConfig(),
  isUnavailableNow: isWithinUnavailableWindow(new Date(), getMaintenanceConfig()),
  unavailableWindow: getUnavailableWindowLabel(getMaintenanceConfig())
}));

ipcMain.handle('updater:getStatus', () => getUpdateStatus());

ipcMain.handle('updater:checkNow', () => checkForUpdates({ source: 'manual', installWhenDownloaded: false }));

ipcMain.handle('updater:installNow', () => installDownloadedUpdate({ silent: true, forceRunAfter: true }));

ipcMain.handle('config:save', (_, config) => {
  const saved = writeConfig(config);
  syncAutoStartSetting({ notifyOnFailure: true });
  applyWindowOptions();
  scheduleMaintenanceUpdateCheck();
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

ipcMain.handle('window:minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    allowProgrammaticMinimize = true;
    mainWindow.minimize();
    return true;
  }
  return false;
});

ipcMain.handle('window:toggleMaximize', () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return false;
  }

  if (presentationMode) {
    presentationMode = false;
    mainWindow.webContents.send('window:fullscreenChanged', false);
  }

  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  }

  mainWindow.maximize();
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
