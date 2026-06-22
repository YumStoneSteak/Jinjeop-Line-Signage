# Jinjeop Line Signage v2.3.2

## 주요 변경
- 서울교통공사 열차 위치 정보 화면이 새로고침이나 화면 보정 이후 `POST /traininfo/traininfoUserMap.do` 요청을 멈출 수 있던 문제를 수정했습니다.
- 하단 상태 표시의 `웹 alive` 문구를 실제 데이터 갱신 기준인 `웹 POST 성공` 시간으로 바꿨습니다. 이제 페이지 안의 단순 타이머가 아니라, 실제 열차 위치 정보 POST 요청이 성공한 시간을 보여줍니다.
- 약 5초마다 발생해야 하는 열차 위치 정보 POST 흐름이 멈췄는지 감시하는 watchdog을 추가했습니다. 실제 POST 성공이 일정 시간 없을 때만 SMSS 웹 화면을 복구 새로고침합니다.
- v2.3.1에서 추가된 첫 현재역 저장 후 4호선 보정 흐름을 조정했습니다. 이미 SMSS 화면이 활성 상태일 때는 불필요한 강제 새로고침을 하지 않고 4호선 보정만 유지합니다.
- 숨김 상태에서 더 오래 실행하며 POST 흐름을 확인할 수 있도록 `--smoke-test-duration-ms=` 테스트 옵션을 추가했습니다.

## 배포 파일
- `Jinjeop.Line.Signage.v2.3.2.exe`
- `Jinjeop.Line.Signage.v2.3.2.exe.blockmap`
- `latest.yml`
