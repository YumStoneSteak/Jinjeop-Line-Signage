# Jinjeop Line Signage 배포 가이드

이 문서는 GitHub Releases에 새 버전을 올리는 절차를 정리합니다.
자동 업데이트는 GitHub Release에 올라간 `latest.yml`, `.blockmap`, NSIS 설치 파일을 기준으로 동작합니다.

## 1. 준비

배포 PC에는 다음 프로그램이 필요합니다.

- Node.js LTS
- Git for Windows
- GitHub CLI

처음 한 번만 GitHub CLI 로그인을 진행합니다.

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" auth login --hostname github.com --git-protocol https --web --scopes repo
```

로그인 확인:

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" auth status
```

## 2. 버전 수정

배포 전에 `package.json`의 `version` 값을 새 버전으로 바꿉니다.

예:

```json
"version": "2.2.2"
```

같이 확인할 파일:

- `README.md`
- `MANUAL.md`
- `RELEASE_NOTES.md`

`RELEASE_NOTES.md`는 GitHub Release 본문으로 사용됩니다. 한글이 깨지지 않도록 UTF-8로 저장합니다.

## 3. 자동 배포 BAT 사용

프로젝트 폴더에서 다음 파일을 실행합니다.

```powershell
.\release-github.bat
```

이 BAT가 수행하는 작업:

1. GitHub CLI 로그인 상태 확인
2. 유지보수 시간 설정 검증
3. NSIS 설치 파일 빌드
4. 변경된 소스 파일 커밋
5. `v패키지버전` 태그 생성
6. `main` 브랜치와 태그 push
7. GitHub Release 생성 또는 기존 Release 갱신
8. 설치 파일, blockmap, `latest.yml` 업로드

배포 파일명은 `package.json` 버전을 기준으로 자동 결정됩니다.

```text
dist\Jinjeop.Line.Signage.v버전.exe
dist\Jinjeop.Line.Signage.v버전.exe.blockmap
dist\latest.yml
```

## 4. 수동 빌드만 실행

릴리즈 업로드 없이 설치 파일만 만들려면 다음 파일을 실행합니다.

```powershell
.\build-installer.bat
```

또는:

```powershell
npm.cmd run build
```

## 5. GitHub Desktop으로 수동 배포

GitHub Desktop만 사용해도 소스 코드는 올릴 수 있습니다.

1. GitHub Desktop에서 변경 파일을 확인합니다.
2. 커밋 메시지를 입력하고 **Commit to main**을 누릅니다.
3. **Push origin**을 누릅니다.
4. 터미널에서 `.\build-installer.bat`를 실행해 설치 파일을 만듭니다.
5. GitHub 웹사이트의 저장소에서 **Releases > Draft a new release**를 엽니다.
6. 태그를 `v패키지버전` 형식으로 만듭니다. 예: `v2.2.2`
7. 제목을 `Jinjeop Line Signage v패키지버전`으로 입력합니다.
8. `RELEASE_NOTES.md` 내용을 Release description에 붙여넣습니다.
9. 다음 세 파일을 업로드합니다.

```text
dist\Jinjeop.Line.Signage.v버전.exe
dist\Jinjeop.Line.Signage.v버전.exe.blockmap
dist\latest.yml
```

10. **Publish release**를 누릅니다.

자동 업데이트까지 정상 동작하려면 세 파일을 모두 올려야 합니다.

## 6. 문제 해결

- `gh auth status`에서 token invalid가 나오면 `gh auth login`을 다시 실행합니다.
- 같은 버전 태그가 이미 다른 커밋에 있으면 `package.json` 버전을 올린 뒤 다시 배포합니다.
- Release는 만들어졌는데 자동 업데이트가 안 되면 `latest.yml`이 Release asset에 포함되어 있는지 확인합니다.
- 설치 파일명은 반드시 `Jinjeop.Line.Signage.v버전.exe` 형식이어야 합니다.
