const {
  DEFAULT_LOGO_RELATIVE_PATH,
  SIDEBAR_WIDGET_DEFAULTS_VERSION,
  defaultSidebarWidgets,
  createDefaultConfig
} = window.dashboardConfigDefaults;
const { getKoreanAirQuality } = window.dashboardAirQuality;
const fallbackDailyAdvice = {
  message: '오늘도 좋은 하루 보내세요.',
  author: '',
  authorProfile: ''
};
const SEOUL_METRO_TRAIN_INFO_URL = 'https://smss.seoulmetro.co.kr/traininfo/traininfoUserView.do';

const solarTermDescriptions = {
  '입춘': '🌸 만물이 소생하는 봄의 시작을 알립니다!',
  '우수': '💧 얼었던 대지가 녹고 따스한 봄비가 내립니다.',
  '경칩': '🐸 개구리가 겨울잠에서 깨어나는 생동감 넘치는 날입니다!',
  '춘분': '⚖️ 봄의 한가운데, 낮과 밤의 길이가 똑같아집니다.',
  '청명': '☀️ 하늘이 맑아지고 화사한 봄기운이 가득합니다!',
  '곡우': '🌱 촉촉한 봄비가 내려 한 해 농사를 준비하기 좋습니다.',
  '입하': '🍉 싱그러운 초록빛과 함께 여름이 시작됩니다!',
  '소만': '🌿 만물이 점차 생장하여 푸르름이 가득해집니다.',
  '망종': '🌾 보리를 베고 모내기를 시작하는 바쁜 시기입니다.',
  '하지': '☀️ 일 년 중 태양이 가장 오래 머무는 낮이 긴 날입니다!',
  '소서': '🌡️ 본격적인 더위가 서서히 달아오르기 시작합니다.',
  '대서': '🥵 일 년 중 가장 더운 한여름의 절정입니다! 건강 유의하세요.',
  '입추': '🍂 늦더위 속에서도 가을을 향한 선선한 바람이 불어옵니다.',
  '처서': '🌬️ 아침저녁으로 선선해지며 마법처럼 더위가 한풀 꺾입니다.',
  '백로': '💧 맑은 가을 하늘 아래 하얀 이슬이 맺히기 시작합니다.',
  '추분': '🍁 가을의 한가운데, 다시 낮과 밤의 길이가 같아집니다.',
  '한로': '🧣 찬 이슬이 맺히며 단풍이 짙게 물드는 시기입니다.',
  '상강': '❄️ 밤기운이 차가워져 된서리가 내리기 시작합니다.',
  '입동': '⛄ 겨울의 문턱에 들어서며 김장철이 다가옵니다!',
  '소설': '❄️ 첫눈이 내리며 차가운 겨울바람이 불어옵니다.',
  '대설': '☃️ 포근한 함박눈이 소복소복 쌓이는 날입니다.',
  '동지': '🌙 일 년 중 밤이 가장 긴 날, 따뜻한 팥죽 한 그릇 어떠세요?',
  '소한': '🧣 \'대한\'보다 맵다는 매서운 추위가 찾아옵니다. 따뜻하게 입으세요!',
  '대한': '🧤 일 년을 매듭짓는 가장 추운 날, 겨울의 절정입니다.'
};

let defaultConfig = createDefaultConfig();

const trainStations = {
  '408': { stationName: '별내별가람역', stationId: '0408', stationCode: '408', latitude: 37.667839, longitude: 127.116333 },
  '406': { stationName: '오남역', stationId: '0406', stationCode: '406', latitude: 37.705096, longitude: 127.192925 },
  '405': { stationName: '진접역', stationId: '0405', stationCode: '405', latitude: 37.720618, longitude: 127.203556 }
};

const state = {
  savedConfig: null,
  draftConfig: null,
  isFullscreen: false,
  isPaused: false,
  currentIndex: 0,
  slideTimer: null,
  activeSlideKey: '',
  dragIndex: null,
  sidebarWidgetDragIndex: null,
  tempToolbarTimer: null,
  weatherTimer: null,
  uiIdleTimer: null,
  browserTitleHintTimer: null,
  clockTimer: null,
  timetableCache: null,
  timetableTimer: null,
  timetableRefreshFailed: false,
  timetableRuntimeErrors: [],
  solarTermYears: {},
  solarTermTimer: null,
  solarTermLoading: false,
  multiInfoTimer: null,
  multiInfoActiveIndex: 0,
  multiInfoRenderKey: '',
  multiInfoTimerKey: '',
  dailyAdviceData: null,
  adviceTimer: null,
  adviceLoading: false,
  weatherLastUpdatedAt: null,
  weatherLoadFailed: false,
  smssLastAliveAt: null,
  statusOverrideTimer: null,
  autoLine4Timer: null,
  autoLine4Attempts: 0,
  autoLine4Triggered: false,
  autoLine4TargetUrl: '',
  pendingLine4ZoomInClicks: 0,
  browserRequestedUrl: '',
  smssLayoutFullscreenState: null
};

const els = {
  toolbar: document.getElementById('toolbar'),
  topHoverZone: document.getElementById('topHoverZone'),
  fullscreenSidebar: document.getElementById('fullscreenSidebar'),
  sidebarLogoImage: document.getElementById('sidebarLogoImage'),
  sidebarStationName: document.getElementById('sidebarStationName'),
  sidebarDate: document.getElementById('sidebarDate'),
  sidebarClock: document.getElementById('sidebarClock'),
  weatherIcon: document.getElementById('weatherIcon'),
  weatherTemp: document.getElementById('weatherTemp'),
  weatherAirQuality: document.getElementById('weatherAirQuality'),
  weatherHigh: document.getElementById('weatherHigh'),
  weatherLow: document.getElementById('weatherLow'),
  weatherFeelsLike: document.getElementById('weatherFeelsLike'),
  weatherSunTime: document.getElementById('weatherSunTime'),
  weatherPrecip: document.getElementById('weatherPrecip'),
  nextTrainWidget: document.getElementById('nextTrainWidget'),
  nextTrainPrimary: document.getElementById('nextTrainPrimary'),
  nextTrainSecondary: document.getElementById('nextTrainSecondary'),
  nextTrainTable: document.getElementById('nextTrainTable'),
  solarTermWidget: document.getElementById('solarTermWidget'),
  solarTermTitle: document.getElementById('solarTermTitle'),
  solarTermPrimary: document.getElementById('solarTermPrimary'),
  solarTermDate: document.getElementById('solarTermDate'),
  solarTermDescription: document.getElementById('solarTermDescription'),
  multiInfoWidget: document.getElementById('multiInfoWidget'),
  multiInfoContent: document.getElementById('multiInfoContent'),
  dailyAdviceWidget: document.getElementById('dailyAdviceWidget'),
  dailyAdviceMessage: document.getElementById('dailyAdviceMessage'),
  dailyAdviceAuthor: document.getElementById('dailyAdviceAuthor'),
  dailyAdviceAuthorName: document.getElementById('dailyAdviceAuthorName'),
  dailyAdviceAuthorProfile: document.getElementById('dailyAdviceAuthorProfile'),
  weatherUpdateStatus: document.getElementById('weatherUpdateStatus'),
  zoomStatus: document.getElementById('zoomStatus'),
  sidebarResizer: document.getElementById('sidebarResizer'),
  splitRoot: document.getElementById('splitRoot'),
  divider: document.getElementById('divider'),

  browserView: document.getElementById('browserView'),
  browserTitleWidget: document.getElementById('browserTitleWidget'),

  mediaStage: document.getElementById('mediaStage'),
  emptyState: document.getElementById('emptyState'),
  slideImage: document.getElementById('slideImage'),
  slideVideo: document.getElementById('slideVideo'),
  slideCaption: document.getElementById('slideCaption'),

  btnWindowMinimize: document.getElementById('btnWindowMinimize'),
  btnWindowMaximize: document.getElementById('btnWindowMaximize'),
  btnWindowClose: document.getElementById('btnWindowClose'),
  btnFullscreen: document.getElementById('btnFullscreen'),
  btnSidebarSettings: document.getElementById('btnSidebarSettings'),
  btnFileManager: document.getElementById('btnFileManager'),
  btnScreenSettings: document.getElementById('btnScreenSettings'),

  filePanel: document.getElementById('filePanel'),
  btnAddFiles: document.getElementById('btnAddFiles'),
  btnCheckMissing: document.getElementById('btnCheckMissing'),
  btnResetAppDefaults: document.getElementById('btnResetAppDefaults'),
  btnCloseFilePanel: document.getElementById('btnCloseFilePanel'),
  playlistTBody: document.querySelector('#playlistTable tbody'),

  sidebarPanel: document.getElementById('sidebarPanel'),
  selectTrainStation: document.getElementById('selectTrainStation'),
  selectTrainDirection: document.getElementById('selectTrainDirection'),
  selectTimetableDisplayFormat: document.getElementById('selectTimetableDisplayFormat'),
  btnRefreshTimetable: document.getElementById('btnRefreshTimetable'),
  timetableLastUpdated: document.getElementById('timetableLastUpdated'),
  timetableErrorLog: document.getElementById('timetableErrorLog'),
  btnSaveSidebarSettings: document.getElementById('btnSaveSidebarSettings'),
  btnResetSidebarDefaults: document.getElementById('btnResetSidebarDefaults'),
  btnCloseSidebarPanel: document.getElementById('btnCloseSidebarPanel'),
  inputLogoPath: null,
  btnPickLogoFile: null,
  checkMultiSolarTerm: null,
  checkMultiDailyAdvice: null,
  selectMultiTransition: null,
  inputMultiInterval: null,
  sidebarWidgetOrderList: null,
  sidebarWidgetCheckboxes: new Map(),

  settingsPanel: document.getElementById('settingsPanel'),
  inputUrl: document.getElementById('inputUrl'),
  inputZoomPercent: document.getElementById('inputZoomPercent'),
  checkBlockPopups: document.getElementById('checkBlockPopups'),
  popupModeDetail: document.getElementById('popupModeDetail'),
  selectPopupMode: document.getElementById('selectPopupMode'),
  selectSplitRatio: document.getElementById('selectSplitRatio'),
  selectTransition: document.getElementById('selectTransition'),
  checkSwap: document.getElementById('checkSwap'),
  checkAlwaysOnTop: document.getElementById('checkAlwaysOnTop'),
  checkPreventMin: document.getElementById('checkPreventMin'),
  inputSidebarWidth: document.getElementById('inputSidebarWidth'),
  btnSaveSettings: document.getElementById('btnSaveSettings'),
  btnCancelSettings: document.getElementById('btnCancelSettings'),
  btnResetDefaults: document.getElementById('btnResetDefaults'),
  btnCloseSettings: document.getElementById('btnCloseSettings')
};

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function normalizeForSave(config) {
  const clone = deepClone(config);
  delete clone.header;
  const playerConfig = clone.player || {};
  clone.browser = {
    url: normalizeUrl(clone.browser?.url),
    popupMode: ['block', 'allow', 'current'].includes(clone.browser?.popupMode) ? clone.browser.popupMode : defaultConfig.browser.popupMode,
    zoomPercent: normalizeZoomPercent(clone.browser?.zoomPercent)
  };
  clone.layout = {
    ...clone.layout,
    borderEnabled: false
  };
  clone.sidebar = {
    width: clampSidebarWidth(clone.sidebar?.width),
    logoPath: normalizeLogoPath(clone.sidebar?.logoPath),
    widgetDefaultsVersion: SIDEBAR_WIDGET_DEFAULTS_VERSION,
    widgets: normalizeSidebarWidgets(clone.sidebar?.widgets),
    multiWidget: normalizeMultiWidgetSettings(clone.sidebar?.multiWidget),
    timetable: normalizeTimetableSettings(clone.sidebar?.timetable)
  };
  clone.player = {
    transition: normalizeTransition(playerConfig.transition),
    playlist: (Array.isArray(playerConfig.playlist) ? playerConfig.playlist : []).map((item) => ({
      path: item.path,
      type: item.type,
      duration: Number(item.duration) > 0 ? Number(item.duration) : 5
    }))
  };
  return clone;
}

function configsEqual(a, b) {
  return JSON.stringify(normalizeForSave(a)) === JSON.stringify(normalizeForSave(b));
}

function getFilename(filePath) {
  if (!filePath) {
    return '';
  }
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] || filePath;
}

function pathToFileUrl(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return encodeURI(`file:///${normalized}`);
}

function getRuntimeBaseFromDefaultLogo() {
  const logoPath = String(defaultConfig.sidebar?.logoPath || '').replace(/\\/g, '/');
  const defaultRelativePath = DEFAULT_LOGO_RELATIVE_PATH.replace(/\\/g, '/');
  if (!logoPath.toLowerCase().endsWith(defaultRelativePath.toLowerCase())) {
    return '';
  }
  return logoPath.slice(0, -defaultRelativePath.length).replace(/[\\/]$/, '');
}

function resolveRuntimeRelativeLogoPath(value) {
  const basePath = getRuntimeBaseFromDefaultLogo();
  if (!basePath) {
    return value;
  }
  const relativePath = String(value || '').replace(/^[\\/]+/, '').replace(/\\/g, '/');
  return `${basePath}/${relativePath}`;
}

function normalizeLogoPath(value) {
  if (typeof value !== 'string') {
    return defaultConfig.sidebar.logoPath;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return defaultConfig.sidebar.logoPath;
  }

  if (/^[\\/](?![\\/])/.test(trimmed)) {
    return resolveRuntimeRelativeLogoPath(trimmed);
  }

  return trimmed;
}

function normalizeTransition(value) {
  return ['none', 'fade', 'slide'].includes(value) ? value : defaultConfig.player.transition;
}

function logoPathToSrc(value) {
  const logoPath = normalizeLogoPath(value);
  if (/^(https?:|data:|blob:|file:)/i.test(logoPath)) {
    return logoPath;
  }

  if (/^[a-zA-Z]:[\\/]/.test(logoPath) || logoPath.startsWith('\\\\')) {
    return pathToFileUrl(logoPath);
  }

  const normalized = logoPath.replace(/\\/g, '/').replace(/^\.\/+/, '');
  if (normalized.startsWith('../') || normalized.startsWith('/')) {
    return normalized;
  }

  if (normalized.startsWith('renderer/')) {
    return normalized.slice('renderer/'.length);
  }

  return `../${normalized}`;
}

function parseRatio(splitRatio) {
  const [l, r] = (splitRatio || '7:3').split(':').map((x) => Number(x));
  if (!l || !r) {
    return [7, 3];
  }
  return [l, r];
}

function normalizeTrainStation(input) {
  const code = String(input?.stationCode || input?.stationId || defaultConfig.sidebar.timetable.stationCode).replace(/^0+/, '');
  return trainStations[code] || trainStations[defaultConfig.sidebar.timetable.stationCode];
}

