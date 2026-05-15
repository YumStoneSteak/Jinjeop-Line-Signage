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

if not exist "files\icons\ncuc.ico" (
  echo [ERROR] App icon not found: files\icons\ncuc.ico
  echo Put the build icon at "%~dp0files\icons\ncuc.ico" and run this file again.
  pause
  exit /b 1
)

if not exist "node_modules\electron\dist\electron.exe" (
  echo Electron runtime is missing. Installing dependencies first...
  call "%~dp0install-deps.bat"
  if errorlevel 1 exit /b 1
)

echo Building portable Windows app...
if exist "node_modules\.bin\electron-builder.cmd" (
  call "node_modules\.bin\electron-builder.cmd" --win portable
) else (
  call npx electron-builder --win portable
)

if errorlevel 1 (
  echo [ERROR] Portable build failed.
  pause
  exit /b 1
)

echo Portable build complete. Check the dist folder.
pause
endlocal
