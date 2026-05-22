(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.dashboardConfigDefaults = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DEFAULT_LOGO_RELATIVE_PATH = 'files/logos/ncuc_logo.png';
  const SIDEBAR_WIDGET_DEFAULTS_VERSION = 6;

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
        zoomPercent: 125
      },
      player: {
        transition: 'slide',
        playlist: []
      },
      window: {
        alwaysOnTop: true,
        preventMinimize: true
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
    SIDEBAR_WIDGET_DEFAULTS_VERSION,
    defaultSidebarWidgets: clone(defaultSidebarWidgets),
    createDefaultConfig
  };
});
