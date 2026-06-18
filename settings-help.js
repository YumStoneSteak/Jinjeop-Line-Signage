(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.dashboardSettingsHelp = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  return {
    selectSplitRatio: '열차 위치 정보 영역과 공지 영역의 가로 비율을 정합니다.',
    checkAlwaysOnTop: '다른 프로그램 창보다 사이니지 창을 앞에 유지합니다.',
    checkPreventMin: '실수로 창이 최소화되지 않도록 최소화 동작을 막습니다.',
    checkStartFullscreen: '앱을 시작하면 저장된 설정을 기준으로 전체 화면 사이니지 모드로 실행합니다.',
    checkAutoStart: 'Windows 부팅 후 이 앱을 자동으로 실행하도록 시작 프로그램에 등록합니다.',
    checkAutoUpdateEnabled: '설정한 업데이트 시간에 새 릴리즈를 확인하고 내려받은 업데이트를 자동 설치합니다.',
    inputUpdateTime: '자동 업데이트를 확인할 시간입니다. 기본값은 01:00입니다.',
    inputUnavailableStartTime: 'PC 종료 시간입니다. 이 시간부터 자동 업데이트와 자동 갱신을 보류합니다.',
    inputUnavailableEndTime: 'PC 부팅 시간입니다. 이 시간 이후 자동 업데이트와 자동 갱신을 다시 실행합니다.',
    checkAdminOptions: '일반 운영 중에는 숨겨도 되는 관리자용 설정을 표시합니다.',
    inputUrl: '열차 위치 정보 화면을 열 주소입니다. 특별한 이유가 없으면 기본값을 유지합니다.',
    inputZoomPercent: '열차 위치 정보 webview에 적용할 기본 웹 확대 비율입니다.',
    checkTrainAutoRefreshEnabled: '지정한 주기마다 열차 위치 정보 화면을 새로고침하고 4호선, 확대, 드래그 보정을 다시 적용합니다.',
    inputTrainAutoRefreshHours: '열차 위치 정보 자동 새로고침 간격입니다. PC 종료 시간대에는 실행하지 않습니다.',
    checkBlockPopups: '열차 위치 정보 페이지에서 뜨는 불필요한 팝업을 차단합니다.',
    selectPopupMode: '팝업을 허용할 때 별도 창으로 열지, 현재 열차 위치 화면에서 열지 선택합니다.',
    checkDragReplayEnabled: '새로고침 후 저장된 드래그 동작을 자동으로 재생해 화면 위치를 보정합니다.',
    btnStartDragRecord: '현재 열차 위치 화면에서 원하는 위치로 드래그해 보정값을 녹화합니다.',
    btnClearDragRecord: '저장된 드래그 보정값을 지우고 기본 보정값으로 되돌립니다.',
    btnSaveDragReplayDefault: '현재 드래그 보정값을 초기화 후에도 유지되는 기본값으로 저장합니다.',
    inputDragStartXPercent: '드래그를 시작할 화면 가로 위치입니다.',
    inputDragStartYPercent: '드래그를 시작할 화면 세로 위치입니다.',
    inputDragEndXPercent: '드래그가 끝날 화면 가로 위치입니다.',
    inputDragEndYPercent: '드래그가 끝날 화면 세로 위치입니다.',
    inputDragDurationMs: '드래그를 재생하는 시간입니다. 값이 클수록 천천히 움직입니다.',
    inputLogoPath: '좌측 바에 표시할 로고 이미지 경로입니다.',
    inputSidebarWidth: '좌측 정보 바의 폭을 픽셀 단위로 조정합니다.',
    checkSidebarWidget_multiInfo: '24절기와 오늘의 한마디를 한 카드에서 번갈아 표시합니다.',
    selectTrainStation: '시간표와 날씨 위치 기준으로 사용할 역입니다. 첫 설치 시 반드시 선택해야 합니다.'
  };
});
