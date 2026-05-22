param(
  [switch]$NoLaunch,
  [string]$LocalRoot = "$env:USERPROFILE\Documents\destination-display-dashboard-local"
)

$ErrorActionPreference = "Stop"

$sourceRoot = $PSScriptRoot
$localRoot = [System.IO.Path]::GetFullPath($LocalRoot)

if ($sourceRoot -ieq $localRoot) {
  if ($NoLaunch) {
    Write-Host "Already running from local project path: $localRoot"
    exit 0
  }
} else {
  New-Item -ItemType Directory -Force -Path $localRoot | Out-Null

  $robocopyArgs = @(
    $sourceRoot,
    $localRoot,
    "/E",
    "/R:2",
    "/W:1",
    "/NFL",
    "/NDL",
    "/NJH",
    "/NJS",
    "/NP",
    "/XD",
    ".git",
    ".dashboard-runtime",
    "logs",
    "tmp",
    "temp",
    "/XF",
    "*.log"
  )

  & robocopy @robocopyArgs | Out-Null
  if ($LASTEXITCODE -gt 7) {
    throw "Failed to copy project to local path. Robocopy exit code: $LASTEXITCODE"
  }
}

Write-Host "Local project path: $localRoot"

if ($NoLaunch) {
  exit 0
}

Set-Location $localRoot

if (-not (Test-Path "node_modules\electron\dist\electron.exe")) {
  Write-Host "Electron runtime is missing in local path. Installing dependencies..."
  npm install
}

npm run start
