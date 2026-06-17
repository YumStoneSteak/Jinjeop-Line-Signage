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

if not exist "package.json" (
  echo [ERROR] package.json was not found. Run this file from the project folder.
  pause
  exit /b 1
)

if not exist "node_modules\electron\dist\electron.exe" (
  echo Electron runtime is missing. Installing dependencies first...
  call npm install
  if errorlevel 1 (
    echo [ERROR] Dependency installation failed.
    pause
    exit /b 1
  )
)

echo Running maintenance schedule verification...
call npm run verify:maintenance
if errorlevel 1 (
  echo [ERROR] Maintenance verification failed.
  pause
  exit /b 1
)

echo Starting Jinjeop Line Signage in development mode...
call npm start
if errorlevel 1 (
  echo [ERROR] Development launch failed.
  pause
  exit /b 1
)

endlocal