function normalizeTimetableSettings(input) {
  const station = normalizeTrainStation(input);
  return {
    stationName: station.stationName,
    stationId: station.stationId,
    stationCode: station.stationCode,
    direction: input?.direction === '상행' ? '상행' : '하행',
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

function isSidebarWidgetVisible(widgetId) {
  const widgets = normalizeSidebarWidgets(state.draftConfig?.sidebar?.widgets);
  return widgets.find((widget) => widget.id === widgetId)?.visible !== false;
}

function isSidebarWidgetRuntimeHidden(widgetId) {
  return widgetId === 'weather' && state.weatherLoadFailed;
}

function isSidebarWidgetShown(widgetId) {
  return isSidebarWidgetVisible(widgetId) && !isSidebarWidgetRuntimeHidden(widgetId);
}

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

function isSeoulMetroTrainInfoUrl(rawUrl) {
  try {
    const url = new URL(normalizeUrl(rawUrl));
    const trainInfoUrl = new URL(SEOUL_METRO_TRAIN_INFO_URL);
    return (
      url.protocol === trainInfoUrl.protocol &&
      url.hostname === trainInfoUrl.hostname &&
      url.pathname.replace(/\/$/, '') === trainInfoUrl.pathname.replace(/\/$/, '')
    );
  } catch (_) {
    return false;
  }
}

function isSmssHostUrl(rawUrl) {
  try {
    return new URL(normalizeUrl(rawUrl)).hostname === 'smss.seoulmetro.co.kr';
  } catch (_) {
    return false;
  }
}

function getBrowserViewCurrentUrl() {
  if (!els.browserView) {
    return '';
  }

  try {
    if (typeof els.browserView.getURL === 'function') {
      const url = els.browserView.getURL();
      if (url) {
        return url;
      }
    }
  } catch (_) {
    // Webview URL may be unavailable before initialization.
  }

  return els.browserView.getAttribute('src') || '';
}

function shouldLogSmssLayoutState(extraUrl = '') {
  return [
    extraUrl,
    state.draftConfig?.browser?.url,
    state.browserRequestedUrl,
    getBrowserViewCurrentUrl(),
    els.inputUrl?.value
  ].some(isSmssHostUrl);
}

function getElementLayoutSnapshot(element) {
  if (!element) {
    return null;
  }

  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return {
    display: style.display,
    visibility: style.visibility,
    opacity: style.opacity,
    transform: style.transform,
    className: element.className || '',
    rect: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }
  };
}

function logSmssLayoutState(event, extra = {}) {
  if (!shouldLogSmssLayoutState(extra.url)) {
    return;
  }

  console.log(`[SMSS VIEW] ${JSON.stringify({
    event,
    time: new Date().toISOString(),
    requestedUrl: state.browserRequestedUrl,
    configuredUrl: state.draftConfig?.browser?.url || '',
    webviewUrl: getBrowserViewCurrentUrl(),
    isFullscreen: state.isFullscreen,
    body: getElementLayoutSnapshot(document.body),
    splitRoot: getElementLayoutSnapshot(els.splitRoot),
    panelBrowser: getElementLayoutSnapshot(document.getElementById('panelBrowser')),
    browserView: getElementLayoutSnapshot(els.browserView),
    ...extra
  })}`);
}

function resetAutoLine4Activation(url) {
  clearTimeout(state.autoLine4Timer);
  state.autoLine4Timer = null;
  state.autoLine4Attempts = 0;
  state.autoLine4Triggered = false;
  state.autoLine4TargetUrl = isSeoulMetroTrainInfoUrl(url) ? normalizeUrl(url) : '';
  state.pendingLine4ZoomInClicks = state.autoLine4TargetUrl ? 2 : 0;
}

function getBrowserPopupMode() {
  const mode = state.draftConfig?.browser?.popupMode || defaultConfig.browser.popupMode;
  return ['block', 'allow', 'current'].includes(mode) ? mode : 'block';
}

function syncWebviewPopupPermission() {
  if (!els.browserView) {
    return;
  }

  if (getBrowserPopupMode() === 'block') {
    els.browserView.removeAttribute('allowpopups');
  } else {
    els.browserView.setAttribute('allowpopups', '');
  }
}

function loadBrowserUrlInWebview(rawUrl) {
  const url = normalizeUrl(rawUrl);
  if (!els.browserView) {
    return url;
  }

  logSmssLayoutState('load-url-request', { url });

  const currentUrl = normalizeUrl(
    (typeof els.browserView.getURL === 'function' && els.browserView.getURL())
    || els.browserView.getAttribute('src')
    || 'about:blank'
  );
  if (state.browserRequestedUrl === url || currentUrl === url) {
    state.browserRequestedUrl = url;
    return url;
  }

  state.browserRequestedUrl = url;
  if (typeof els.browserView.loadURL === 'function') {
    try {
      const loadPromise = els.browserView.loadURL(url);
      if (loadPromise && typeof loadPromise.catch === 'function') {
        loadPromise.catch((err) => {
          if (err?.code !== 'ERR_ABORTED') {
            console.warn('Webview load failed:', err);
          }
        });
      }
      return url;
    } catch (_) {
      // Some Electron versions expose loadURL only after webview initialization.
    }
  }
  if (els.browserView.getAttribute('src') !== url) {
    els.browserView.setAttribute('src', url);
  }
  return url;
}

function suppressInPagePopups() {
  if (!els.browserView || getBrowserPopupMode() !== 'block' || typeof els.browserView.executeJavaScript !== 'function') {
    return;
  }

  const script = `
    (() => {
      const host = location.hostname || '';
      if (!/(^|\\.)seoulmetro\\.co\\.kr$/i.test(host)) return;

      const selectors = [
        '[id*="popup" i]',
        '[class*="popup" i]',
        '[id*="pop" i]',
        '[class*="pop" i]',
        '[id*="modal" i]',
        '[class*="modal" i]',
        '[id*="layer" i]',
        '[class*="layer" i]',
        '[id*="notice" i]',
        '[class*="notice" i]'
      ];

      const shouldHide = (el) => {
        if (!el || el === document.body || el === document.documentElement) return false;
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const name = String(el.id || '') + ' ' + String(el.className || '');
        const looksLikePopup = /(pop|popup|modal|layer|notice)/i.test(name);
        const zIndex = Number.parseInt(style.zIndex, 10) || 0;
        const overlaysPage = style.position === 'fixed' || style.position === 'absolute' || zIndex >= 10;
        return looksLikePopup && overlaysPage && rect.width >= 80 && rect.height >= 40;
      };

      const hidePopups = () => {
        document.querySelectorAll(selectors.join(',')).forEach((el) => {
          if (shouldHide(el)) {
            el.style.setProperty('display', 'none', 'important');
            el.style.setProperty('visibility', 'hidden', 'important');
          }
        });
        document.body?.classList.remove('modal-open');
        document.documentElement?.classList.remove('modal-open');
      };

      if (!window.__dashboardPopupSuppressorInstalled) {
        window.__dashboardPopupSuppressorInstalled = true;
        window.__dashboardHidePopups = hidePopups;
        new MutationObserver(() => window.__dashboardHidePopups?.()).observe(document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true
        });
      }

      window.__dashboardHidePopups?.();
    })();
  `;

  els.browserView.executeJavaScript(script, false).catch(() => {});
}

function ratioFromPercent(leftPercent) {
  const clamped = Math.min(90, Math.max(10, leftPercent));
  let left = Math.round(clamped / 10);
  let right = 10 - left;
  if (left < 1) {
    left = 1;
    right = 9;
  }
  if (right < 1) {
    left = 9;
    right = 1;
  }
  return `${left}:${right}`;
}

function getPlayableIndex(startIndex) {
  const list = state.draftConfig.player.playlist;
  if (!list.length) {
    return -1;
  }

  for (let offset = 0; offset < list.length; offset += 1) {
    const idx = (startIndex + offset) % list.length;
    const item = list[idx];
    if (!item.missing) {
      return idx;
    }
  }
  return -1;
}

function clearSlideTimer() {
  if (state.slideTimer) {
    clearTimeout(state.slideTimer);
    state.slideTimer = null;
  }
}

function getSlideKey(item) {
  return item ? `${item.type}:${item.path}` : '';
}

function applyTransitionClass(element) {
  element.classList.remove('anim-fade', 'anim-slide');
  if (state.draftConfig.player.transition === 'fade') {
    // Reflow forces animation retrigger on repeated same element display.
    void element.offsetWidth;
    element.classList.add('anim-fade');
  }
  if (state.draftConfig.player.transition === 'slide') {
    void element.offsetWidth;
    element.classList.add('anim-slide');
  }
}

function hideMediaElements() {
  els.slideImage.classList.remove('active');
  els.slideVideo.classList.remove('active');
  els.slideVideo.pause();
  els.slideVideo.removeAttribute('src');
  els.slideVideo.load();
  state.activeSlideKey = '';
}

function showEmptyState() {
  hideMediaElements();
  els.emptyState.style.display = 'block';
  els.slideCaption.textContent = '재생 가능한 파일이 없습니다.';
}

function scheduleNext(ms) {
  clearSlideTimer();
  state.slideTimer = setTimeout(() => {
    nextSlide();
  }, ms);
}

function showSlide(index, options = {}) {
  const { force = false } = options;
  const list = state.draftConfig.player.playlist;
  if (!list.length) {
    showEmptyState();
    return;
  }

  const playableIndex = getPlayableIndex(index);
  if (playableIndex < 0) {
    showEmptyState();
    return;
  }

  state.currentIndex = playableIndex;
  const item = list[playableIndex];
  const slideKey = getSlideKey(item);
  const alreadyActive = state.activeSlideKey === slideKey
    && ((item.type === 'image' && els.slideImage.classList.contains('active'))
      || (item.type === 'video' && els.slideVideo.classList.contains('active')));

  if (!force && alreadyActive) {
    els.slideCaption.textContent = `${getFilename(item.path)} (${item.type})`;
    if (item.type === 'image' && !state.isPaused && !state.slideTimer) {
      const durationMs = Math.max(1, Number(item.duration) || 5) * 1000;
      scheduleNext(durationMs);
    }
    if (item.type === 'video' && !state.isPaused && els.slideVideo.paused) {
      els.slideVideo.play().catch(() => {
        nextSlide();
      });
    }
    return;
  }

  hideMediaElements();
  els.emptyState.style.display = 'none';
  els.slideCaption.textContent = `${getFilename(item.path)} (${item.type})`;

  if (item.type === 'image') {
    els.slideImage.src = pathToFileUrl(item.path);
    els.slideImage.classList.add('active');
    state.activeSlideKey = slideKey;
    applyTransitionClass(els.slideImage);

    if (!state.isPaused) {
      const durationMs = Math.max(1, Number(item.duration) || 5) * 1000;
      scheduleNext(durationMs);
    }
    return;
  }

  els.slideVideo.src = pathToFileUrl(item.path);
  els.slideVideo.classList.add('active');
  state.activeSlideKey = slideKey;
  applyTransitionClass(els.slideVideo);

  els.slideVideo.onended = () => {
    if (state.isPaused) {
      return;
    }
    nextSlide();
  };

  els.slideVideo.play().catch(() => {
    // Invalid or unsupported file: skip immediately.
    nextSlide();
  });
}

function nextSlide() {
  clearSlideTimer();
  const list = state.draftConfig.player.playlist;
  if (!list.length) {
    showEmptyState();
    return;
  }
  const nextIndex = (state.currentIndex + 1) % list.length;
  showSlide(nextIndex, { force: true });
}

async function refreshMissingFlags() {
  const list = state.draftConfig.player.playlist;
  if (!list.length) {
    renderPlaylist();
    showSlide(0);
    await syncDraftState();
    return;
  }

  const validation = await window.desktopAPI.validateMediaPaths(list.map((item) => item.path));
  const map = new Map(validation.map((v) => [v.path, v.exists]));

  state.draftConfig.player.playlist = list.map((item) => ({
    ...item,
    missing: !map.get(item.path)
  }));

  renderPlaylist();
  showSlide(state.currentIndex);
  await syncDraftState();
}

function applySplitByRatio(splitRatio) {
  const [left, right] = parseRatio(splitRatio);
  els.splitRoot.style.gridTemplateColumns = `${left}fr 8px ${right}fr`;
}

function applyLayout() {
  applySplitByRatio(state.draftConfig.layout.splitRatio);
  state.draftConfig.layout.borderEnabled = false;
  els.splitRoot.classList.remove('bordered');
  els.splitRoot.classList.toggle('swapped', !!state.draftConfig.layout.panelSwapped);
}

function normalizeZoomPercent(value) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) {
    return defaultConfig.browser.zoomPercent;
  }
  return Math.min(300, Math.max(25, numeric));
}

function applyBrowserSettings() {
  const normalized = normalizeUrl(state.draftConfig.browser.url);
  state.draftConfig.browser.url = normalized;
  resetAutoLine4Activation(normalized);
  syncWebviewPopupPermission();
  loadBrowserUrlInWebview(normalized);
  applyBrowserZoom();
  suppressInPagePopups();
}

function applyBrowserZoom() {
  const zoomPercent = normalizeZoomPercent(state.draftConfig?.browser?.zoomPercent);
  setBrowserZoomPercent(zoomPercent, { applyToWebview: true, syncDraft: false });
}

async function setBrowserZoomPercent(value, options = {}) {
  const { applyToWebview = false, syncDraft = false } = options;
  const zoomPercent = normalizeZoomPercent(value);
  state.draftConfig.browser = {
    ...state.draftConfig.browser,
    zoomPercent
  };
  if (els.zoomStatus) {
    els.zoomStatus.textContent = `${zoomPercent}%`;
  }
  if (els.inputZoomPercent) {
    els.inputZoomPercent.value = zoomPercent;
  }

  if (applyToWebview && els.browserView && typeof els.browserView.setZoomFactor === 'function') {
    try {
      els.browserView.setZoomFactor(zoomPercent / 100);
    } catch (_) {
      // Webview may not be ready yet.
    }
  }
  markUserActive();
  if (syncDraft) {
    await syncDraftState();
  }
}

async function activateLine4InBrowser() {
  if (!els.browserView || typeof els.browserView.executeJavaScript !== 'function') {
    return false;
  }

  const script = `
    (() => {
      const line4 = document.querySelector('.line4');
      if (line4) {
        line4.click();
        return 'clicked';
      }

      if (typeof window.lineChange === 'function') {
        window.lineChange('4');
        return 'called';
      }

      return 'missing';
    })();
  `;

  try {
    const result = await els.browserView.executeJavaScript(script, false);
    return result === 'clicked' || result === 'called';
  } catch (_) {
    return false;
  }
}

