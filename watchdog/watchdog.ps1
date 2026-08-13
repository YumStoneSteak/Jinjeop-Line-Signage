param(
  [Parameter(Mandatory = $true)][string]$ExecutablePath,
  [Parameter(Mandatory = $true)][string]$HeartbeatPath,
  [Parameter(Mandatory = $true)][string]$PausePath,
  [string]$QuietStart = '01:20',
  [string]$QuietEnd = '04:30',
  [switch]$SelfTest
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

function Test-MinuteWithinWindow([int]$minute, [int]$start, [int]$end) {
  if ($start -eq $end) { return $false }
  if ($start -lt $end) { return $minute -ge $start -and $minute -lt $end }
  return $minute -ge $start -or $minute -lt $end
}

function Test-QuietWindow {
  $now = Get-Date
  $minute = ($now.Hour * 60) + $now.Minute
  return Test-MinuteWithinWindow $minute (Convert-TimeToMinute $QuietStart) (Convert-TimeToMinute $QuietEnd)
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

if ($SelfTest) {
  if (Test-MinuteWithinWindow 600 600 600) { throw 'Equal window must be disabled.' }
  if (-not (Test-MinuteWithinWindow 90 60 120)) { throw 'Normal window should include an inner minute.' }
  if (Test-MinuteWithinWindow 120 60 120) { throw 'Normal window end must be exclusive.' }
  if (-not (Test-MinuteWithinWindow 30 1380 120)) { throw 'Wrapped window should include after midnight.' }
  if (Test-MinuteWithinWindow 720 1380 120) { throw 'Wrapped window should exclude daytime.' }
  Write-Output 'watchdog self-test passed'
  exit 0
}

Start-Sleep -Seconds 15
Write-WatchdogLog "Watchdog started. quiet=$QuietStart~$QuietEnd"
$lastLoopAt = Get-Date
$resumeGraceUntil = [DateTime]::MinValue
$consecutiveStale = 0

while ($true) {
  $loopNow = Get-Date
  if (($loopNow - $lastLoopAt).TotalSeconds -gt 90) {
    $resumeGraceUntil = $loopNow.AddSeconds(180)
    $consecutiveStale = 0
    Write-WatchdogLog 'Long loop gap detected; applying resume grace.'
  }
  $lastLoopAt = $loopNow

  if (Test-QuietWindow) {
    $consecutiveStale = 0
    Start-Sleep -Seconds 30
    continue
  }
  if (Test-WatchdogPaused) {
    $consecutiveStale = 0
    Start-Sleep -Seconds 30
    continue
  }

  $heartbeat = Get-Heartbeat
  $target = Get-TargetProcess $heartbeat
  if ($null -eq $target) {
    $consecutiveStale = 0
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

  if ($loopNow -lt $resumeGraceUntil) {
    Start-Sleep -Seconds 30
    continue
  }

  if ($processAgeSeconds -ge 180 -and $heartbeatAgeSeconds -ge 180) {
    $consecutiveStale += 1
  } else {
    $consecutiveStale = 0
  }

  if ($consecutiveStale -ge 2) {
    Write-WatchdogLog "Stale heartbeat detected. pid=$($target.Id) age=$([math]::Round($heartbeatAgeSeconds))"
    $consecutiveStale = 0
    Stop-Process -Id $target.Id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    Start-TargetApplication
    Start-Sleep -Seconds 180
    continue
  }

  Start-Sleep -Seconds 30
}
