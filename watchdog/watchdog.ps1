param(
  [Parameter(Mandatory = $true)][string]$ExecutablePath,
  [Parameter(Mandatory = $true)][string]$HeartbeatPath,
  [Parameter(Mandatory = $true)][string]$PausePath,
  [string]$QuietStart = '01:20',
  [string]$QuietEnd = '04:30'
)

$ErrorActionPreference = 'SilentlyContinue'
$processName = [System.IO.Path]::GetFileNameWithoutExtension($ExecutablePath)
$logPath = Join-Path ([System.IO.Path]::GetDirectoryName($HeartbeatPath)) 'logs\watchdog.log'
$maxLogBytes = 1MB

function Write-WatchdogLog([string]$Message) {
  $directory = [System.IO.Path]::GetDirectoryName($logPath)
  [System.IO.Directory]::CreateDirectory($directory) | Out-Null
  if ((Test-Path -LiteralPath $logPath) -and (Get-Item -LiteralPath $logPath).Length -ge $maxLogBytes) {
    $backup = "$logPath.1"
    Remove-Item -LiteralPath $backup -Force -ErrorAction SilentlyContinue
    Move-Item -LiteralPath $logPath -Destination $backup -Force
  }
  Add-Content -LiteralPath $logPath -Value "$(Get-Date -Format o) $Message" -Encoding UTF8
}

function Convert-TimeToMinute([string]$Value) {
  $parts = $Value.Split(':')
  if ($parts.Count -ne 2) { return 0 }
  return ([int]$parts[0] * 60) + [int]$parts[1]
}

function Test-QuietWindow {
  $now = Get-Date
  $minute = ($now.Hour * 60) + $now.Minute
  $start = Convert-TimeToMinute $QuietStart
  $end = Convert-TimeToMinute $QuietEnd
  if ($start -lt $end) { return $minute -ge $start -and $minute -lt $end }
  return $minute -ge $start -or $minute -lt $end
}

function Test-WatchdogPaused {
  if (-not (Test-Path -LiteralPath $PausePath)) { return $false }
  try {
    $pause = Get-Content -LiteralPath $PausePath -Raw -Encoding UTF8 | ConvertFrom-Json
    return [DateTimeOffset]::Parse($pause.until) -gt [DateTimeOffset]::Now
  } catch {
    return $false
  }
}

function Get-Heartbeat {
  if (-not (Test-Path -LiteralPath $HeartbeatPath)) { return $null }
  try {
    return Get-Content -LiteralPath $HeartbeatPath -Raw -Encoding UTF8 | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Get-TargetProcess($Heartbeat) {
  if ($null -ne $Heartbeat -and $Heartbeat.processId) {
    $candidate = Get-Process -Id ([int]$Heartbeat.processId) -ErrorAction SilentlyContinue
    if ($null -ne $candidate -and $candidate.Path -eq $ExecutablePath) { return $candidate }
  }
  return Get-Process -Name $processName -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -eq $ExecutablePath } |
    Select-Object -First 1
}

function Start-TargetApplication {
  if (-not (Test-Path -LiteralPath $ExecutablePath)) {
    Write-WatchdogLog "Executable missing: $ExecutablePath"
    return
  }
  Start-Process -FilePath $ExecutablePath -ArgumentList '--autostart'
  Write-WatchdogLog 'Application start requested.'
}

Start-Sleep -Seconds 15
Write-WatchdogLog "Watchdog started. quiet=$QuietStart~$QuietEnd"

while ($true) {
  if (Test-QuietWindow) {
    Start-Sleep -Seconds 30
    continue
  }
  if (Test-WatchdogPaused) {
    Start-Sleep -Seconds 30
    continue
  }

  $heartbeat = Get-Heartbeat
  $target = Get-TargetProcess $heartbeat
  if ($null -eq $target) {
    Start-TargetApplication
    Start-Sleep -Seconds 180
    continue
  }

  $processAgeSeconds = ((Get-Date) - $target.StartTime).TotalSeconds
  $heartbeatAgeSeconds = [double]::PositiveInfinity
  if ($null -ne $heartbeat -and $heartbeat.mainAliveAt) {
    try {
      $heartbeatAgeSeconds = ([DateTimeOffset]::Now - [DateTimeOffset]::Parse($heartbeat.mainAliveAt)).TotalSeconds
    } catch {}
  }

  if ($processAgeSeconds -ge 180 -and $heartbeatAgeSeconds -ge 180) {
    Write-WatchdogLog "Stale heartbeat detected. pid=$($target.Id) age=$([math]::Round($heartbeatAgeSeconds))"
    Stop-Process -Id $target.Id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    Start-TargetApplication
    Start-Sleep -Seconds 180
    continue
  }

  Start-Sleep -Seconds 30
}
