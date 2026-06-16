@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found. Install Node.js LTS first.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm was not found. Install Node.js LTS first.
  pause
  exit /b 1
)

if not exist "node_modules\electron\dist\electron.exe" (
  echo Electron runtime is missing. Installing dependencies first...
  call "%~dp0install-deps.bat"
  if errorlevel 1 exit /b 1
)

echo Building NSIS Windows installer...
call npm run build

if errorlevel 1 (
  echo [ERROR] NSIS installer build failed.
  pause
  exit /b 1
)

echo NSIS installer build complete. Check the dist folder.
pause
endlocal