async function clickSmssZoomIn(times = 2) {
  if (!els.browserView || typeof els.browserView.executeJavaScript !== 'function') {
    return false;
  }

  const clickCount = Math.min(5, Math.max(0, Number.parseInt(times, 10) || 0));
  if (!clickCount) {
    return true;
  }

  const script = `
    (() => new Promise((resolve) => {
      const clickZoom = (attempt = 0) => {
        const zoomIn = document.querySelector('#zoomIn');
        if (!zoomIn) {
          if (attempt < 12) {
            setTimeout(() => clickZoom(attempt + 1), 150);
            return;
          }
          resolve('missing');
          return;
        }

        let count = 0;
        const clickOnce = () => {
          if (typeof zoomIn.click === 'function') {
            zoomIn.click();
          } else {
            zoomIn.dispatchEvent(new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window
            }));
          }
          count += 1;
          if (count >= ${clickCount}) {
            resolve('clicked');
            return;
          }
          setTimeout(clickOnce, 180);
        };

        clickOnce();
      };

      clickZoom();
    }))();
  `;

  try {
    const result = await els.browserView.executeJavaScript(script, false);
    return result === 'clicked';
  } catch (_) {
    return false;
  }
}

function getLine4RefreshTargetUrl() {
  const configuredUrl = normalizeUrl(state.draftConfig?.browser?.url || SEOUL_METRO_TRAIN_INFO_URL);
  if (isSeoulMetroTrainInfoUrl(configuredUrl)) {
    return configuredUrl;
  }

  const currentUrl = normalizeUrl(getBrowserViewCurrentUrl() || '');
  if (isSeoulMetroTrainInfoUrl(currentUrl)) {
    return currentUrl;
  }

  return SEOUL_METRO_TRAIN_INFO_URL;
}

async function refreshBrowserAndActivateLine4() {
  if (!els.browserView) {
    return false;
  }

  const targetUrl = getLine4RefreshTargetUrl();
  resetAutoLine4Activation(targetUrl);
  state.browserRequestedUrl = targetUrl;
  logSmssLayoutState('manual-refresh-line4-request', { url: targetUrl });

  const currentUrl = normalizeUrl(getBrowserViewCurrentUrl() || 'about:blank');

  try {
    if (currentUrl !== targetUrl) {
      if (typeof els.browserView.loadURL === 'function') {
        const loadPromise = els.browserView.loadURL(targetUrl);
        if (loadPromise && typeof loadPromise.catch === 'function') {
          loadPromise.catch((err) => {
            if (err?.code !== 'ERR_ABORTED') {
              console.warn('Webview refresh failed:', err);
            }
          });
        }
        return true;
      }

      els.browserView.setAttribute('src', targetUrl);
      return true;
    }

    if (typeof els.browserView.reloadIgnoringCache === 'function') {
      els.browserView.reloadIgnoringCache();
      return true;
    }

    if (typeof els.browserView.reload === 'function') {
      els.browserView.reload();
      return true;
    }

    if (typeof els.browserView.loadURL === 'function') {
      const loadPromise = els.browserView.loadURL(targetUrl);
      if (loadPromise && typeof loadPromise.catch === 'function') {
        loadPromise.catch((err) => {
          if (err?.code !== 'ERR_ABORTED') {
            console.warn('Webview refresh failed:', err);
          }
        });
      }
      return true;
    }

    els.browserView.setAttribute('src', targetUrl);
    return true;
  } catch (err) {
    console.warn('Webview refresh failed:', err);
    return false;
  }
}

function scheduleAutoActivateLine4(delay = 700) {
  if (!state.autoLine4TargetUrl || state.autoLine4Triggered) {
    return;
  }

  clearTimeout(state.autoLine4Timer);
  state.autoLine4Timer = setTimeout(async () => {
    if (!state.autoLine4TargetUrl || state.autoLine4Triggered) {
      return;
    }

    state.autoLine4Attempts += 1;
    const activated = await activateLine4InBrowser();
    if (activated) {
      const zoomInClicks = state.pendingLine4ZoomInClicks;
      state.pendingLine4ZoomInClicks = 0;
      if (zoomInClicks > 0) {
        await clickSmssZoomIn(zoomInClicks);
      }
      state.autoLine4Triggered = true;
      clearTimeout(state.autoLine4Timer);
      state.autoLine4Timer = null;
      return;
    }

    if (state.autoLine4Attempts < 8) {
      scheduleAutoActivateLine4(650);
    }
  }, delay);
}

function applySidebarWidth(width) {
  const safeWidth = clampSidebarWidth(width);
  state.draftConfig.sidebar = {
    ...(state.draftConfig.sidebar || {}),
    width: safeWidth
  };
  document.documentElement.style.setProperty('--sidebar-width', `${safeWidth}px`);
  if (els.inputSidebarWidth) {
    els.inputSidebarWidth.value = safeWidth;
  }
}

function applySidebarLogo() {
  if (!els.sidebarLogoImage) {
    return;
  }

  const logoPath = normalizeLogoPath(state.draftConfig?.sidebar?.logoPath);
  const logoSrc = logoPathToSrc(logoPath);
  els.sidebarLogoImage.style.display = '';
  els.sidebarLogoImage.src = logoSrc;
  if (els.inputLogoPath) {
    els.inputLogoPath.value = logoPath;
  }
}

function updatePopupModeVisibility() {
  const blockPopups = els.checkBlockPopups ? els.checkBlockPopups.checked : state.draftConfig?.browser?.popupMode === 'block';
  els.popupModeDetail?.classList.toggle('hidden', blockPopups);
  if (els.selectPopupMode) {
    els.selectPopupMode.disabled = blockPopups;
  }
}

function getSidebarWidgetElement(widgetId) {
  return els.fullscreenSidebar?.querySelector(`[data-sidebar-widget="${widgetId}"]`) || null;
}

function ensureSidebarWidgetStructure() {
  if (!els.fullscreenSidebar) {
    return;
  }

  const logo = els.fullscreenSidebar.querySelector('.sidebar-logo-slot');
  if (logo) {
    logo.id = 'sidebarLogoWidget';
    logo.dataset.sidebarWidget = 'logo';
  }

  const timeCard = els.sidebarDate?.closest('.sidebar-time-card');
  if (timeCard) {
    timeCard.id = 'datetimeWidget';
    timeCard.dataset.sidebarWidget = 'datetime';
  }

  if (els.nextTrainWidget) {
    els.nextTrainWidget.dataset.sidebarWidget = 'trainSchedule';
  }

  if (els.solarTermWidget) {
    els.solarTermWidget.dataset.sidebarWidget = 'solarTerm';
  }

  if (els.multiInfoWidget) {
    els.multiInfoWidget.dataset.sidebarWidget = 'multiInfo';
  }

  if (els.dailyAdviceWidget) {
    els.dailyAdviceWidget.dataset.sidebarWidget = 'dailyAdvice';
  }

  const weatherCard = els.fullscreenSidebar.querySelector('.weather-main-card');
  if (weatherCard) {
    weatherCard.id = 'weatherWidget';
    weatherCard.dataset.sidebarWidget = 'weather';
  }

  if (els.sidebarStationName && !document.getElementById('stationWidget')) {
    const stationWidget = document.createElement('div');
    stationWidget.id = 'stationWidget';
    stationWidget.className = 'sidebar-widget sidebar-station-card';
    stationWidget.dataset.sidebarWidget = 'station';
    stationWidget.append(els.sidebarStationName);
    if (timeCard) {
      els.fullscreenSidebar.insertBefore(stationWidget, timeCard);
    } else {
      els.fullscreenSidebar.append(stationWidget);
    }
  }
}

function applySidebarWidgets() {
  if (!els.fullscreenSidebar) {
    return;
  }

  ensureSidebarWidgetStructure();
  if (!state.draftConfig) {
    return;
  }
  const widgets = normalizeSidebarWidgets(state.draftConfig?.sidebar?.widgets);
  state.draftConfig.sidebar = {
    ...(state.draftConfig.sidebar || {}),
    widgets
  };

  const resizer = els.sidebarResizer;
  widgets.forEach((widget) => {
    const element = getSidebarWidgetElement(widget.id);
    if (!element) {
      return;
    }
    element.classList.toggle('widget-disabled', widget.visible === false);
    element.classList.toggle('widget-runtime-hidden', isSidebarWidgetRuntimeHidden(widget.id));
    els.fullscreenSidebar.insertBefore(element, resizer || null);
  });

  if (resizer) {
    els.fullscreenSidebar.append(resizer);
  }
}

function createSidebarWidgetCheckbox(widgetId, text) {
  const label = document.createElement('label');
  label.className = 'checkbox-row';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.dataset.sidebarWidgetCheckbox = widgetId;

  const span = document.createElement('span');
  span.textContent = text;

  label.append(checkbox, span);
  els.sidebarWidgetCheckboxes.set(widgetId, checkbox);
  return label;
}

function createSettingsSection(titleText) {
  const section = document.createElement('section');
  section.className = 'settings-section';
  const title = document.createElement('h3');
  title.textContent = titleText;
  section.append(title);
  return section;
}

function wrapWidgetOptions(section, widgetId) {
  if (!section || section.querySelector(`[data-widget-options="${widgetId}"]`)) {
    return null;
  }

  const options = document.createElement('div');
  options.className = 'widget-options';
  options.dataset.widgetOptions = widgetId;

  [...section.children]
    .filter((child) => child.tagName !== 'H3' && !child.classList.contains('checkbox-row'))
    .forEach((child) => options.append(child));

  section.append(options);
  return options;
}

function updateSidebarOptionVisibility() {
  if (!els.sidebarPanel) {
    return;
  }

  els.sidebarPanel.querySelectorAll('[data-widget-options]').forEach((options) => {
    const widgetId = options.dataset.widgetOptions;
    const checkbox = els.sidebarWidgetCheckboxes.get(widgetId);
    options.classList.toggle('hidden', !!checkbox && !checkbox.checked);
  });
}

function setupSidebarSettingsPanel() {
  if (!els.sidebarPanel || els.sidebarPanel.dataset.widgetSettingsReady === 'true') {
    return;
  }

  const title = els.sidebarPanel.querySelector('h2');
  const firstSection = els.sidebarPanel.querySelector('.settings-section');

  const orderSection = createSettingsSection('위젯 순서');
  const orderList = document.createElement('div');
  orderList.id = 'sidebarWidgetOrderList';
  orderList.className = 'sidebar-widget-order-list';
  orderSection.append(orderList);
  const orderHint = document.createElement('p');
  orderHint.className = 'hint';
  orderHint.textContent = '왼쪽 핸들을 드래그하여 좌측 바 위젯 순서를 변경할 수 있습니다.';
  orderSection.append(orderHint);
  els.sidebarWidgetOrderList = orderList;

  const basicSection = createSettingsSection('기본 정보 설정');
  const basicGrid = document.createElement('div');
  basicGrid.className = 'form-grid';
  basicGrid.append(
    createSidebarWidgetCheckbox('logo', '로고 표시'),
    createSidebarWidgetCheckbox('station', '현재 역명 표시'),
  );
  const logoLabel = document.createElement('label');
  logoLabel.className = 'wide-field';
  logoLabel.textContent = '로고 파일 경로';
  const logoPathRow = document.createElement('div');
  logoPathRow.className = 'inline-input-row';
  const logoPathInput = document.createElement('input');
  logoPathInput.id = 'inputLogoPath';
  logoPathInput.type = 'text';
  logoPathInput.placeholder = '\\files\\logos\\ncuc_logo.png';
  const logoPickButton = document.createElement('button');
  logoPickButton.id = 'btnPickLogoFile';
  logoPickButton.type = 'button';
  logoPickButton.textContent = '찾기';
  logoPathRow.append(logoPathInput, logoPickButton);
  logoLabel.append(logoPathRow);
  basicGrid.append(logoLabel);
  els.inputLogoPath = logoPathInput;
  els.btnPickLogoFile = logoPickButton;
  const stationLabel = els.selectTrainStation?.closest('label');
  if (stationLabel) {
    basicGrid.append(stationLabel);
  }
  const widthLabel = els.inputSidebarWidth?.closest('label');
  if (widthLabel) {
    basicGrid.append(widthLabel);
  }
  basicSection.append(basicGrid);

  const datetimeSection = createSettingsSection('날짜/시간 설정');
  datetimeSection.append(createSidebarWidgetCheckbox('datetime', '날짜/시간 위젯 표시'));

  const multiSection = createSettingsSection('멀티 위젯 설정');
  multiSection.append(createSidebarWidgetCheckbox('multiInfo', '멀티 위젯 표시'));
  const multiOptions = document.createElement('div');
  multiOptions.className = 'widget-options';
  multiOptions.dataset.widgetOptions = 'multiInfo';
  const multiGrid = document.createElement('div');
  multiGrid.className = 'form-grid';
  const multiSolarLabel = document.createElement('label');
  multiSolarLabel.className = 'checkbox-row';
  const multiSolarCheckbox = document.createElement('input');
  multiSolarCheckbox.id = 'checkMultiSolarTerm';
  multiSolarCheckbox.type = 'checkbox';
  multiSolarLabel.append(multiSolarCheckbox, document.createElement('span'));
  multiSolarLabel.querySelector('span').textContent = '24절기 포함';
  const multiAdviceLabel = document.createElement('label');
  multiAdviceLabel.className = 'checkbox-row';
  const multiAdviceCheckbox = document.createElement('input');
  multiAdviceCheckbox.id = 'checkMultiDailyAdvice';
  multiAdviceCheckbox.type = 'checkbox';
  multiAdviceLabel.append(multiAdviceCheckbox, document.createElement('span'));
  multiAdviceLabel.querySelector('span').textContent = '오늘의 한마디 포함';
  const multiTransitionLabel = document.createElement('label');
  multiTransitionLabel.textContent = '전환 효과';
  const multiTransitionSelect = document.createElement('select');
  multiTransitionSelect.id = 'selectMultiTransition';
  [
    ['fade', 'Fade'],
    ['slide', 'Slide'],
    ['none', 'None']
  ].forEach(([value, text]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    multiTransitionSelect.append(option);
  });
  multiTransitionLabel.append(multiTransitionSelect);
  const multiIntervalLabel = document.createElement('label');
  multiIntervalLabel.textContent = '순환 시간(초)';
  const multiIntervalInput = document.createElement('input');
  multiIntervalInput.id = 'inputMultiInterval';
  multiIntervalInput.type = 'number';
  multiIntervalInput.min = '5';
  multiIntervalInput.max = '60';
  multiIntervalInput.step = '1';
  multiIntervalLabel.append(multiIntervalInput);
  multiGrid.append(multiSolarLabel, multiAdviceLabel, multiTransitionLabel, multiIntervalLabel);
  const multiNote = document.createElement('p');
  multiNote.className = 'settings-note';
  multiNote.textContent = '24절기와 오늘의 한마디를 한 칸에서 번갈아 표시합니다.';
  multiOptions.append(multiGrid, multiNote);
  multiSection.append(multiOptions);
  els.checkMultiSolarTerm = multiSolarCheckbox;
  els.checkMultiDailyAdvice = multiAdviceCheckbox;
  els.selectMultiTransition = multiTransitionSelect;
  els.inputMultiInterval = multiIntervalInput;

  const solarTermSection = createSettingsSection('24절기 설정');
  solarTermSection.append(createSidebarWidgetCheckbox('solarTerm', '24절기 위젯 표시'));
  const solarTermNote = document.createElement('p');
  solarTermNote.className = 'settings-note';
  solarTermNote.textContent = '오늘 또는 다음 24절기를 로컬 캐시 기준으로 표시합니다.';
  solarTermSection.append(solarTermNote);
  wrapWidgetOptions(solarTermSection, 'solarTerm');

  const dailyAdviceSection = createSettingsSection('오늘의 한마디 설정');
  dailyAdviceSection.append(createSidebarWidgetCheckbox('dailyAdvice', '오늘의 한마디 위젯 표시'));
  const dailyAdviceNote = document.createElement('p');
  dailyAdviceNote.className = 'settings-note';
  dailyAdviceNote.textContent = '오늘의 한마디를 좌측 바에 독립 카드로 표시합니다.';
  dailyAdviceSection.append(dailyAdviceNote);
  wrapWidgetOptions(dailyAdviceSection, 'dailyAdvice');

  if (firstSection) {
    els.sidebarPanel.insertBefore(orderSection, firstSection);
    els.sidebarPanel.insertBefore(basicSection, firstSection);
    els.sidebarPanel.insertBefore(datetimeSection, firstSection);
    els.sidebarPanel.insertBefore(multiSection, firstSection);
    els.sidebarPanel.insertBefore(solarTermSection, firstSection);
    els.sidebarPanel.insertBefore(dailyAdviceSection, firstSection);
  } else if (title) {
    title.after(orderSection, basicSection, datetimeSection, multiSection, solarTermSection, dailyAdviceSection);
  }

  const sections = [...els.sidebarPanel.querySelectorAll('.settings-section')];
  const weatherSection = sections.find((section) => section.querySelector('#weatherSettingsStatus'));
  if (weatherSection && !weatherSection.querySelector('[data-sidebar-widget-checkbox="weather"]')) {
    weatherSection.querySelector('h3')?.after(createSidebarWidgetCheckbox('weather', '날씨 위젯 표시'));
    wrapWidgetOptions(weatherSection, 'weather');
  }
  if (weatherSection && multiSection.parentNode === els.sidebarPanel) {
    els.sidebarPanel.insertBefore(weatherSection, multiSection);
  }

  const trainSection = sections.find((section) => section.querySelector('#selectTimetableDisplayFormat'));
  if (trainSection) {
    const formGrid = trainSection.querySelector('.form-grid');
    const displayFormatLabel = els.selectTimetableDisplayFormat?.closest('label');
    if (formGrid && displayFormatLabel) {
      formGrid.prepend(displayFormatLabel);
    }
    if (!trainSection.querySelector('[data-sidebar-widget-checkbox="trainSchedule"]')) {
      trainSection.querySelector('h3')?.after(createSidebarWidgetCheckbox('trainSchedule', '열차 시간표 위젯 표시'));
    }
    wrapWidgetOptions(trainSection, 'trainSchedule');
  }

  els.sidebarPanel.dataset.widgetSettingsReady = 'true';
}

