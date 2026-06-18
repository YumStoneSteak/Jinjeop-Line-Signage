@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"
chcp 65001 >nul

set "REPO=YumStoneSteak/Jinjeop-Line-Signage"
set "GH_EXE="

where gh >nul 2>&1
if not errorlevel 1 set "GH_EXE=gh"

if not defined GH_EXE if exist "%ProgramFiles%\GitHub CLI\gh.exe" (
  set "GH_EXE=%ProgramFiles%\GitHub CLI\gh.exe"
)

if not defined GH_EXE if exist "%LocalAppData%\Programs\GitHub CLI\gh.exe" (
  set "GH_EXE=%LocalAppData%\Programs\GitHub CLI\gh.exe"
)

if not defined GH_EXE (
  echo [ERROR] GitHub CLI was not found.
  echo Install it from https://cli.github.com/ and run: gh auth login
  pause
  exit /b 1
)

where git >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git was not found. Install Git for Windows first.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found. Install Node.js LTS first.
  pause
  exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm was not found. Install Node.js LTS first.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo [ERROR] package.json was not found. Run this file from the project folder.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%v in (`node -p "require('./package.json').version"`) do set "APP_VERSION=%%v"
if not defined APP_VERSION (
  echo [ERROR] Could not read version from package.json.
  pause
  exit /b 1
)

set "TAG=v%APP_VERSION%"
set "INSTALLER=dist\Jinjeop Line Signage v%APP_VERSION%.exe"
set "BLOCKMAP=dist\Jinjeop Line Signage v%APP_VERSION%.exe.blockmap"
set "LATEST=dist\latest.yml"
set "NOTES=RELEASE_NOTES.md"

if not exist "%NOTES%" (
  set "NOTES=%TEMP%\jinjeop-line-signage-release-notes-%APP_VERSION%.md"
  > "%NOTES%" echo # Jinjeop Line Signage %TAG%
  >> "%NOTES%" echo.
  >> "%NOTES%" echo NSIS installer release for Jinjeop Line Signage.
)

echo.
echo Release target: %REPO% %TAG%
echo.

"%GH_EXE%" auth status
if errorlevel 1 (
  echo.
  echo [ERROR] GitHub CLI is not authenticated.
  echo Run: "%GH_EXE%" auth login --hostname github.com --git-protocol https --web --scopes repo
  pause
  exit /b 1
)

if not exist "node_modules\electron\dist\electron.exe" (
  echo Installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo [ERROR] Dependency installation failed.
    pause
    exit /b 1
  )
)

echo Running maintenance verification...
call npm.cmd run verify:maintenance
if errorlevel 1 (
  echo [ERROR] Maintenance verification failed.
  pause
  exit /b 1
)

echo Building installer...
call npm.cmd run build
if errorlevel 1 (
  echo [ERROR] Build failed.
  pause
  exit /b 1
)

if not exist "%INSTALLER%" (
  echo [ERROR] Installer was not found: %INSTALLER%
  pause
  exit /b 1
)

if not exist "%BLOCKMAP%" (
  echo [ERROR] Blockmap was not found: %BLOCKMAP%
  pause
  exit /b 1
)

if not exist "%LATEST%" (
  echo [ERROR] latest.yml was not found: %LATEST%
  pause
  exit /b 1
)

set "HAS_CHANGES="
for /f "delims=" %%s in ('git status --porcelain') do set "HAS_CHANGES=1"
if defined HAS_CHANGES (
  echo Committing working tree changes...
  git add .
  if errorlevel 1 (
    echo [ERROR] git add failed.
    pause
    exit /b 1
  )
  git commit -m "Release %TAG%"
  if errorlevel 1 (
    echo [ERROR] git commit failed.
    pause
    exit /b 1
  )
) else (
  echo No source changes to commit.
)

for /f "delims=" %%h in ('git rev-parse HEAD') do set "HEAD_COMMIT=%%h"
git rev-parse "%TAG%" >nul 2>&1
if errorlevel 1 (
  git tag "%TAG%"
  if errorlevel 1 (
    echo [ERROR] git tag failed.
    pause
    exit /b 1
  )
) else (
  for /f "delims=" %%h in ('git rev-parse "%TAG%"') do set "TAG_COMMIT=%%h"
  if /i not "!TAG_COMMIT!"=="!HEAD_COMMIT!" (
    echo [ERROR] Tag %TAG% already exists on another commit.
    echo Bump package.json version before publishing a new release.
    pause
    exit /b 1
  )
)

echo Pushing branch and tag...
git push origin HEAD
if errorlevel 1 (
  echo [ERROR] git push failed.
  pause
  exit /b 1
)

git push origin "%TAG%"
if errorlevel 1 (
  echo [ERROR] git tag push failed.
  pause
  exit /b 1
)

"%GH_EXE%" release view "%TAG%" --repo "%REPO%" >nul 2>&1
if errorlevel 1 (
  echo Creating GitHub release...
  "%GH_EXE%" release create "%TAG%" --repo "%REPO%" --title "Jinjeop Line Signage %TAG%" --notes-file "%NOTES%" "%INSTALLER%" "%BLOCKMAP%" "%LATEST%"
  if errorlevel 1 (
    echo [ERROR] GitHub release creation failed.
    pause
    exit /b 1
  )
) else (
  echo Updating existing GitHub release assets...
  "%GH_EXE%" release upload "%TAG%" --repo "%REPO%" --clobber "%INSTALLER%" "%BLOCKMAP%" "%LATEST%"
  if errorlevel 1 (
    echo [ERROR] GitHub release asset upload failed.
    pause
    exit /b 1
  )
  "%GH_EXE%" release edit "%TAG%" --repo "%REPO%" --title "Jinjeop Line Signage %TAG%" --notes-file "%NOTES%"
  if errorlevel 1 (
    echo [ERROR] GitHub release note update failed.
    pause
    exit /b 1
  )
)

echo.
echo Release complete: %TAG%
pause
endlocal
