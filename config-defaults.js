(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.dashboardConfigDefaults = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DEFAULT_LOGO_RELATIVE_PATH = 'files/logos/ncuc_logo.png';
  const DEFAULT_BROWSER_ZOOM_PERCENT = 125;
  const SIDEBAR_WIDGET_DEFAULTS_VERSION = 6;
  const DEFAULT_DRAG_REPLAY_GESTURE = {
    startXRatio: 0.8,
    startYRatio: 0.05,
    endXRatio: 0.18,
    endYRatio: 1,
    durationMs: 120
  };

  const defaultSidebarWidgets = [
    { id: 'logo', label: '로고', visible: true },
    { id: 'station', label: '현재 역명', visible: true },
    { id: 'datetime', label: '날짜/시간', visible: true },
    { id: 'weather', label: '날씨', visible: true },
    { id: 'multiInfo', label: '멀티 위젯', visible: true },
    { id: 'solarTerm', label: '24절기', visible: false },
    { id: 'dailyAdvice', label: '오늘의 한마디', visible: false },
    { id: 'trainSchedule', label: '열차 시간표', visible: false }
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeBrowserZoomPercent(value) {
    const numeric = Number.parseFloat(value);
    if (!Number.isFinite(numeric)) {
      return DEFAULT_BROWSER_ZOOM_PERCENT;
    }
    // Accept legacy factor values such as 1.25 and persist/display them as percent values.
    const percent = numeric > 0 && numeric <= 3
      ? numeric * 100
      : numeric;
    return Math.min(300, Math.max(25, Math.round(percent)));
  }

  function createDefaultConfig(overrides = {}) {
    const sidebarOverrides = overrides.sidebar || {};

    return {
      layout: {
        splitRatio: '7:3',
        borderEnabled: false,
        panelSwapped: false
      },
      browser: {
        url: 'https://smss.seoulmetro.co.kr/traininfo/traininfoUserView.do',
        popupMode: 'block',
        zoomPercent: DEFAULT_BROWSER_ZOOM_PERCENT,
        dragReplay: {
          enabled: true,
          gesture: clone(DEFAULT_DRAG_REPLAY_GESTURE),
          defaultGesture: clone(DEFAULT_DRAG_REPLAY_GESTURE)
        },
        autoRefresh: {
          enabled: true,
          intervalHours: 6
        }
      },
      player: {
        transition: 'slide',
        playlist: []
      },
      window: {
        alwaysOnTop: true,
        preventMinimize: true,
        autoStart: true,
        startFullscreen: true
      },
      ui: {
        adminOptionsEnabled: false
      },
      maintenance: {
        autoUpdateEnabled: true,
        updateTime: '01:00',
        unavailableStartTime: '02:00',
        unavailableEndTime: '04:30'
      },
      sidebar: {
        width: 350,
        logoPath: sidebarOverrides.logoPath || DEFAULT_LOGO_RELATIVE_PATH,
        widgetDefaultsVersion: SIDEBAR_WIDGET_DEFAULTS_VERSION,
        widgets: defaultSidebarWidgets.map((widget) => ({ ...widget })),
        multiWidget: {
          enabledItems: ['solarTerm', 'dailyAdvice'],
          transition: 'slide',
          intervalSeconds: 10
        },
        timetable: {
          stationName: '별내별가람역',
          stationId: '0408',
          stationCode: '408',
          direction: '하행',
          displayFormat: 'table'
        }
      }
    };
  }

  return {
    DEFAULT_LOGO_RELATIVE_PATH,
    DEFAULT_BROWSER_ZOOM_PERCENT,
    normalizeBrowserZoomPercent,
    DEFAULT_DRAG_REPLAY_GESTURE: clone(DEFAULT_DRAG_REPLAY_GESTURE),
    SIDEBAR_WIDGET_DEFAULTS_VERSION,
    defaultSidebarWidgets: clone(defaultSidebarWidgets),
    createDefaultConfig
  };
});
