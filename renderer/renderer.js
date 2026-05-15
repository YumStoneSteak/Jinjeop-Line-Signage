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
  dragIndex: null,
  sidebarWidgetDragIndex: null,
  tempToolbarTimer: null,
  weatherTimer: null,
  uiIdleTimer: null,
  clockTimer: null,
  timetableCache: null,
  timetableTimer: null,
  timetableRefreshFailed: false,
  timetableRuntimeErrors: [],
  solarTermYears: {},
  solarTermTimer: null,
  solarTermLoading: false,
  adviceTimer: null,
  adviceLoading: false,
  weatherLastUpdatedAt: null,
  statusOverrideTimer: null,
  autoLine4Timer: null,
  autoLine4Attempts: 0,
  autoLine4Triggered: false,
  autoLine4TargetUrl: '',
  browserRequestedUrl: ''
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
  dailyAdviceWidget: document.getElementById('dailyAdviceWidget'),
  dailyAdviceMessage: document.getElementById('dailyAdviceMessage'),
  dailyAdviceAuthor: document.getElementById('dailyAdviceAuthor'),
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

  btnFullscreen: document.getElementById('btnFullscreen'),
  btnSidebarSettings: document.getElementById('btnSidebarSettings'),
  btnFileManager: document.getElementById('btnFileManager'),
  btnScreenSettings: document.getElementById('btnScreenSettings'),
  btnExit: document.getElementById('btnExit'),

  filePanel: document.getElementById('filePanel'),
  btnAddFiles: document.getElementById('btnAddFiles'),
  btnCheckMissing: document.getElementById('btnCheckMissing'),
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
  btnCloseSidebarPanel: document.getElementById('btnCloseSidebarPanel'),
  inputLogoPath: null,
  btnPickLogoFile: null,
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
  checkVideoFirst: document.getElementById('checkVideoFirst'),
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
    widgets: normalizeSidebarWidgets(clone.sidebar?.widgets, clone.sidebar?.widgetDefaultsVersion),
    timetable: normalizeTimetableSettings(clone.sidebar?.timetable)
  };
  clone.player.playlist = (clone.player.playlist || []).map((item) => ({
    path: item.path,
    type: item.type,
    duration: Number(item.duration) > 0 ? Number(item.duration) : 5
  }));
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

