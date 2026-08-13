!macro CloseIfRunning PROCESS_EXE
  DetailPrint "Closing ${PROCESS_EXE} before upgrade if it is running."
  nsExec::ExecToLog 'taskkill /IM "${PROCESS_EXE}" /T /F'
  Pop $0
!macroend

!macro ApplyNcucShortcutIcon SHORTCUT_PATH
  ${if} ${FileExists} "${SHORTCUT_PATH}"
    CreateShortCut "${SHORTCUT_PATH}" "$appExe" "" "$INSTDIR\files\icons\ncuc.ico" 0 "" "" "${APP_DESCRIPTION}"
    ClearErrors
    WinShell::SetLnkAUMI "${SHORTCUT_PATH}" "${APP_ID}"
  ${endIf}
!macroend

!macro customInit
  ; Stop the unattended watchdog before replacing files so it cannot restart
  ; the application in the middle of a manual installer upgrade.
  nsExec::ExecToLog 'schtasks /End /TN "JinjeopLineSignageWatchdog"'
  Pop $0
  ; Older releases used English executable names. v2.2.0 briefly used a Korean
  ; executable name, so close both forms before NSIS checks/replaces files.
  !insertmacro CloseIfRunning "Jinjeop Line Signage.exe"
  !insertmacro CloseIfRunning "Jinjeop Line Signage 2.0.0.exe"
  !insertmacro CloseIfRunning "Jinjeop Line Signage 2.0.1.exe"
  !insertmacro CloseIfRunning "진접선 행선안내 사이니지.exe"
!macroend

!macro customInstall
  ; Force shortcuts to use the bundled NCUC icon even if Windows keeps the
  ; executable's default Electron icon in its shortcut cache.
  !insertmacro ApplyNcucShortcutIcon "$newDesktopLink"
  !insertmacro ApplyNcucShortcutIcon "$newStartMenuLink"
  nsExec::ExecToLog 'schtasks /Run /TN "JinjeopLineSignageWatchdog"'
  Pop $0
  System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
!macroend

!macro customUnInstall
  ; Remove the external watchdog with the application so it cannot keep polling
  ; or try to launch an executable that no longer exists.
  nsExec::ExecToLog 'schtasks /End /TN "JinjeopLineSignageWatchdog"'
  Pop $0
  nsExec::ExecToLog 'schtasks /Delete /F /TN "JinjeopLineSignageWatchdog"'
  Pop $0
!macroend