function collectSidebarWidgetsFromControls() {
  return normalizeSidebarWidgets(state.draftConfig?.sidebar?.widgets).map((widget) => {
    const checkbox = els.sidebarWidgetCheckboxes.get(widget.id);
    return {
      ...widget,
      visible: checkbox ? checkbox.checked : widget.visible !== false
    };
  });
}

function collectMultiWidgetSettingsFromControls() {
  const enabledItems = [];
  if (els.checkMultiSolarTerm?.checked) {
    enabledItems.push('solarTerm');
  }
  if (els.checkMultiDailyAdvice?.checked) {
    enabledItems.push('dailyAdvice');
  }

  return normalizeMultiWidgetSettings({
    enabledItems,
    transition: els.selectMultiTransition?.value,
    intervalSeconds: els.inputMultiInterval?.value
  });
}

function renderSidebarWidgetControls() {
  const widgets = normalizeSidebarWidgets(state.draftConfig?.sidebar?.widgets);
  widgets.forEach((widget) => {
    const checkbox = els.sidebarWidgetCheckboxes.get(widget.id);
    if (checkbox) {
      checkbox.checked = widget.visible !== false;
    }
  });
  updateSidebarOptionVisibility();

  if (!els.sidebarWidgetOrderList) {
    return;
  }

  els.sidebarWidgetOrderList.innerHTML = '';
  widgets
    .map((widget, index) => ({ widget, index }))
    .filter(({ widget }) => widget.visible !== false && !isSidebarWidgetRuntimeHidden(widget.id))
    .forEach(({ widget, index }) => {
    const item = document.createElement('div');
    item.className = 'sidebar-widget-order-item';
    item.draggable = true;
    item.dataset.index = String(index);
    item.innerHTML = `
      <span class="drag-handle" aria-hidden="true">≡</span>
      <span class="sidebar-widget-order-name">${widget.label}</span>
    `;

    item.addEventListener('dragstart', () => {
      state.sidebarWidgetDragIndex = Number(item.dataset.index);
      item.classList.add('dragging');
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      state.sidebarWidgetDragIndex = null;
    });

    item.addEventListener('dragover', (event) => {
      event.preventDefault();
    });

    item.addEventListener('drop', (event) => {
      event.preventDefault();
      const fromIndex = state.sidebarWidgetDragIndex;
      const toIndex = Number(item.dataset.index);
      if (!Number.isInteger(fromIndex) || fromIndex === toIndex) {
        return;
      }
      const list = normalizeSidebarWidgets(state.draftConfig.sidebar?.widgets);
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      state.draftConfig.sidebar = {
        ...(state.draftConfig.sidebar || {}),
        widgets: list
      };
      applySidebarWidgets();
      renderSidebarWidgetControls();
      updateSidebarOptionVisibility();
      syncDraftState().catch(() => {});
    });

    els.sidebarWidgetOrderList.append(item);
  });
}

function applySettingsToForm() {
  els.inputUrl.value = state.draftConfig.browser.url;
  if (els.inputZoomPercent) {
    els.inputZoomPercent.value = normalizeZoomPercent(state.draftConfig.browser.zoomPercent);
  }
  const popupMode = state.draftConfig.browser.popupMode || defaultConfig.browser.popupMode;
  if (els.checkBlockPopups) {
    els.checkBlockPopups.checked = popupMode === 'block';
  }
  if (els.selectPopupMode) {
    els.selectPopupMode.value = popupMode === 'current' ? 'current' : 'allow';
  }
  updatePopupModeVisibility();
  els.selectSplitRatio.value = state.draftConfig.layout.splitRatio;
  els.selectTransition.value = state.draftConfig.player.transition;
  els.checkSwap.checked = !!state.draftConfig.layout.panelSwapped;
  els.checkAlwaysOnTop.checked = !!state.draftConfig.window.alwaysOnTop;
  els.checkPreventMin.checked = !!state.draftConfig.window.preventMinimize;
  if (els.inputSidebarWidth) {
    els.inputSidebarWidth.value = clampSidebarWidth(state.draftConfig.sidebar?.width);
  }
  if (els.inputLogoPath) {
    els.inputLogoPath.value = normalizeLogoPath(state.draftConfig.sidebar?.logoPath);
  }
  const multiWidgetSettings = normalizeMultiWidgetSettings(state.draftConfig.sidebar?.multiWidget);
  if (els.checkMultiSolarTerm) {
    els.checkMultiSolarTerm.checked = multiWidgetSettings.enabledItems.includes('solarTerm');
  }
  if (els.checkMultiDailyAdvice) {
    els.checkMultiDailyAdvice.checked = multiWidgetSettings.enabledItems.includes('dailyAdvice');
  }
  if (els.selectMultiTransition) {
    els.selectMultiTransition.value = multiWidgetSettings.transition;
  }
  if (els.inputMultiInterval) {
    els.inputMultiInterval.value = multiWidgetSettings.intervalSeconds;
  }
  const timetableSettings = normalizeTimetableSettings(state.draftConfig.sidebar?.timetable);
  if (els.selectTrainStation) {
    els.selectTrainStation.value = timetableSettings.stationCode;
  }
  if (els.selectTrainDirection) {
    els.selectTrainDirection.value = timetableSettings.direction;
  }
  if (els.selectTimetableDisplayFormat) {
    els.selectTimetableDisplayFormat.value = timetableSettings.displayFormat;
  }
  renderSidebarWidgetControls();
  applySidebarLogo();
  applySidebarWidgets();
  updateStationDisplayName();
  renderTimetableSettingsStatus();

}

function clampSidebarWidth(width) {
  const numeric = Number.parseFloat(width);
  if (!Number.isFinite(numeric)) {
    return defaultConfig.sidebar.width;
  }
  return Math.min(420, Math.max(220, Math.round(numeric)));
}

function setPanelVisible(panelEl, visible) {
  panelEl.classList.toggle('hidden', !visible);
  updateToolbarVisibility();
  markUserActive();
}

function toggleExclusivePanel(panelEl) {
  const shouldOpen = panelEl.classList.contains('hidden');
  [els.sidebarPanel, els.filePanel, els.settingsPanel].forEach((panel) => {
    if (!panel) {
      return;
    }
    panel.classList.toggle('hidden', !(shouldOpen && panel === panelEl));
  });
  updateToolbarVisibility();
  markUserActive();
}

function makeLifeIcon(path) {
  const icon = document.createElement('span');
  icon.className = 'weather-mini-icon life-info-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = `<svg viewBox="0 0 24 24">${path}</svg>`;
  return icon;
}

function createLifeInfoRow(label, valueEl, iconPath) {
  const row = document.createElement('div');
  row.className = 'life-info-row';
  const text = document.createElement('div');
  text.className = 'life-info-text';
  const labelEl = document.createElement('span');
  labelEl.className = 'life-info-label';
  labelEl.textContent = label;
  valueEl.classList.add('life-info-value');
  text.append(labelEl, valueEl);
  row.append(makeLifeIcon(iconPath), text);
  return row;
}

function getCurrentStationDisplayName() {
  const settings = normalizeTimetableSettings(state.draftConfig?.sidebar?.timetable);
  return settings.stationName;
}

function getSelectedStationWeatherLocation() {
  const settings = normalizeTimetableSettings(state.draftConfig?.sidebar?.timetable);
  return trainStations[settings.stationCode] || trainStations[defaultConfig.sidebar.timetable.stationCode];
}

function updateStationDisplayName() {
  if (els.sidebarStationName) {
    els.sidebarStationName.textContent = getCurrentStationDisplayName();
  }
}

function setWeatherWidgetLoadFailed(loadFailed) {
  const nextValue = !!loadFailed;
  if (state.weatherLoadFailed === nextValue) {
    return;
  }

  state.weatherLoadFailed = nextValue;
  getSidebarWidgetElement('weather')?.classList.toggle('widget-runtime-hidden', state.weatherLoadFailed);
  renderSidebarWidgetControls();
}

function arrangeSidebarInfoCards() {
  ensureSidebarWidgetStructure();

  if (els.fullscreenSidebar?.dataset.arranged === 'true') {
    applySidebarWidgets();
    return;
  }

  els.fullscreenSidebar?.querySelector('.weather-location-card')?.remove();

  const weatherCard = els.fullscreenSidebar?.querySelector('.weather-main-card');
  if (weatherCard) {
    weatherCard.classList.add('weather-card', 'integrated-weather-card');
    els.weatherFeelsLike?.remove();
    const title = document.createElement('div');
    title.className = 'weather-card-title';
    title.textContent = '날씨';
    weatherCard.append(title);

    const header = document.createElement('div');
    header.className = 'weather-card-main';
    header.append(els.weatherIcon, els.weatherTemp.parentElement);
    weatherCard.append(header);

    const range = document.createElement('div');
    range.className = 'weather-range-row';
    range.append(els.weatherLow, els.weatherHigh);
    weatherCard.append(range);

    const lifeSection = document.createElement('div');
    lifeSection.className = 'weather-life-section';
    lifeSection.append(
      createLifeInfoRow('강수확률', els.weatherPrecip, '<path d="M12 2.5S5 10 5 15a7 7 0 0 0 14 0c0-5-7-12.5-7-12.5Z"/>'),
      createLifeInfoRow('대기질', els.weatherAirQuality, '<path d="M12 22V8"/><path d="m5 12 7-7 7 7"/><path d="M5 19h14"/>'),
      createLifeInfoRow('일몰', els.weatherSunTime, '<path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h20"/><path d="M5 18a7 7 0 0 1 14 0"/>')
    );
    weatherCard.append(lifeSection);
  }

  els.fullscreenSidebar?.querySelector('.weather-duo')?.remove();

  els.fullscreenSidebar?.querySelectorAll('.weather-mini-card').forEach((card) => card.remove());
  if (els.fullscreenSidebar) {
    els.fullscreenSidebar.dataset.arranged = 'true';
  }
  applySidebarWidgets();
  updateStationDisplayName();
}

function openSettingsPanel() {
  setPanelVisible(els.settingsPanel, true);
}

function isAnyPanelOpen() {
  return !els.settingsPanel.classList.contains('hidden')
    || !els.filePanel.classList.contains('hidden')
    || !els.sidebarPanel.classList.contains('hidden');
}

function renderPlaylist() {
  const list = state.draftConfig.player.playlist;
  els.playlistTBody.innerHTML = '';

  list.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.className = 'playlist-row';
    tr.draggable = true;
    tr.dataset.index = String(index);

    const typeText = item.type === 'video' ? '동영상' : '이미지';
    const warnText = item.missing ? '⚠ 누락' : '정상';

    tr.innerHTML = `
      <td class="drag-handle">≡</td>
      <td>${getFilename(item.path)}</td>
      <td>${typeText}</td>
      <td><input class="duration-input" type="number" min="1" value="${Number(item.duration) || 5}" ${item.type === 'video' ? 'disabled' : ''} /></td>
      <td class="${item.missing ? 'warn' : ''}">${warnText}</td>
      <td><button class="delete-btn">🗑</button></td>
    `;

    const durationInput = tr.querySelector('.duration-input');
    durationInput.addEventListener('change', () => {
      const value = Math.max(1, Number(durationInput.value) || 5);
      state.draftConfig.player.playlist[index].duration = value;
      syncDraftState();
    });

    tr.querySelector('.delete-btn').addEventListener('click', () => {
      state.draftConfig.player.playlist.splice(index, 1);
      if (state.currentIndex >= state.draftConfig.player.playlist.length) {
        state.currentIndex = 0;
      }
      renderPlaylist();
      showSlide(state.currentIndex);
      syncDraftState();
    });

    tr.addEventListener('dragstart', () => {
      state.dragIndex = Number(tr.dataset.index);
      tr.classList.add('dragging');
    });

    tr.addEventListener('dragend', () => {
      tr.classList.remove('dragging');
      state.dragIndex = null;
    });

    tr.addEventListener('dragover', (event) => {
      event.preventDefault();
    });

    tr.addEventListener('drop', (event) => {
      event.preventDefault();
      const toIndex = Number(tr.dataset.index);
      const fromIndex = state.dragIndex;
      if (Number.isNaN(fromIndex) || fromIndex === toIndex) {
        return;
      }
      const listRef = state.draftConfig.player.playlist;
      const [moved] = listRef.splice(fromIndex, 1);
      listRef.splice(toIndex, 0, moved);
      renderPlaylist();
      showSlide(state.currentIndex);
      syncDraftState();
    });

    els.playlistTBody.appendChild(tr);
  });
}

