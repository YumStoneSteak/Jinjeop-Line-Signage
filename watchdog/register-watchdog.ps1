param(
  [Parameter(Mandatory = $true)][string]$TaskName,
  [string]$ExecutablePath,
  [string]$WatchdogScriptPath,
  [string]$HeartbeatPath,
  [string]$PausePath,
  [string]$QuietStart = '01:20',
  [string]$QuietEnd = '04:30',
  [switch]$Disable
)

$ErrorActionPreference = 'Stop'

if ($Disable) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Output 'disabled'
  exit 0
}

foreach ($requiredPath in @($ExecutablePath, $WatchdogScriptPath)) {
  if (-not (Test-Path -LiteralPath $requiredPath)) {
    throw "Required path does not exist: $requiredPath"
  }
}

function Quote-Argument([string]$Value) {
  return '"' + $Value.Replace('"', '\"') + '"'
}

$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$arguments = @(
  '-NoProfile',
  '-ExecutionPolicy', 'Bypass',
  '-WindowStyle', 'Hidden',
  '-File', (Quote-Argument $WatchdogScriptPath),
  '-ExecutablePath', (Quote-Argument $ExecutablePath),
  '-HeartbeatPath', (Quote-Argument $HeartbeatPath),
  '-PausePath', (Quote-Argument $PausePath),
  '-QuietStart', $QuietStart,
  '-QuietEnd', $QuietEnd
) -join ' '

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
$principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -Hidden `
  -MultipleInstances IgnoreNew `
  -RestartCount 10 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings `
  -Description 'Keeps Jinjeop Line Signage running during the unattended operating window.' `
  -Force | Out-Null

Write-Output 'registered'
