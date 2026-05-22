# Namyangju Jinjeop Line Digital Signage

남양주도시공사 진접선 열차 행선안내 현시용 Electron 디지털 사이니지 앱입니다.

## 프로젝트 개요

이 프로젝트는 Windows 기반 역사 안내기 PC와 65인치 FHD 디스플레이 운영 환경을 전제로 만든 디지털 사이니지 앱입니다. 중앙에는 열차 위치 정보 웹 화면을 표시하고, 우측에는 공지 이미지/영상 영역을 구성하며, 좌측 사이드바에는 역명, 날짜/시간, 24절기, 날씨, 열차 시간표 위젯을 표시할 수 있습니다.

현재 버전은 React/Vite를 사용하지 않고 Electron 렌더러에서 HTML, CSS, Vanilla JavaScript로 구현되어 있습니다.

## 주요 기능

- 지하철 역사 내 65인치 FHD 행선안내기용 화면 구성
- 프레임리스 창 기반의 전체화면 유사 운영 모드
- 기존 상단 툴바를 창 드래그 영역과 설정 진입 UI로 사용
- 중앙 웹뷰를 통한 열차 위치 정보 화면 표시
- 웹사이트 팝업 금지 옵션 및 서울교통공사 웹 화면 팝업 차단 보강
- 좌측 사이드바 오버레이 및 너비 조절
- 좌측 바 위젯 표시 여부와 표시 순서 설정
- 역명, 날짜/시간, 24절기, 날씨, 열차 시간표 위젯
- Open-Meteo 기반 날씨 및 대기질 정보 표시
- 서울교통공사 시간표 페이지 기반의 정적 시간표 캐시와 다음 열차 표시
- 우측 공지 게시판 이미지/영상 재생
- 오프라인 운영을 고려한 로컬 설정 및 캐시 구조
- watchdog 기반 실행 배치 파일 제공

## 기술 스택

- Electron 33
- JavaScript
- HTML
- CSS
- Node.js
- electron-builder

## 실행 방법

### 1. 의존성 설치

```powershell
npm install
```

### 2. 개발 실행

```powershell
npm start
```

### 3. 배치 파일로 실행

더블클릭 실행용 배치 파일은 아래 두 개입니다.

```powershell
.\run-dashboard.bat
.\start-dashboard.bat
```

`start-dashboard.bat`는 `run-dashboard.bat`를 호출하는 호환용 파일입니다. 둘 중 하나를 실행하면 의존성이 없을 때 `install-deps.bat`를 먼저 실행한 뒤 앱을 시작합니다.

### 4. Windows 빌드

```powershell
npm run build
```

빌드 결과는 `dist` 폴더에 생성됩니다. `dist`는 빌드 산출물이므로 Git에는 포함하지 않습니다.

무설치 portable 앱만 만들 때는 아래 파일을 더블클릭합니다.

```powershell
.\build-portable.bat
```

portable 빌드 결과도 `dist` 폴더에 생성됩니다.

## 폴더 구조

```text
.
├── main.js                 # Electron 메인 프로세스, 창 제어, IPC, 설정/캐시 처리
├── preload.js              # 렌더러와 메인 프로세스 사이의 안전한 브리지 API
├── launcher.js             # watchdog 실행기
├── start-dashboard.bat     # 운영용 실행 배치 파일
├── package.json            # 앱 정보, 스크립트, 빌드 설정
├── package-lock.json       # npm 의존성 잠금 파일
├── renderer/
│   ├── index.html          # 화면 구조
│   ├── styles.css          # 사이드바, 타이틀, 설정 패널, 위젯 스타일
│   └── renderer.js         # 렌더러 로직, 웹뷰, 위젯, 설정 UI, 미디어 재생
└── files/                  # 공지 이미지 등 앱 리소스 파일
```

## 리소스 파일 위치

- 기본 로고: 실행 파일 기준 `files/logos/ncuc_logo.png`
- 로고 보관: `files/logos/`
- 공지 이미지/영상: `files/notices/`
- 빌드용 앱 아이콘: `files/icons/ncuc.ico`
- 일반 PNG/JPG 이미지 리소스: `files/images/`

좌측 바의 회사 로고는 앱 안의 `좌측 바 > 기본 정보 설정 > 로고 파일 경로`에서 변경할 수 있습니다. 기본값은 실행 파일 기준 `files/logos/ncuc_logo.png`입니다.

## 운영 환경

- Windows 기반 역사 내 안내기 PC
- 65인치 FHD 디스플레이
- 키오스크 또는 디지털 사이니지 형태의 상시 운영
- Windows 작업표시줄 자동 숨김 사용을 전제로 한 프레임리스 창 운영

## 설정과 캐시

앱 설정은 Electron `userData` 경로의 `config.json`에 저장됩니다. 주요 설정은 시작 URL, 팝업 차단, 스크롤 좌표, 확대 비율, 좌우 분할 비율, 좌측 바 너비, 위젯 표시 여부와 순서, 공지 재생 목록입니다.

시간표와 24절기 정보는 네트워크 실패에 대비해 로컬 캐시를 사용합니다.

## 주의사항

- 열차 시간표 위젯은 정적 시간표 기준이며 실시간 열차 운행 정보가 아닙니다.
- 열차운행 상황에 따라 실제 도착 및 운행 정보는 변동될 수 있습니다.
- API 키, 내부망 주소, 계정, 비밀번호, 토큰, 개인정보는 커밋하지 않습니다.
- 운영 PC별 설정 파일과 로그 파일은 Git에 포함하지 않습니다.
- 현재 렌더러는 React/Vite가 아닌 순수 HTML/CSS/JavaScript 구조입니다.

## 향후 개선 예정

- 위젯 추가 및 위젯별 상세 설정 개선
- 설정 UI 가독성 추가 개선
- 역사별 좌표 기반 날씨 자동 반영
- 열차 시간표 표시 형식 개선
- 배포 자동화 및 릴리스 패키징 정리