async function syncDraftState() {
  const normalized = normalizeForSave(state.draftConfig);
  await window.desktopAPI.updateDraft(normalized);
  const dirty = !configsEqual(state.savedConfig, normalized);
  await window.desktopAPI.setDirty(dirty);
}

async function saveSettingsToDisk() {
  const normalized = normalizeForSave(state.draftConfig);
  const saved = await window.desktopAPI.saveConfig(normalized);
  state.savedConfig = deepClone(saved);
  state.draftConfig = mergeUIState(state.draftConfig, state.savedConfig);
  await window.desktopAPI.setDirty(false);
  applyLayout();
  applySidebarWidth(state.draftConfig.sidebar?.width);
  applySidebarLogo();
  applySidebarWidgets();
  updateStationDisplayName();
  applyBrowserSettings();
  applySettingsToForm();
  renderPlaylist();
  showSlide(state.currentIndex);
  updateBackgroundWidgetTasks();
}

function applyDraftConfigToUI({ firstSlide = false } = {}) {
  applyLayout();
  applySidebarWidth(state.draftConfig.sidebar?.width);
  applySidebarLogo();
  applyBrowserSettings();
  applySettingsToForm();
  updateBackgroundWidgetTasks();
  renderPlaylist();
  showSlide(firstSlide ? 0 : state.currentIndex);
}

function mergeUIState(oldConfig, newConfig) {
  const listWithState = (newConfig.player.playlist || []).map((savedItem) => {
    const existing = (oldConfig.player.playlist || []).find((i) => i.path === savedItem.path && i.type === savedItem.type);
    return {
      ...savedItem,
      missing: existing ? !!existing.missing : false
    };
  });
  const browserConfig = newConfig.browser || {};
  return {
    ...deepClone(newConfig),
    browser: {
      url: normalizeUrl(browserConfig.url || defaultConfig.browser.url),
      popupMode: ['block', 'allow', 'current'].includes(browserConfig.popupMode) ? browserConfig.popupMode : defaultConfig.browser.popupMode,
      zoomPercent: normalizeZoomPercent(browserConfig.zoomPercent)
    },
    layout: {
      ...deepClone(newConfig.layout),
      borderEnabled: false
    },
    sidebar: {
      ...defaultConfig.sidebar,
      ...(newConfig.sidebar || {}),
      width: clampSidebarWidth(newConfig.sidebar?.width),
      logoPath: normalizeLogoPath(newConfig.sidebar?.logoPath),
      widgetDefaultsVersion: SIDEBAR_WIDGET_DEFAULTS_VERSION,
      widgets: normalizeSidebarWidgets(newConfig.sidebar?.widgets),
      multiWidget: normalizeMultiWidgetSettings(newConfig.sidebar?.multiWidget),
      timetable: normalizeTimetableSettings(newConfig.sidebar?.timetable)
    },
    player: {
      transition: normalizeTransition(newConfig.player?.transition),
      playlist: listWithState
    }
  };
}

function bindSettingsForm() {
  const update = async () => {
    const previousUrl = state.draftConfig.browser.url;
    const nextUrl = normalizeUrl(els.inputUrl.value);
    state.draftConfig.browser.url = nextUrl;
    state.draftConfig.browser.zoomPercent = normalizeZoomPercent(els.inputZoomPercent?.value);
    state.draftConfig.browser.popupMode = els.checkBlockPopups?.checked
      ? 'block'
      : (els.selectPopupMode?.value === 'current' ? 'current' : 'allow');
    state.draftConfig.layout.splitRatio = els.selectSplitRatio.value;
    state.draftConfig.layout.borderEnabled = false;
    state.draftConfig.layout.panelSwapped = els.checkSwap.checked;
    state.draftConfig.player.transition = normalizeTransition(els.selectTransition.value);
    state.draftConfig.window.alwaysOnTop = els.checkAlwaysOnTop.checked;
    state.draftConfig.window.preventMinimize = els.checkPreventMin.checked;
    state.draftConfig.sidebar = {
      ...(state.draftConfig.sidebar || {}),
      width: clampSidebarWidth(els.inputSidebarWidth?.value),
      logoPath: normalizeLogoPath(els.inputLogoPath?.value)
    };
    applyLayout();
    applySidebarWidth(state.draftConfig.sidebar.width);
    applySidebarLogo();
    applyBrowserZoom();
    syncWebviewPopupPermission();
    updatePopupModeVisibility();
    if (nextUrl !== previousUrl) {
      applyBrowserSettings();
    } else {
      suppressInPagePopups();
    }

    await window.desktopAPI.setAlwaysOnTop(state.draftConfig.window.alwaysOnTop);
    await window.desktopAPI.setPreventMinimize(state.draftConfig.window.preventMinimize);
    await syncDraftState();
  };

  [
    els.inputUrl,
    els.inputZoomPercent,
    els.checkBlockPopups,
    els.selectPopupMode,
    els.selectSplitRatio,
    els.selectTransition,
    els.checkSwap,
    els.checkAlwaysOnTop,
    els.checkPreventMin,
    els.inputSidebarWidth,
    els.inputLogoPath
  ].forEach((input) => {
    if (!input) return;
    input.addEventListener('change', update);
    input.addEventListener('blur', update);
  });
}

function bindToolbarAndPanels() {
  if (els.browserTitleWidget) {
    els.browserTitleWidget.addEventListener('click', () => {
      refreshBrowserAndActivateLine4();
    });

    els.browserTitleWidget.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      event.preventDefault();
      refreshBrowserAndActivateLine4();
    });
  }

  els.btnFullscreen.addEventListener('click', async () => {
    state.isFullscreen = await window.desktopAPI.toggleFullscreen();
    updateToolbarVisibility();
  });

  els.btnWindowMinimize?.addEventListener('click', () => {
    window.desktopAPI.minimizeWindow?.();
  });

  els.btnWindowMaximize?.addEventListener('click', async () => {
    if (typeof window.desktopAPI.toggleMaximize === 'function') {
      await window.desktopAPI.toggleMaximize();
    }
    state.isFullscreen = await window.desktopAPI.isFullscreen();
    updateToolbarVisibility();
  });

  els.btnWindowClose?.addEventListener('click', () => {
    window.desktopAPI.requestQuit();
  });

  els.btnSidebarSettings.addEventListener('click', () => {
    toggleExclusivePanel(els.sidebarPanel);
    renderTimetableSettingsStatus();
  });

  els.btnFileManager.addEventListener('click', () => {
    toggleExclusivePanel(els.filePanel);
  });

  els.btnScreenSettings.addEventListener('click', () => {
    toggleExclusivePanel(els.settingsPanel);
  });

  els.btnPickLogoFile?.addEventListener('click', async () => {
    const selected = await window.desktopAPI.pickImageFile?.();
    if (!selected) {
      return;
    }
    state.draftConfig.sidebar = {
      ...(state.draftConfig.sidebar || {}),
      logoPath: selected
    };
    if (els.inputLogoPath) {
      els.inputLogoPath.value = selected;
    }
    applySidebarLogo();
    await syncDraftState();
  });

  els.btnCloseFilePanel.addEventListener('click', () => {
    setPanelVisible(els.filePanel, false);
  });

  els.btnCloseSidebarPanel.addEventListener('click', () => {
    setPanelVisible(els.sidebarPanel, false);
  });

  els.btnSaveSidebarSettings.addEventListener('click', async () => {
    await saveSettingsToDisk();
    setPanelVisible(els.sidebarPanel, false);
  });

  els.btnResetSidebarDefaults?.addEventListener('click', async () => {
    const defaultSidebar = deepClone(defaultConfig.sidebar);
    state.draftConfig.sidebar = {
      ...defaultSidebar,
      logoPath: normalizeLogoPath(defaultSidebar.logoPath),
      widgets: normalizeSidebarWidgets(defaultSidebar.widgets),
      multiWidget: normalizeMultiWidgetSettings(defaultSidebar.multiWidget),
      timetable: normalizeTimetableSettings(defaultSidebar.timetable)
    };
    applySidebarWidth(state.draftConfig.sidebar.width);
    applySidebarLogo();
    applySidebarWidgets();
    applySettingsToForm();
    updateBackgroundWidgetTasks({ forceWeather: true });
    renderTimetableSettingsStatus();
    await syncDraftState();
  });

  els.btnRefreshTimetable.addEventListener('click', async () => {
    await refreshTimetableManually();
  });

  els.btnCloseSettings.addEventListener('click', () => {
    setPanelVisible(els.settingsPanel, false);
  });

  els.btnSaveSettings.addEventListener('click', async () => {
    await saveSettingsToDisk();
    setPanelVisible(els.settingsPanel, false);
  });

  els.btnCancelSettings.addEventListener('click', async () => {
    state.draftConfig = mergeUIState(state.draftConfig, deepClone(state.savedConfig));
    applyDraftConfigToUI();
    await syncDraftState();
    setPanelVisible(els.settingsPanel, false);
  });

  els.btnResetDefaults.addEventListener('click', async () => {
    state.draftConfig = mergeUIState(state.draftConfig, deepClone(defaultConfig));
    applyDraftConfigToUI({ firstSlide: true });
    await syncDraftState();
  });

  els.btnResetAppDefaults?.addEventListener('click', async () => {
    const ok = window.confirm('앱 전체 설정을 기본값으로 초기화할까요? 화면 설정, 좌측 바 설정, 재생 목록이 모두 기본값으로 저장됩니다.');
    if (!ok) {
      return;
    }
    state.currentIndex = 0;
    state.draftConfig = mergeUIState(state.draftConfig, deepClone(defaultConfig));
    await saveSettingsToDisk();
  });

  els.btnAddFiles.addEventListener('click', async () => {
    const selected = await window.desktopAPI.pickMediaFiles();
    if (!selected.length) {
      return;
    }

    selected.forEach((filePath) => {
      const ext = filePath.split('.').pop().toLowerCase();
      const isVideo = ['mp4', 'webm'].includes(ext);
      const item = {
        path: filePath,
        type: isVideo ? 'video' : 'image',
        duration: isVideo ? 30 : 5,
        missing: false
      };
      state.draftConfig.player.playlist.push(item);
    });

    renderPlaylist();
    await refreshMissingFlags();
  });

  els.btnCheckMissing.addEventListener('click', async () => {
    await refreshMissingFlags();
  });
}

function bindDividerDrag() {
  let dragging = false;

  els.divider.addEventListener('mousedown', () => {
    dragging = true;
    document.body.classList.add('is-dragging');
  });

  window.addEventListener('mousemove', (event) => {
    if (!dragging) {
      return;
    }

    const rect = els.splitRoot.getBoundingClientRect();
    const leftPx = event.clientX - rect.left;
    const leftPercent = (leftPx / rect.width) * 100;
    const clampedPercent = Math.min(90, Math.max(10, leftPercent));
    const rightPercent = 100 - clampedPercent;
    els.splitRoot.style.gridTemplateColumns = `${clampedPercent}fr 8px ${rightPercent}fr`;
  });

  window.addEventListener('mouseup', async () => {
    if (!dragging) {
      return;
    }
    dragging = false;
    document.body.classList.remove('is-dragging');

    const rect = els.splitRoot.getBoundingClientRect();
    const cols = getComputedStyle(els.splitRoot).gridTemplateColumns.split(' ');
    const leftPx = Number(cols[0].replace('px', ''));
    const leftPercent = (leftPx / rect.width) * 100;
    state.draftConfig.layout.splitRatio = ratioFromPercent(leftPercent);
    applySplitByRatio(state.draftConfig.layout.splitRatio);
    applySettingsToForm();

    // Split ratio must be auto-saved after drag.
    await saveSettingsToDisk();
  });
}

function updateSidebarSettingsFromForm() {
  const previousStationCode = normalizeTimetableSettings(state.draftConfig?.sidebar?.timetable).stationCode;
  const station = normalizeTrainStation({ stationCode: els.selectTrainStation?.value });
  const stationChanged = previousStationCode !== station.stationCode;
  state.draftConfig.sidebar = {
    ...(state.draftConfig.sidebar || {}),
    widgetDefaultsVersion: SIDEBAR_WIDGET_DEFAULTS_VERSION,
    width: clampSidebarWidth(els.inputSidebarWidth?.value),
    widgets: collectSidebarWidgetsFromControls(),
    multiWidget: collectMultiWidgetSettingsFromControls(),
    timetable: normalizeTimetableSettings({
      ...station,
      direction: els.selectTrainDirection?.value,
      displayFormat: els.selectTimetableDisplayFormat?.value
    })
  };
  applySidebarWidth(state.draftConfig.sidebar.width);
  applySidebarWidgets();
  renderSidebarWidgetControls();
  if (stationChanged) {
    state.weatherLastUpdatedAt = null;
  }
  updateBackgroundWidgetTasks({ forceWeather: stationChanged });
  updateStationDisplayName();
  renderTimetableSettingsStatus();
  syncDraftState().catch(() => {});
}

function bindSidebarSettingsForm() {
  [
    els.selectTrainStation,
    els.selectTrainDirection,
    els.selectTimetableDisplayFormat,
    els.inputSidebarWidth,
    els.checkMultiSolarTerm,
    els.checkMultiDailyAdvice,
    els.selectMultiTransition,
    els.inputMultiInterval,
    ...els.sidebarWidgetCheckboxes.values()
  ].forEach((input) => {
    if (!input) return;
    input.addEventListener('change', updateSidebarSettingsFromForm);
    input.addEventListener('blur', updateSidebarSettingsFromForm);
  });
}

