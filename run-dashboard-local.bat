@echo off
setlocal

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-dashboard-local.ps1"
if errorlevel 1 (
  echo [ERROR] Local dashboard launch failed.
  pause
  exit /b 1
)

endlocal