function normalizeLogoPath(value) {
  if (typeof value !== 'string') {
    return defaultConfig.sidebar.logoPath;
  }

  const trimmed = value.trim();
  return trimmed || defaultConfig.sidebar.logoPath;
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

function isSidebarWidgetVisible(widgetId) {
  const widgets = normalizeSidebarWidgets(state.draftConfig?.sidebar?.widgets);
  return widgets.find((widget) => widget.id === widgetId)?.visible !== false;
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

function resetAutoLine4Activation(url) {
  clearTimeout(state.autoLine4Timer);
  state.autoLine4Timer = null;
  state.autoLine4Attempts = 0;
  state.autoLine4Triggered = false;
  state.autoLine4TargetUrl = isSeoulMetroTrainInfoUrl(url) ? normalizeUrl(url) : '';
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

function showSlide(index) {
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

  hideMediaElements();
  els.emptyState.style.display = 'none';
  els.slideCaption.textContent = `${getFilename(item.path)} (${item.type})`;

  if (item.type === 'image') {
    els.slideImage.src = pathToFileUrl(item.path);
    els.slideImage.classList.add('active');
    applyTransitionClass(els.slideImage);

    if (!state.isPaused) {
      const durationMs = Math.max(1, Number(item.duration) || 5) * 1000;
      scheduleNext(durationMs);
    }
    return;
  }

  els.slideVideo.src = pathToFileUrl(item.path);
  els.slideVideo.classList.add('active');
  applyTransitionClass(els.slideVideo);

  const shouldWaitEnded = !!state.draftConfig.player.videoFirstMode;

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

  if (!state.isPaused && !shouldWaitEnded) {
    const durationMs = Math.max(1, Number(item.duration) || 5) * 1000;
    scheduleNext(durationMs);
  }
}

function nextSlide() {
  clearSlideTimer();
  const list = state.draftConfig.player.playlist;
  if (!list.length) {
    showEmptyState();
    return;
  }
  const nextIndex = (state.currentIndex + 1) % list.length;
  showSlide(nextIndex);
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
  logoPathInput.placeholder = 'files/ncuc_logo.png';
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

  const solarTermSection = createSettingsSection('24절기 설정');
  solarTermSection.append(createSidebarWidgetCheckbox('solarTerm', '24절기 위젯 표시'));
  const solarTermNote = document.createElement('p');
  solarTermNote.className = 'settings-note';
  solarTermNote.textContent = '오늘 또는 다음 24절기를 로컬 캐시 기준으로 표시합니다.';
  solarTermSection.append(solarTermNote);
  wrapWidgetOptions(solarTermSection, 'solarTerm');

  if (firstSection) {
    els.sidebarPanel.insertBefore(orderSection, firstSection);
    els.sidebarPanel.insertBefore(basicSection, firstSection);
    els.sidebarPanel.insertBefore(datetimeSection, firstSection);
    els.sidebarPanel.insertBefore(solarTermSection, firstSection);
  } else if (title) {
    title.after(orderSection, basicSection, datetimeSection, solarTermSection);
  }

  const sections = [...els.sidebarPanel.querySelectorAll('.settings-section')];
  const weatherSection = sections.find((section) => section.querySelector('#weatherSettingsStatus'));
  if (weatherSection && !weatherSection.querySelector('[data-sidebar-widget-checkbox="weather"]')) {
    weatherSection.querySelector('h3')?.after(createSidebarWidgetCheckbox('weather', '날씨 위젯 표시'));
    wrapWidgetOptions(weatherSection, 'weather');
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
  widgets.forEach((widget, index) => {
    const item = document.createElement('div');
    item.className = 'sidebar-widget-order-item';
    item.draggable = true;
    item.dataset.index = String(index);
    item.innerHTML = `
      <span class="drag-handle" aria-hidden="true">≡</span>
      <span class="sidebar-widget-order-name">${widget.label}</span>
      <span class="sidebar-widget-order-state">${widget.visible === false ? '숨김' : '표시'}</span>
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
  els.checkVideoFirst.checked = !!state.draftConfig.player.videoFirstMode;
  els.checkAlwaysOnTop.checked = !!state.draftConfig.window.alwaysOnTop;
  els.checkPreventMin.checked = !!state.draftConfig.window.preventMinimize;
  if (els.inputSidebarWidth) {
    els.inputSidebarWidth.value = clampSidebarWidth(state.draftConfig.sidebar?.width);
  }
  if (els.inputLogoPath) {
    els.inputLogoPath.value = normalizeLogoPath(state.draftConfig.sidebar?.logoPath);
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
  renderPlaylist();
  showSlide(state.currentIndex);
  updateBackgroundWidgetTasks();
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
      widgets: normalizeSidebarWidgets(newConfig.sidebar?.widgets, newConfig.sidebar?.widgetDefaultsVersion),
      timetable: normalizeTimetableSettings(newConfig.sidebar?.timetable)
    },
    player: {
      ...deepClone(defaultConfig.player),
      ...deepClone(newConfig.player),
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
    state.draftConfig.player.transition = els.selectTransition.value;
    state.draftConfig.player.videoFirstMode = els.checkVideoFirst.checked;
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
    els.checkVideoFirst,
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
      activateLine4InBrowser();
    });

    els.browserTitleWidget.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      event.preventDefault();
      activateLine4InBrowser();
    });
  }

  els.btnFullscreen.addEventListener('click', async () => {
    state.isFullscreen = await window.desktopAPI.toggleFullscreen();
    updateToolbarVisibility();
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

  els.btnExit.addEventListener('click', () => {
    window.desktopAPI.requestQuit();
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
    applyLayout();
    applySidebarWidth(state.draftConfig.sidebar?.width);
    applySidebarLogo();
    applyBrowserSettings();
    applySettingsToForm();
    updateBackgroundWidgetTasks();
    renderPlaylist();
    showSlide(state.currentIndex);
    await syncDraftState();
    setPanelVisible(els.settingsPanel, false);
  });

  els.btnResetDefaults.addEventListener('click', async () => {
    state.draftConfig = mergeUIState(state.draftConfig, deepClone(defaultConfig));
    applyLayout();
    applySidebarWidth(state.draftConfig.sidebar?.width);
    applySidebarLogo();
    applyBrowserSettings();
    applySettingsToForm();
    updateBackgroundWidgetTasks();
    renderPlaylist();
    showSlide(0);
    await syncDraftState();
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

  els.browserView.addEventListener('dom-ready', () => {
    syncWebviewPopupPermission();
    applyBrowserZoom();
    suppressInPagePopups();
  }, { once: true });

  els.browserView.addEventListener('did-finish-load', () => {
    suppressInPagePopups();
    scheduleAutoActivateLine4(900);
  });

  els.browserView.addEventListener('did-stop-loading', () => {
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
  updateFullscreenButtonText();
}

function updateFullscreenButtonText() {
  if (els.btnFullscreen) {
    els.btnFullscreen.textContent = state.isFullscreen ? '전체화면 종료' : '전체화면 시작';
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

  if (shouldHoldUiVisible()) {
    return;
  }

  state.uiIdleTimer = setTimeout(() => {
    if (!shouldHoldUiVisible()) {
      document.body.classList.add('ui-idle');
    }
  }, 5000);
}

function bindActivityVisibility() {
  ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart'].forEach((eventName) => {
    window.addEventListener(eventName, markUserActive, { passive: true });
  });
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

  const weatherPart = state.weatherLastUpdatedAt
    ? `날씨 갱신 완료 ${formatHourMinute(state.weatherLastUpdatedAt)}`
    : '날씨 업데이트 대기 중';
  const stationCache = getSelectedStationCache();
  const timetablePart = stationCache?.updatedAt
    ? `시간표 갱신 ${formatHourMinute(stationCache.updatedAt)}`
    : '시간표 갱신 없음';
  els.weatherUpdateStatus.textContent = `${weatherPart} / ${timetablePart}`;
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
      showStatusOverride(`시간표 갱신 완료 ${formatHourMinute(new Date())}`);
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
  if (!isSidebarWidgetVisible('solarTerm')) {
    clearSolarTermWidget();
    return false;
  }

  const info = getSolarTermDisplayInfo();
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
  if (!isSidebarWidgetVisible('solarTerm')) {
    return;
  }

  const result = await window.desktopAPI.refreshSolarTermsYear(year);
  if (!isSidebarWidgetVisible('solarTerm')) {
    return;
  }

  if (result?.cache?.terms?.length) {
    state.solarTermYears[year] = result.cache;
    renderSolarTermWidget();
  }
}

async function loadSolarTermWidget() {
  if (state.solarTermLoading || !isSidebarWidgetVisible('solarTerm')) {
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
  if (!isSidebarWidgetVisible('solarTerm')) {
    if (state.solarTermTimer) {
      clearInterval(state.solarTermTimer);
      state.solarTermTimer = null;
    }
    clearSolarTermWidget();
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

function renderDailyAdviceWidget(advice = fallbackDailyAdvice) {
  if (!isSidebarWidgetVisible('dailyAdvice')) {
    clearDailyAdviceWidget();
    return;
  }

  const message = typeof advice.message === 'string' && advice.message.trim()
    ? advice.message.trim()
    : fallbackDailyAdvice.message;
  const author = typeof advice.author === 'string' ? advice.author.trim() : '';
  const authorProfile = typeof advice.authorProfile === 'string' ? advice.authorProfile.trim() : '';

  if (els.dailyAdviceMessage) {
    els.dailyAdviceMessage.textContent = message;
  }

  if (els.dailyAdviceAuthor) {
    const authorText = author ? (authorProfile ? `${author} · ${authorProfile}` : author) : '';
    els.dailyAdviceAuthor.textContent = authorText;
    els.dailyAdviceAuthor.classList.toggle('hidden', !authorText);
  }

  els.dailyAdviceWidget?.classList.remove('hidden');
}

async function loadDailyAdvice(forceRefresh = false) {
  if (state.adviceLoading || !isSidebarWidgetVisible('dailyAdvice')) {
    return;
  }

  state.adviceLoading = true;
  try {
    const result = await window.desktopAPI.getDailyAdvice(forceRefresh);
    if (!isSidebarWidgetVisible('dailyAdvice')) {
      clearDailyAdviceWidget();
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

  if (!isSidebarWidgetVisible('dailyAdvice')) {
    return;
  }

  state.adviceTimer = setTimeout(async () => {
    state.adviceTimer = null;
    await loadDailyAdvice(true);
    scheduleNextDailyAdviceRefresh();
  }, getNextAdviceRefreshDelay());
}

function syncDailyAdviceUpdates() {
  if (!isSidebarWidgetVisible('dailyAdvice')) {
    if (state.adviceTimer) {
      clearTimeout(state.adviceTimer);
      state.adviceTimer = null;
    }
    clearDailyAdviceWidget();
    return;
  }

  loadDailyAdvice(false);
  scheduleNextDailyAdviceRefresh();
}

function describeAirQuality(aqi) {
  if (!Number.isFinite(aqi)) {
    return '\uB300\uAE30\uC9C8 \uD655\uC778 \uC911';
  }
  if (aqi <= 20) return '\uB300\uAE30\uC9C8 \uB9E4\uC6B0 \uC88B\uC74C';
  if (aqi <= 40) return '\uB300\uAE30\uC9C8 \uC88B\uC74C';
  if (aqi <= 60) return '\uB300\uAE30\uC9C8 \uBCF4\uD1B5';
  if (aqi <= 80) return '\uB300\uAE30\uC9C8 \uB098\uC068';
  return '\uB300\uAE30\uC9C8 \uB9E4\uC6B0 \uB098\uC068';
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
  const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=european_aqi&timezone=Asia%2FSeoul`;

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
    els.weatherAirQuality.textContent = describeAirQuality(Number(air.current?.european_aqi)).replace(/^대기질\s*/, '');
    els.weatherHigh.textContent = `\uCD5C\uACE0 ${Math.round(Number(daily.temperature_2m_max?.[0]))}\u00B0`;
    els.weatherLow.textContent = `\uCD5C\uC800 ${Math.round(Number(daily.temperature_2m_min?.[0]))}\u00B0`;
    els.weatherSunTime.textContent = formatHourMinute(sunValue);
    els.weatherPrecip.textContent = `${Number.isFinite(Number(precip)) ? Math.round(Number(precip)) : 0}%`;
    state.weatherLastUpdatedAt = new Date().toISOString();
    updateStatusToast();
  } catch (err) {
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
    els.sidebarClock.textContent = `${period} ${hours12}:${minutes}:${seconds}`;
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