function bindSidebarResizer() {
  if (!els.sidebarResizer) {
    return;
  }

  let resizing = false;
  let rafId = null;

  const updateWidth = (clientX) => {
    const width = clampSidebarWidth(clientX);
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(() => {
      applySidebarWidth(width);
    });
  };

  els.sidebarResizer.addEventListener('pointerdown', (event) => {
    resizing = true;
    els.sidebarResizer.setPointerCapture(event.pointerId);
    document.body.classList.add('is-sidebar-resizing');
    updateWidth(event.clientX);
  });

  els.sidebarResizer.addEventListener('pointermove', (event) => {
    if (!resizing) {
      return;
    }
    updateWidth(event.clientX);
  });

  const stopResize = async (event) => {
    if (!resizing) {
      return;
    }
    resizing = false;
    if (els.sidebarResizer.hasPointerCapture(event.pointerId)) {
      els.sidebarResizer.releasePointerCapture(event.pointerId);
    }
    document.body.classList.remove('is-sidebar-resizing');
    state.draftConfig.sidebar = {
      ...(state.draftConfig.sidebar || {}),
      width: clampSidebarWidth(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width'))
    };
    await syncDraftState();
  };

  els.sidebarResizer.addEventListener('pointerup', stopResize);
  els.sidebarResizer.addEventListener('pointercancel', stopResize);
}

function bindWebviewPopupHandling() {
  syncWebviewPopupPermission();

  if (typeof window.desktopAPI.onOpenPopupInCurrent === 'function') {
    window.desktopAPI.onOpenPopupInCurrent((url) => {
      loadBrowserUrlInWebview(url);
      suppressInPagePopups();
    });
  }

  els.browserView.addEventListener('did-start-loading', () => {
    logSmssLayoutState('webview-did-start-loading');
  });

  els.browserView.addEventListener('did-start-navigation', (event) => {
    logSmssLayoutState('webview-did-start-navigation', {
      url: event.url,
      isMainFrame: event.isMainFrame,
      isInPlace: event.isInPlace
    });
  });

  els.browserView.addEventListener('did-navigate', (event) => {
    logSmssLayoutState('webview-did-navigate', {
      url: event.url,
      httpResponseCode: event.httpResponseCode,
      httpStatusText: event.httpStatusText
    });
  });

  els.browserView.addEventListener('did-fail-load', (event) => {
    logSmssLayoutState('webview-did-fail-load', {
      errorCode: event.errorCode,
      errorDescription: event.errorDescription,
      validatedURL: event.validatedURL,
      isMainFrame: event.isMainFrame
    });
  });

  els.browserView.addEventListener('console-message', (event) => {
    updateSmssAliveStatusFromConsoleMessage(event.message);
  });

  els.browserView.addEventListener('dom-ready', () => {
    logSmssLayoutState('webview-dom-ready');
    syncWebviewPopupPermission();
    applyBrowserZoom();
    suppressInPagePopups();
  }, { once: true });

  els.browserView.addEventListener('did-finish-load', () => {
    logSmssLayoutState('webview-did-finish-load');
    suppressInPagePopups();
    scheduleAutoActivateLine4(900);
  });

  els.browserView.addEventListener('did-stop-loading', () => {
    logSmssLayoutState('webview-did-stop-loading');
    suppressInPagePopups();
    scheduleAutoActivateLine4(900);
  });

  els.browserView.addEventListener('new-window', (event) => {
    const mode = getBrowserPopupMode();
    const popupUrl = normalizeUrl(event.url);
    if (popupUrl === 'about:blank') {
      event.preventDefault();
      return;
    }
    if (mode === 'block') {
      event.preventDefault();
      return;
    }

    if (mode === 'current') {
      event.preventDefault();
      loadBrowserUrlInWebview(popupUrl);
      suppressInPagePopups();
      return;
    }

    if (mode === 'allow') {
      event.preventDefault();
      window.desktopAPI.openPopupWindow(popupUrl);
    }
  });
}

function updateToolbarVisibility() {
  els.toolbar.classList.remove('hidden');
  els.splitRoot.classList.toggle('fullscreen', state.isFullscreen);
  document.body.classList.toggle('fullscreen-active', state.isFullscreen);
  if (!state.isFullscreen) {
    document.body.classList.remove('ui-idle');
    clearTimeout(state.uiIdleTimer);
  }
  if (state.smssLayoutFullscreenState !== state.isFullscreen) {
    state.smssLayoutFullscreenState = state.isFullscreen;
    logSmssLayoutState('fullscreen-state-changed', {
      isFullscreen: state.isFullscreen
    });
  }
  updateFullscreenButtonText();
}

function updateFullscreenButtonText() {
  if (els.btnFullscreen) {
    els.btnFullscreen.textContent = state.isFullscreen ? '현시 모드 종료' : '현시 모드 시작';
  }
}

function showToolbarTemporarily() {
  markUserActive();
}

function shouldHoldUiVisible() {
  return isAnyPanelOpen();
}

function markUserActive() {
  document.body.classList.remove('ui-idle');
  clearTimeout(state.uiIdleTimer);

  if (!state.isFullscreen || shouldHoldUiVisible()) {
    return;
  }

  state.uiIdleTimer = setTimeout(() => {
    if (!shouldHoldUiVisible()) {
      document.body.classList.add('ui-idle');
    }
  }, 5000);
}

function markBrowserTitleHintActive() {
  if (!els.browserTitleWidget) {
    return;
  }

  document.body.classList.add('show-browser-title-hint');
  clearTimeout(state.browserTitleHintTimer);
  state.browserTitleHintTimer = setTimeout(() => {
    document.body.classList.remove('show-browser-title-hint');
  }, 5000);
}

function bindActivityVisibility() {
  ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart'].forEach((eventName) => {
    window.addEventListener(eventName, markUserActive, { passive: true });
  });
  window.addEventListener('mousemove', markBrowserTitleHintActive, { passive: true });
  window.addEventListener('mousedown', markBrowserTitleHintActive, { passive: true });
  markUserActive();
}

function bindFullscreenInteractions() {
  els.topHoverZone.addEventListener('mouseenter', () => {
    showToolbarTemporarily();
  });

  window.desktopAPI.onFullscreenChanged((isFullscreen) => {
    state.isFullscreen = isFullscreen;
    updateToolbarVisibility();
  });

  window.addEventListener('resize', async () => {
    refitDailyAdviceLayout();
    fitMultiInfoAdviceLayout();
    if (typeof window.desktopAPI.isFullscreen !== 'function') {
      return;
    }
    const isFullscreen = await window.desktopAPI.isFullscreen();
    if (state.isFullscreen !== isFullscreen) {
      state.isFullscreen = isFullscreen;
      updateToolbarVisibility();
    } else {
      updateFullscreenButtonText();
    }
  });
}

function togglePause() {
  state.isPaused = !state.isPaused;

  if (state.isPaused) {
    clearSlideTimer();
    if (els.slideVideo.classList.contains('active')) {
      els.slideVideo.pause();
    }
    return;
  }

  showSlide(state.currentIndex);
}

function bindShortcuts() {
  window.desktopAPI.onOpenSettings(() => {
    openSettingsPanel();
  });

  window.desktopAPI.onTogglePause(() => {
    togglePause();
  });

  if (typeof window.desktopAPI.onBrowserZoomChanged === 'function') {
    window.desktopAPI.onBrowserZoomChanged((zoomPercent) => {
      setBrowserZoomPercent(zoomPercent, { applyToWebview: false, syncDraft: true }).catch(() => {});
    });
  }
}

function getWeatherIcon(code) {
  if (code === 0) {
    return '<svg viewBox="0 0 64 64" role="img"><circle cx="32" cy="32" r="14" fill="#ffd166"/><g stroke="#ffd166" stroke-width="5" stroke-linecap="round"><path d="M32 5v8M32 51v8M5 32h8M51 32h8M12 12l6 6M46 46l6 6M52 12l-6 6M18 46l-6 6"/></g></svg>';
  }
  if ([1, 2, 3].includes(code)) {
    return '<svg viewBox="0 0 64 64" role="img"><circle cx="23" cy="25" r="12" fill="#ffd166"/><path d="M20 45h27a10 10 0 0 0 0-20 15 15 0 0 0-28-3 12 12 0 0 0 1 23z" fill="#dbeafe"/></svg>';
  }
  if ([45, 48].includes(code)) {
    return '<svg viewBox="0 0 64 64" role="img"><g stroke="#dbeafe" stroke-width="5" stroke-linecap="round"><path d="M12 22h40M8 34h48M14 46h36"/></g></svg>';
  }
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
    return '<svg viewBox="0 0 64 64" role="img"><path d="M18 34h30a10 10 0 0 0 0-20 15 15 0 0 0-28-3 12 12 0 0 0-2 23z" fill="#dbeafe"/><g stroke="#6ecbff" stroke-width="5" stroke-linecap="round"><path d="M22 43l-4 9M34 43l-4 9M46 43l-4 9"/></g></svg>';
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return '<svg viewBox="0 0 64 64" role="img"><path d="M18 32h30a10 10 0 0 0 0-20 15 15 0 0 0-28-3 12 12 0 0 0-2 23z" fill="#dbeafe"/><g fill="#ffffff"><circle cx="21" cy="45" r="3"/><circle cx="33" cy="51" r="3"/><circle cx="45" cy="45" r="3"/></g></svg>';
  }
  return '<svg viewBox="0 0 64 64" role="img"><path d="M18 38h30a11 11 0 0 0 0-22 16 16 0 0 0-30 4 11 11 0 0 0 0 18z" fill="#dbeafe"/><path d="M33 36l-7 13h9l-5 11 13-17h-9l5-7z" fill="#ffd166"/></svg>';
}

function formatHourMinute(value) {
  if (!value) {
    return '--:--';
  }
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatHourMinuteSecond(value) {
  if (!value) {
    return '--:--:--';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--:--:--';
  }
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function formatDateTime(value) {
  if (!value) {
    return '없음';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '없음';
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${formatHourMinute(date)}`;
}

function formatLocalDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = String(dateKey || '').split('-').map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function formatMonthDay(dateKey) {
  const date = parseDateKey(dateKey);
  if (!date) {
    return '--/--';
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatKoreanMonthDay(dateKey) {
  const date = parseDateKey(dateKey);
  if (!date) {
    return '';
  }
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function normalizeSolarTermDescription(text) {
  return String(text || '').replace(/^[^0-9A-Za-z가-힣'"]+\s*/u, '').trim();
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function directionKey(direction) {
  return direction === '상행' ? 'up' : 'down';
}

function getEffectiveServiceDate(now = new Date()) {
  const date = new Date(now);
  if (date.getHours() < 3) {
    date.setDate(date.getDate() - 1);
  }
  return date;
}

function isKoreanHoliday(date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const fixedHolidays = new Set(['1-1', '3-1', '5-5', '6-6', '8-15', '10-3', '10-9', '12-25']);
  return fixedHolidays.has(`${month}-${day}`);
}

function getServiceDayKey(now = new Date()) {
  const serviceDate = getEffectiveServiceDate(now);
  if (serviceDate.getDay() === 0 || isKoreanHoliday(serviceDate)) {
    return 'holiday';
  }
  if (serviceDate.getDay() === 6) {
    return 'saturday';
  }
  return 'weekday';
}

function getServiceMinute(now = new Date()) {
  let hour = now.getHours();
  if (hour < 3) {
    hour += 24;
  }
  return hour * 60 + now.getMinutes();
}

function formatServiceMinute(totalMinutes) {
  if (!Number.isFinite(totalMinutes)) {
    return '--:--';
  }
  const hour24 = Math.floor(totalMinutes / 60) % 24;
  const hour = hour24 % 12 || 12;
  const minute = totalMinutes % 60;
  return `${hour}:${String(minute).padStart(2, '0')}`;
}

function getServiceHourMinuteParts(totalMinutes) {
  if (!Number.isFinite(totalMinutes)) {
    return { hour: '--', minute: '--' };
  }
  const hour24 = Math.floor(totalMinutes / 60) % 24;
  const hour = hour24 % 12 || 12;
  return {
    hour: String(hour),
    minute: String(totalMinutes % 60).padStart(2, '0')
  };
}

function renderNextTrainTable(upcoming) {
  if (!els.nextTrainTable) {
    return;
  }

  const rows = Array.from({ length: 3 }, (_, index) => {
    const minute = upcoming[index];
    const hasTime = Number.isFinite(minute);
    const placeholderClass = hasTime ? '' : ' next-train-table-placeholder';
    const timeText = hasTime ? formatServiceMinute(minute) : '--:--';

    return `
      <div class="next-train-table-row">
        <div class="next-train-table-order${placeholderClass}">${index + 1}번째</div>
        <div class="next-train-table-divider"></div>
        <div class="next-train-table-time${placeholderClass}">${timeText}</div>
      </div>
    `;
  }).join('');

  const nextHtml = `
    <div class="next-train-table-body">${rows}</div>
  `;
  if (els.nextTrainTable.innerHTML !== nextHtml) {
    els.nextTrainTable.innerHTML = nextHtml;
  }
}

function addTimetableRuntimeError(type, message) {
  const last = state.timetableRuntimeErrors[state.timetableRuntimeErrors.length - 1];
  if (last && last.type === type && last.message === message) {
    return;
  }
  state.timetableRuntimeErrors = [
    ...state.timetableRuntimeErrors,
    {
      at: new Date().toISOString(),
      type,
      message
    }
  ].slice(-5);
}

function clearNextTrainWidget() {
  if (els.nextTrainWidget) {
    els.nextTrainWidget.classList.add('hidden');
  }
  els.nextTrainTable?.classList.add('hidden');
}

function getSelectedStationCache() {
  const settings = normalizeTimetableSettings(state.draftConfig?.sidebar?.timetable);
  return state.timetableCache?.stations?.[settings.stationCode] || null;
}

function updateNextTrainWidget() {
  try {
    if (!isSidebarWidgetVisible('trainSchedule')) {
      clearNextTrainWidget();
      renderTimetableSettingsStatus();
      return;
    }

    const settings = normalizeTimetableSettings(state.draftConfig?.sidebar?.timetable);
    const stationCache = getSelectedStationCache();
    if (!stationCache || state.timetableRefreshFailed) {
      clearNextTrainWidget();
      if (!stationCache) {
        addTimetableRuntimeError('선택한 역의 시간표 캐시 없음', `${settings.stationName} 캐시가 없습니다.`);
      }
      renderTimetableSettingsStatus();
      return;
    }

    const dayKey = getServiceDayKey();
    const serviceMinute = getServiceMinute();
    const list = stationCache.schedules?.[dayKey]?.[directionKey(settings.direction)];
    if (!Array.isArray(list) || !list.length) {
      clearNextTrainWidget();
      addTimetableRuntimeError('상행/하행 시간표 파싱 실패', `${settings.stationName} ${settings.direction} 시간표가 비어 있습니다.`);
      renderTimetableSettingsStatus();
      return;
    }

    const upcoming = list
      .filter((minute) => Number.isFinite(minute) && minute > serviceMinute)
      .sort((a, b) => a - b);

    if (!upcoming.length) {
      els.nextTrainPrimary.textContent = '운행 종료';
      els.nextTrainSecondary.textContent = '';
      els.nextTrainSecondary.classList.add('hidden');
      els.nextTrainTable?.classList.add('hidden');
      els.nextTrainPrimary.classList.remove('hidden');
      els.nextTrainWidget.classList.remove('hidden');
      renderTimetableSettingsStatus();
      return;
    }

    if (settings.displayFormat === 'table') {
      els.nextTrainPrimary.classList.add('hidden');
      els.nextTrainSecondary.classList.add('hidden');
      renderNextTrainTable(upcoming);
      els.nextTrainTable?.classList.remove('hidden');
      els.nextTrainWidget.classList.remove('hidden');
      renderTimetableSettingsStatus();
      return;
    }

    els.nextTrainTable?.classList.add('hidden');
    els.nextTrainPrimary.classList.remove('hidden');
    const first = upcoming[0];
    const second = upcoming[1];
    const minutesLeft = first - serviceMinute;
    els.nextTrainPrimary.innerHTML = `
      <span class="next-train-time">${formatServiceMinute(first)}</span>
      <span class="next-train-dot">·</span>
      <span class="next-train-left">${minutesLeft}분 후</span>
    `;
    if (Number.isFinite(second)) {
      els.nextTrainSecondary.textContent = `다음 ${formatServiceMinute(second)} · ${second - serviceMinute}분 후`;
      els.nextTrainSecondary.classList.remove('hidden');
    } else {
      els.nextTrainSecondary.textContent = '';
      els.nextTrainSecondary.classList.add('hidden');
    }
    els.nextTrainWidget.classList.remove('hidden');
    renderTimetableSettingsStatus();
  } catch (err) {
    clearNextTrainWidget();
    addTimetableRuntimeError('다음 열차 계산 중 예외 발생', err.message || '알 수 없는 오류');
    renderTimetableSettingsStatus();
  }
}

async function ensureTimetableCacheLoaded() {
  if (state.timetableCache) {
    return;
  }
  state.timetableCache = await window.desktopAPI.getTimetableCache();
  renderTimetableSettingsStatus();
}

function syncTimetableUpdates() {
  if (state.timetableTimer) {
    clearInterval(state.timetableTimer);
    state.timetableTimer = null;
  }

  if (!isSidebarWidgetVisible('trainSchedule')) {
    clearNextTrainWidget();
    renderTimetableSettingsStatus();
    return;
  }

  ensureTimetableCacheLoaded()
    .then(() => {
      if (!isSidebarWidgetVisible('trainSchedule')) {
        clearNextTrainWidget();
        return;
      }
      updateNextTrainWidget();
      state.timetableTimer = setInterval(updateNextTrainWidget, 30 * 1000);
    })
    .catch((err) => {
      addTimetableRuntimeError('시간표 캐시 로드 실패', err.message || '알 수 없는 오류');
      clearNextTrainWidget();
      renderTimetableSettingsStatus();
    });
}

function getTimetableLogs() {
  const persistedLogs = Array.isArray(state.timetableCache?.errors) ? state.timetableCache.errors : [];
  return [...persistedLogs, ...state.timetableRuntimeErrors].slice(-5);
}

function renderTimetableSettingsStatus() {
  if (els.timetableLastUpdated) {
    const stationCache = getSelectedStationCache();
    els.timetableLastUpdated.textContent = `시간표 마지막 갱신: ${formatDateTime(stationCache?.updatedAt || state.timetableCache?.updatedAt)}`;
  }

  if (els.timetableErrorLog) {
    const logs = getTimetableLogs();
    if (!logs.length) {
      els.timetableErrorLog.textContent = '오류 없음';
    } else {
      els.timetableErrorLog.innerHTML = logs.map((log) => {
        const time = formatHourMinute(log.at);
        return `<div>${escapeHtml(time)} · ${escapeHtml(log.type)} · ${escapeHtml(log.message)}</div>`;
      }).join('');
    }
  }
}

function updateStatusToast() {
  if (!els.weatherUpdateStatus) {
    return;
  }

  const parts = [];
  if (isSidebarWidgetShown('weather')) {
    parts.push(state.weatherLastUpdatedAt
      ? `날씨 갱신 (${formatHourMinute(state.weatherLastUpdatedAt)})`
      : '날씨 갱신 대기 중');
  }

  if (state.smssLastAliveAt) {
    parts.push(`웹 alive (${formatHourMinuteSecond(state.smssLastAliveAt)})`);
  }

  if (isSidebarWidgetVisible('trainSchedule')) {
    const stationCache = getSelectedStationCache();
    parts.push(stationCache?.updatedAt
      ? `시간표 갱신 (${formatHourMinute(stationCache.updatedAt)})`
      : '시간표 갱신 없음');
  }

  els.weatherUpdateStatus.textContent = parts.join(' / ');
}

function showStatusOverride(message) {
  if (!els.weatherUpdateStatus) {
    return;
  }
  clearTimeout(state.statusOverrideTimer);
  els.weatherUpdateStatus.textContent = message;
  markUserActive();
  state.statusOverrideTimer = setTimeout(updateStatusToast, 6000);
}

function updateSmssAliveStatusFromConsoleMessage(message) {
  const text = String(message || '');
  const prefixMatch = text.match(/^\[SMSS INPAGE\]\s+(\{.*\})$/);
  if (prefixMatch) {
    try {
      const payload = JSON.parse(prefixMatch[1]);
      if (payload?.event === 'alive') {
        state.smssLastAliveAt = payload.time || new Date().toISOString();
        updateStatusToast();
      }
    } catch (_) {
      // Ignore malformed diagnostic console payloads.
    }
    return;
  }

  if (/^alive\s+.+https:\/\/smss\.seoulmetro\.co\.kr\//.test(text)) {
    state.smssLastAliveAt = new Date().toISOString();
    updateStatusToast();
  }
}

async function refreshTimetableManually() {
  if (!isSidebarWidgetVisible('trainSchedule')) {
    return;
  }

  const settings = normalizeTimetableSettings(state.draftConfig?.sidebar?.timetable);
  const originalText = els.btnRefreshTimetable.textContent;
  els.btnRefreshTimetable.disabled = true;
  els.btnRefreshTimetable.textContent = '갱신 중...';

  try {
    const result = await window.desktopAPI.refreshTimetable(settings);
    state.timetableCache = result.cache || state.timetableCache;
    if (result.ok) {
      state.timetableRefreshFailed = false;
      state.timetableRuntimeErrors = [];
      showStatusOverride(`시간표 갱신 (${formatHourMinute(new Date())})`);
    } else {
      state.timetableRefreshFailed = true;
      addTimetableRuntimeError('시간표 갱신 요청 실패', result.error || '설정에서 오류 확인');
      showStatusOverride('시간표 갱신 실패 · 설정에서 오류 확인');
    }
    updateNextTrainWidget();
    renderTimetableSettingsStatus();
  } finally {
    els.btnRefreshTimetable.disabled = false;
    els.btnRefreshTimetable.textContent = originalText;
  }
}

function getMultiWidgetSettings() {
  return normalizeMultiWidgetSettings(state.draftConfig?.sidebar?.multiWidget);
}

function isMultiInfoWidgetEnabled() {
  return isSidebarWidgetVisible('multiInfo');
}

function isMultiWidgetItemEnabled(itemId) {
  return isMultiInfoWidgetEnabled() && getMultiWidgetSettings().enabledItems.includes(itemId);
}

function shouldUseSolarTermData() {
  return isSidebarWidgetVisible('solarTerm') || isMultiWidgetItemEnabled('solarTerm');
}

function shouldUseDailyAdviceData() {
  return isSidebarWidgetVisible('dailyAdvice') || isMultiWidgetItemEnabled('dailyAdvice');
}

function clearMultiInfoWidget() {
  els.multiInfoWidget?.classList.add('hidden');
  if (els.multiInfoContent) {
    els.multiInfoContent.innerHTML = '';
    els.multiInfoContent.className = 'multi-info-content';
  }
  state.multiInfoRenderKey = '';
}

function renderMultiSolarTermPane() {
  const info = getSolarTermDisplayInfo();
  const title = info?.title || '오늘의 절기';
  const primary = info?.primary || '절기 정보 확인 중';
  const dateText = info?.dateText || '';
  const description = info?.description || '잠시 후 표시됩니다.';

  return `
    <div class="multi-info-pane multi-info-solar-pane" data-multi-pane="solarTerm">
      <div class="multi-info-kicker">${escapeHtml(title)}</div>
      <div class="multi-info-primary">${escapeHtml(primary)}</div>
      ${dateText ? `<div class="multi-info-date">${escapeHtml(dateText)}</div>` : ''}
      <div class="multi-info-description">${escapeHtml(description)}</div>
    </div>
  `;
}

function normalizeAdviceForDisplay(advice = fallbackDailyAdvice) {
  const message = typeof advice.message === 'string' && advice.message.trim()
    ? advice.message.trim()
    : fallbackDailyAdvice.message;
  return {
    message,
    author: typeof advice.author === 'string' ? advice.author.trim() : '',
    authorProfile: typeof advice.authorProfile === 'string' ? advice.authorProfile.trim() : ''
  };
}

function renderMultiDailyAdvicePane() {
  const advice = normalizeAdviceForDisplay(state.dailyAdviceData || fallbackDailyAdvice);
  const authorHtml = advice.author
    ? `<div class="multi-info-advice-author">
        <span class="multi-info-advice-author-name">${escapeHtml(advice.author)}</span>
        ${advice.authorProfile ? `<span class="multi-info-advice-author-profile">${escapeHtml(advice.authorProfile)}</span>` : ''}
      </div>`
    : '';

  return `
    <div class="multi-info-pane multi-info-advice-pane" data-multi-pane="dailyAdvice">
      <div class="multi-info-kicker">오늘의 한마디</div>
      <div class="multi-info-advice-message">${escapeHtml(advice.message)}</div>
      ${authorHtml}
    </div>
  `;
}

function getMultiInfoPanes() {
  if (!isMultiInfoWidgetEnabled()) {
    return [];
  }

  return getMultiWidgetSettings().enabledItems
    .map((itemId) => {
      if (itemId === 'solarTerm') {
        return { id: itemId, html: renderMultiSolarTermPane() };
      }
      if (itemId === 'dailyAdvice') {
        return { id: itemId, html: renderMultiDailyAdvicePane() };
      }
      return null;
    })
    .filter(Boolean);
}

function fitMultiInfoAdviceLayout() {
  const widget = els.multiInfoWidget;
  const message = widget?.querySelector('.multi-info-advice-message');
  const author = widget?.querySelector('.multi-info-advice-author');
  const profile = widget?.querySelector('.multi-info-advice-author-profile');
  if (!widget || !message || !author) {
    return;
  }

  const overflows = () => widget.scrollHeight > widget.clientHeight + 1
    || message.scrollHeight > message.clientHeight + 1
    || author.scrollWidth > author.clientWidth + 1
    || author.scrollHeight > author.clientHeight + 1;

  if (profile && overflows()) {
    profile.classList.add('hidden');
  }
  if (overflows()) {
    author.classList.add('hidden');
    widget.classList.add('message-only');
  }
}

function renderMultiInfoWidget(options = {}) {
  const { animate = true, force = false } = options;
  const panes = getMultiInfoPanes();
  if (!els.multiInfoWidget || !els.multiInfoContent || panes.length === 0) {
    clearMultiInfoWidget();
    return;
  }

  state.multiInfoActiveIndex %= panes.length;
  const settings = getMultiWidgetSettings();
  const activePane = panes[state.multiInfoActiveIndex];
  const renderKey = `${activePane.id}|${settings.transition}|${activePane.html}`;
  if (!force && state.multiInfoRenderKey === renderKey && !els.multiInfoWidget.classList.contains('hidden')) {
    fitMultiInfoAdviceLayout();
    return;
  }

  els.multiInfoWidget.classList.remove('hidden', 'message-only');
  els.multiInfoWidget.dataset.activePane = activePane.id;
  els.multiInfoContent.className = 'multi-info-content';
  els.multiInfoContent.innerHTML = activePane.html;
  state.multiInfoRenderKey = renderKey;
  if (animate && settings.transition !== 'none') {
    void els.multiInfoContent.offsetWidth;
    els.multiInfoContent.classList.add(`multi-info-anim-${settings.transition}`);
  }
  fitMultiInfoAdviceLayout();
}

function syncMultiInfoWidget() {
  const panes = getMultiInfoPanes();
  if (panes.length === 0) {
    if (state.multiInfoTimer) {
      clearInterval(state.multiInfoTimer);
      state.multiInfoTimer = null;
    }
    state.multiInfoTimerKey = '';
    clearMultiInfoWidget();
    return;
  }

  if (state.multiInfoActiveIndex >= panes.length) {
    state.multiInfoActiveIndex = 0;
  }
  renderMultiInfoWidget({ animate: false });

  if (panes.length <= 1) {
    if (state.multiInfoTimer) {
      clearInterval(state.multiInfoTimer);
      state.multiInfoTimer = null;
    }
    state.multiInfoTimerKey = '';
    return;
  }

  const settings = getMultiWidgetSettings();
  const timerKey = `${panes.map((pane) => pane.id).join(',')}|${settings.intervalSeconds}`;
  if (state.multiInfoTimer && state.multiInfoTimerKey === timerKey) {
    return;
  }

  if (state.multiInfoTimer) {
    clearInterval(state.multiInfoTimer);
    state.multiInfoTimer = null;
  }
  state.multiInfoTimerKey = timerKey;
  state.multiInfoTimer = setInterval(() => {
    const currentPanes = getMultiInfoPanes();
    if (currentPanes.length === 0) {
      clearInterval(state.multiInfoTimer);
      state.multiInfoTimer = null;
      state.multiInfoTimerKey = '';
      clearMultiInfoWidget();
      return;
    }
    state.multiInfoActiveIndex = (state.multiInfoActiveIndex + 1) % currentPanes.length;
    renderMultiInfoWidget({ animate: true });
  }, settings.intervalSeconds * 1000);
}

function clearSolarTermWidget() {
  els.solarTermWidget?.classList.add('hidden');
}

function getCachedSolarTerms() {
  return Object.values(state.solarTermYears)
    .flatMap((cache) => Array.isArray(cache?.terms) ? cache.terms : [])
    .filter((term) => term?.date && term?.name && solarTermDescriptions[term.name])
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getSolarTermDisplayInfo(now = new Date()) {
  const todayKey = formatLocalDateKey(now);
  const terms = getCachedSolarTerms();
  const todayTerm = terms.find((term) => term.date === todayKey);
  if (todayTerm) {
    return {
      title: '오늘의 절기',
      primary: todayTerm.name,
      dateText: formatKoreanMonthDay(todayTerm.date),
      description: normalizeSolarTermDescription(solarTermDescriptions[todayTerm.name])
    };
  }

  const nextTerm = terms.find((term) => term.date > todayKey);
  if (!nextTerm) {
    return null;
  }

  return {
    title: '다가오는 절기',
    primary: nextTerm.name,
    dateText: formatKoreanMonthDay(nextTerm.date),
    description: normalizeSolarTermDescription(solarTermDescriptions[nextTerm.name])
  };
}

function renderSolarTermWidget() {
  const info = getSolarTermDisplayInfo();
  if (!isSidebarWidgetVisible('solarTerm')) {
    clearSolarTermWidget();
    return !!info;
  }

  if (!info) {
    clearSolarTermWidget();
    return false;
  }

  if (els.solarTermTitle) {
    els.solarTermTitle.textContent = info.title;
  }
  if (els.solarTermPrimary) {
    els.solarTermPrimary.textContent = info.primary;
  }
  if (els.solarTermDate) {
    els.solarTermDate.textContent = info.dateText || '';
  }
  if (els.solarTermDescription) {
    els.solarTermDescription.textContent = info.description;
  }
  els.solarTermWidget?.classList.remove('hidden');
  return true;
}

async function loadSolarTermYearFromCache(year) {
  if (state.solarTermYears[year]) {
    return state.solarTermYears[year];
  }

  const result = await window.desktopAPI.getSolarTermsYear(year);
  if (result?.cache?.terms?.length) {
    state.solarTermYears[year] = result.cache;
    return result.cache;
  }
  return null;
}

async function refreshSolarTermYearInBackground(year) {
  if (!shouldUseSolarTermData()) {
    return;
  }

  const result = await window.desktopAPI.refreshSolarTermsYear(year);
  if (!shouldUseSolarTermData()) {
    return;
  }

  if (result?.cache?.terms?.length) {
    state.solarTermYears[year] = result.cache;
    renderSolarTermWidget();
    syncMultiInfoWidget();
  }
}

async function loadSolarTermWidget() {
  if (state.solarTermLoading || !shouldUseSolarTermData()) {
    return;
  }

  state.solarTermLoading = true;
  const year = new Date().getFullYear();
  try {
    await loadSolarTermYearFromCache(year);
    if (!renderSolarTermWidget()) {
      await loadSolarTermYearFromCache(year + 1);
      renderSolarTermWidget();
    }
    syncMultiInfoWidget();

    refreshSolarTermYearInBackground(year).catch(() => {});
    const hasFutureThisYear = (state.solarTermYears[year]?.terms || []).some((term) => term.date >= formatLocalDateKey());
    if (!hasFutureThisYear) {
      refreshSolarTermYearInBackground(year + 1).catch(() => {});
    }
  } finally {
    state.solarTermLoading = false;
  }
}

function syncSolarTermUpdates() {
  if (!shouldUseSolarTermData()) {
    if (state.solarTermTimer) {
      clearInterval(state.solarTermTimer);
      state.solarTermTimer = null;
    }
    clearSolarTermWidget();
    syncMultiInfoWidget();
    return;
  }

  if (!state.solarTermTimer) {
    state.solarTermTimer = setInterval(loadSolarTermWidget, 6 * 60 * 60 * 1000);
  }
  loadSolarTermWidget();
}

function clearDailyAdviceWidget() {
  els.dailyAdviceWidget?.classList.add('hidden');
}

function dailyAdviceOverflows() {
  const widget = els.dailyAdviceWidget;
  if (!widget) {
    return false;
  }
  return widget.scrollHeight > widget.clientHeight + 1;
}

function dailyAdviceMessageClipped() {
  const message = els.dailyAdviceMessage;
  if (!message) {
    return false;
  }
  return message.scrollHeight > message.clientHeight + 1;
}

function dailyAdviceAuthorClipped() {
  const author = els.dailyAdviceAuthor;
  if (!author || author.classList.contains('hidden')) {
    return false;
  }
  return author.scrollWidth > author.clientWidth + 1 || author.scrollHeight > author.clientHeight + 1;
}

function getDailyAdviceMessageLineHeight() {
  if (!els.dailyAdviceMessage) {
    return 0;
  }
  const styles = getComputedStyle(els.dailyAdviceMessage);
  const lineHeight = Number.parseFloat(styles.lineHeight);
  if (Number.isFinite(lineHeight) && lineHeight > 0) {
    return lineHeight;
  }
  const fontSize = Number.parseFloat(styles.fontSize);
  return Number.isFinite(fontSize) && fontSize > 0 ? fontSize * 1.42 : 0;
}

function fitDailyAdviceMessageOnly() {
  const widget = els.dailyAdviceWidget;
  const message = els.dailyAdviceMessage;
  if (!widget || !message) {
    return;
  }

  widget.classList.add('message-only');
  const lineHeight = getDailyAdviceMessageLineHeight();
  const title = widget.querySelector('.daily-advice-title');
  const titleHeight = title ? title.getBoundingClientRect().height : 0;
  const styles = getComputedStyle(widget);
  const verticalPadding = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
  const gap = Number.parseFloat(styles.rowGap || styles.gap) || 0;
  const availableHeight = Math.max(0, widget.clientHeight - verticalPadding - titleHeight - gap);
  const maxLines = lineHeight > 0 ? Math.max(1, Math.floor(availableHeight / lineHeight)) : 4;
  message.style.setProperty('--daily-advice-message-lines', String(maxLines));
}

function fitDailyAdviceLayout({ author, authorProfile }) {
  const widget = els.dailyAdviceWidget;
  if (!widget) {
    return;
  }

  widget.classList.remove('message-only');
  els.dailyAdviceMessage?.style.removeProperty('--daily-advice-message-lines');

  const hasAuthor = !!author;
  const hasProfile = !!authorProfile;
  els.dailyAdviceAuthor?.classList.toggle('hidden', !hasAuthor);
  els.dailyAdviceAuthorName?.classList.toggle('hidden', !hasAuthor);
  els.dailyAdviceAuthorProfile?.classList.toggle('hidden', !hasProfile);

  if ((dailyAdviceOverflows() || dailyAdviceMessageClipped() || dailyAdviceAuthorClipped()) && hasProfile) {
    els.dailyAdviceAuthorProfile?.classList.add('hidden');
  }

  if ((dailyAdviceOverflows() || dailyAdviceMessageClipped() || dailyAdviceAuthorClipped()) && hasAuthor) {
    els.dailyAdviceAuthor?.classList.add('hidden');
    fitDailyAdviceMessageOnly();
  }
}

function renderDailyAdviceWidget(advice = fallbackDailyAdvice) {
  const normalizedAdvice = normalizeAdviceForDisplay(advice);
  state.dailyAdviceData = normalizedAdvice;
  if (!isSidebarWidgetVisible('dailyAdvice')) {
    clearDailyAdviceWidget();
    syncMultiInfoWidget();
    return;
  }

  if (els.dailyAdviceMessage) {
    els.dailyAdviceMessage.textContent = normalizedAdvice.message;
  }

  if (els.dailyAdviceAuthorName) {
    els.dailyAdviceAuthorName.textContent = normalizedAdvice.author;
  }
  if (els.dailyAdviceAuthorProfile) {
    els.dailyAdviceAuthorProfile.textContent = normalizedAdvice.authorProfile;
  }

  if (els.dailyAdviceWidget) {
    els.dailyAdviceWidget.dataset.author = normalizedAdvice.author;
    els.dailyAdviceWidget.dataset.authorProfile = normalizedAdvice.authorProfile;
    els.dailyAdviceWidget.classList.remove('hidden');
  }
  fitDailyAdviceLayout({ author: normalizedAdvice.author, authorProfile: normalizedAdvice.authorProfile });
  syncMultiInfoWidget();
}

async function loadDailyAdvice(forceRefresh = false) {
  if (state.adviceLoading || !shouldUseDailyAdviceData()) {
    return;
  }

  state.adviceLoading = true;
  try {
    const result = await window.desktopAPI.getDailyAdvice(forceRefresh);
    if (!shouldUseDailyAdviceData()) {
      clearDailyAdviceWidget();
      syncMultiInfoWidget();
      return;
    }
    renderDailyAdviceWidget(result?.advice || fallbackDailyAdvice);
  } catch (_) {
    renderDailyAdviceWidget(fallbackDailyAdvice);
  } finally {
    state.adviceLoading = false;
  }
}

function getNextAdviceRefreshDelay(now = new Date()) {
  const next = new Date(now);
  next.setHours(4, 0, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return Math.max(1000, next.getTime() - now.getTime());
}

function scheduleNextDailyAdviceRefresh() {
  if (state.adviceTimer) {
    clearTimeout(state.adviceTimer);
    state.adviceTimer = null;
  }

  if (!shouldUseDailyAdviceData()) {
    return;
  }

  state.adviceTimer = setTimeout(async () => {
    state.adviceTimer = null;
    await loadDailyAdvice(true);
    scheduleNextDailyAdviceRefresh();
  }, getNextAdviceRefreshDelay());
}

function syncDailyAdviceUpdates() {
  if (!shouldUseDailyAdviceData()) {
    if (state.adviceTimer) {
      clearTimeout(state.adviceTimer);
      state.adviceTimer = null;
    }
    clearDailyAdviceWidget();
    syncMultiInfoWidget();
    return;
  }

  loadDailyAdvice(false);
  scheduleNextDailyAdviceRefresh();
}

function refitDailyAdviceLayout() {
  const widget = els.dailyAdviceWidget;
  if (!widget || widget.classList.contains('hidden')) {
    return;
  }
  fitDailyAdviceLayout({
    author: widget.dataset.author || '',
    authorProfile: widget.dataset.authorProfile || ''
  });
}

function renderAirQuality(currentAir = {}) {
  if (!els.weatherAirQuality) {
    return;
  }

  const airQuality = getKoreanAirQuality(currentAir.pm2_5, currentAir.pm10);
  els.weatherAirQuality.textContent = airQuality.representative;
}

async function updateWeather() {
  if (!isSidebarWidgetVisible('weather')) {
    return;
  }

  const station = getSelectedStationWeatherLocation();
  const requestStationCode = station.stationCode;
  const latitude = station.latitude;
  const longitude = station.longitude;
  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,weather_code&hourly=precipitation_probability&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=Asia%2FSeoul&forecast_days=1`;
  const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=pm2_5,pm10&timezone=Asia%2FSeoul`;

  try {
    const [forecastResponse, airResponse] = await Promise.all([fetch(forecastUrl), fetch(airUrl)]);
    if (!forecastResponse.ok || !airResponse.ok) {
      throw new Error('Weather request failed');
    }
    if (!isSidebarWidgetVisible('weather') || getSelectedStationWeatherLocation().stationCode !== requestStationCode) {
      return;
    }

    const forecast = await forecastResponse.json();
    const air = await airResponse.json();
    if (!isSidebarWidgetVisible('weather') || getSelectedStationWeatherLocation().stationCode !== requestStationCode) {
      return;
    }
    const current = forecast.current || {};
    const daily = forecast.daily || {};
    const hourly = forecast.hourly || {};
    const now = new Date();
    const hourlyIndex = (hourly.time || []).findIndex((time) => new Date(time).getHours() === now.getHours());
    const precip = hourlyIndex >= 0 ? hourly.precipitation_probability?.[hourlyIndex] : hourly.precipitation_probability?.[0];
    const sunrise = daily.sunrise?.[0];
    const sunset = daily.sunset?.[0];
    const sunLabel = sunrise && now < new Date(sunrise) ? '\uC77C\uCD9C' : '\uC77C\uBAB0';
    const sunValue = sunLabel === '\uC77C\uCD9C' ? sunrise : sunset;

    els.weatherIcon.innerHTML = getWeatherIcon(Number(current.weather_code));
    els.weatherTemp.textContent = `${Math.round(Number(current.temperature_2m))}\u00B0`;
    renderAirQuality(air.current);
    els.weatherHigh.textContent = `\uCD5C\uACE0 ${Math.round(Number(daily.temperature_2m_max?.[0]))}\u00B0`;
    els.weatherLow.textContent = `\uCD5C\uC800 ${Math.round(Number(daily.temperature_2m_min?.[0]))}\u00B0`;
    els.weatherSunTime.textContent = formatHourMinute(sunValue);
    els.weatherPrecip.textContent = `${Number.isFinite(Number(precip)) ? Math.round(Number(precip)) : 0}%`;
    state.weatherLastUpdatedAt = new Date().toISOString();
    setWeatherWidgetLoadFailed(false);
    updateStatusToast();
  } catch (err) {
    state.weatherLastUpdatedAt = null;
    setWeatherWidgetLoadFailed(true);
    updateStatusToast();
    showStatusOverride('\uB0A0\uC528 \uAC31\uC2E0 \uC2E4\uD328');
  }
}

function syncWeatherUpdates(forceRefresh = false) {
  if (!isSidebarWidgetVisible('weather')) {
    if (state.weatherTimer) {
      clearInterval(state.weatherTimer);
      state.weatherTimer = null;
    }
    return;
  }

  if (forceRefresh && state.weatherTimer) {
    clearInterval(state.weatherTimer);
    state.weatherTimer = null;
  }

  if (state.weatherTimer) {
    return;
  }

  updateWeather();
  state.weatherTimer = setInterval(updateWeather, 10 * 60 * 1000);
}

function updateBackgroundWidgetTasks({ forceWeather = false } = {}) {
  syncClockUpdates();
  syncWeatherUpdates(forceWeather);
  syncTimetableUpdates();
  syncSolarTermUpdates();
  syncDailyAdviceUpdates();
  syncMultiInfoWidget();
  updateStatusToast();
}

function updateClock() {
  if (!isSidebarWidgetVisible('datetime')) {
    return;
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const dayNames = ['\uC77C\uC694\uC77C', '\uC6D4\uC694\uC77C', '\uD654\uC694\uC77C', '\uC218\uC694\uC77C', '\uBAA9\uC694\uC77C', '\uAE08\uC694\uC77C', '\uD1A0\uC694\uC77C'];
  const day = dayNames[now.getDay()];
  const rawHours = now.getHours();
  const period = rawHours >= 12 ? '\uC624\uD6C4' : '\uC624\uC804';
  const hours12 = rawHours % 12 || 12;
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  if (els.sidebarDate) {
    els.sidebarDate.textContent = `${month}\uC6D4 ${date}\uC77C ${day}`;
  }
  if (els.sidebarClock) {
    els.sidebarClock.innerHTML = `
      <span class="sidebar-clock-period">${period}</span>
      <span class="sidebar-clock-time">
        <span class="clock-unit">${String(hours12).padStart(2, '0')}</span>
        <span class="clock-separator">:</span>
        <span class="clock-unit">${minutes}</span>
        <span class="clock-separator">:</span>
        <span class="clock-unit">${seconds}</span>
      </span>
    `;
  }
}

function syncClockUpdates() {
  if (!isSidebarWidgetVisible('datetime')) {
    if (state.clockTimer) {
      clearInterval(state.clockTimer);
      state.clockTimer = null;
    }
    return;
  }

  if (state.clockTimer) {
    return;
  }

  updateClock();
  state.clockTimer = setInterval(updateClock, 1000);
}

arrangeSidebarInfoCards();
syncClockUpdates();

async function init() {
  if (typeof window.desktopAPI.getDefaultConfig === 'function') {
    defaultConfig = await window.desktopAPI.getDefaultConfig();
  }
  const config = await window.desktopAPI.getConfig();
  state.savedConfig = deepClone(config);
  state.draftConfig = mergeUIState(state.savedConfig, config);

  setupSidebarSettingsPanel();
  bindToolbarAndPanels();
  bindSettingsForm();
  bindSidebarSettingsForm();
  bindDividerDrag();
  bindSidebarResizer();
  bindWebviewPopupHandling();
  bindFullscreenInteractions();
  bindActivityVisibility();
  bindShortcuts();

  state.isFullscreen = await window.desktopAPI.isFullscreen();
  updateToolbarVisibility();

  applyLayout();
  applySidebarWidth(state.draftConfig.sidebar?.width);
  applyBrowserSettings();
  logSmssLayoutState('init');
  applySettingsToForm();
  renderPlaylist();
  updateBackgroundWidgetTasks();
  updateStatusToast();

  await refreshMissingFlags();
  await window.desktopAPI.setAlwaysOnTop(state.draftConfig.window.alwaysOnTop);
  await window.desktopAPI.setPreventMinimize(state.draftConfig.window.preventMinimize);

  state.currentIndex = 0;
  showSlide(0);
}

init();
