param([int]$Port = 3000)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')

if ($Port -lt 1024 -or $Port -gt 65535) { throw 'Choose a port from 1024 to 65535.' }
$nodeCommand = Get-Command node -ErrorAction Stop
$cloudflared = Find-Cloudflared
$nextCli = Join-Path $script:DemoRoot 'node_modules\next\dist\bin\next'
if (-not (Test-Path -LiteralPath $nextCli)) { throw 'Next.js is missing. Run npm install in the project.' }
if (-not (Test-Path -LiteralPath $script:DemoRuntime)) { New-Item -ItemType Directory -Path $script:DemoRuntime | Out-Null }

$existing = Get-DemoState
if ($existing) {
  if ((Test-DemoProcess $existing.node) -and (Test-DemoProcess $existing.tunnel) -and (Test-DemoUrl $existing.publicUrl)) {
    Write-Host ('VNTrueGo demo is already running: ' + $existing.publicUrl)
    exit 0
  }
  & (Join-Path $PSScriptRoot 'stop-demo.ps1')
  if (Test-Path -LiteralPath $script:DemoStateFile) { throw 'Could not stop the stale managed demo.' }
}
if (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) {
  throw "Port $Port is already in use. No other process was stopped."
}
Push-Location $script:DemoRoot
try { & npm run build; if ($LASTEXITCODE -ne 0) { throw 'Next.js build failed.' } }
finally { Pop-Location }

$keyFile = Join-Path $script:DemoRuntime 'evidence.key'
if (-not (Test-Path -LiteralPath $keyFile)) {
  $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $bytes = New-Object byte[] 32; $random.GetBytes($bytes) }
  finally { $random.Dispose() }
  $hex = ([System.BitConverter]::ToString($bytes) -replace '-', '').ToLowerInvariant()
  [System.IO.File]::WriteAllText($keyFile, $hex)
}
$evidenceKey = [System.IO.File]::ReadAllText($keyFile).Trim()
if ($evidenceKey -notmatch '^[a-f0-9]{64}$') { throw 'Demo evidence key is invalid; existing review evidence must be preserved.' }

$database = Join-Path $script:DemoRoot 'data\truego-public-demo.sqlite'
$localUrl = "http://127.0.0.1:$Port"
$previous = @{}
foreach ($name in @('TRUEGO_LOCAL_DEMO','DATABASE_PATH','EVIDENCE_ENCRYPTION_KEY','TURSO_DATABASE_URL','TURSO_AUTH_TOKEN','AI_API_KEY')) {
  $previous[$name] = [System.Environment]::GetEnvironmentVariable($name, 'Process')
}
$server = $null
$tunnel = $null
$state = $null
try {
  $env:TRUEGO_LOCAL_DEMO = '1'
  $env:DATABASE_PATH = $database
  $env:EVIDENCE_ENCRYPTION_KEY = $evidenceKey
  $env:TURSO_DATABASE_URL = ''
  $env:TURSO_AUTH_TOKEN = ''
  $env:AI_API_KEY = ''
  $server = Start-Process -FilePath $nodeCommand.Source -ArgumentList @($nextCli,'start','--hostname','127.0.0.1','--port',$Port.ToString()) -WorkingDirectory $script:DemoRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $script:DemoRuntime 'next.stdout.log') -RedirectStandardError (Join-Path $script:DemoRuntime 'next.stderr.log')
  $state = @{ node = New-DemoProcessEntry $server; tunnel = $null; localUrl = $localUrl; publicUrl = ''; database = $database; startedAt = (Get-Date).ToUniversalTime().ToString('o') }
  Save-DemoState $state
  $ready = $false
  for ($i = 0; $i -lt 45; $i++) {
    if (-not (Test-DemoProcess $state.node)) { throw 'Next.js stopped during startup. Check .demo-runtime/next.stderr.log.' }
    if (Test-DemoUrl "$localUrl/" 3) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw 'Next.js did not become ready within 45 seconds.' }

  $tunnel = Start-Process -FilePath $cloudflared -ArgumentList @('tunnel','--url',$localUrl) -WorkingDirectory $script:DemoRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $script:DemoRuntime 'tunnel.stdout.log') -RedirectStandardError (Join-Path $script:DemoRuntime 'tunnel.stderr.log')
  $state.tunnel = New-DemoProcessEntry $tunnel
  Save-DemoState $state
  $publicUrl = ''
  for ($i = 0; $i -lt 60; $i++) {
    if ($i -gt 4 -and -not (Test-DemoProcess $state.tunnel)) { throw 'cloudflared stopped during startup. Check .demo-runtime/tunnel.stderr.log.' }
    $logs = (Get-Content -LiteralPath (Join-Path $script:DemoRuntime 'tunnel.stderr.log') -Raw -ErrorAction SilentlyContinue) + (Get-Content -LiteralPath (Join-Path $script:DemoRuntime 'tunnel.stdout.log') -Raw -ErrorAction SilentlyContinue)
    $match = [regex]::Match($logs, 'https://[a-z0-9-]+\.trycloudflare\.com')
    if ($match.Success) { $publicUrl = $match.Value; break }
    Start-Sleep -Seconds 1
  }
  if (-not $publicUrl) { throw 'No Quick Tunnel URL appeared within 60 seconds.' }
  $state.publicUrl = $publicUrl
  Save-DemoState $state
  $reachable = $false
  for ($i = 0; $i -lt 12; $i++) {
    if (Test-DemoUrl "$publicUrl/" 10) { $reachable = $true; break }
    Start-Sleep -Seconds 3
  }
  if (-not $reachable) { throw 'The public Quick Tunnel URL did not return HTTP 200.' }
  Write-Host 'VNTRUEGO PUBLIC DEMO RUNNING'
  Write-Host "Local URL: $localUrl"
  Write-Host "Public URL: $publicUrl"
  Write-Host "SQLite: $database"
  Write-Host 'Use npm run demo:status, demo:stop, or demo:restart.'
} catch {
  if ($state) {
    Stop-DemoProcess $state.tunnel
    Stop-DemoProcess $state.node
    if (Test-Path -LiteralPath $script:DemoStateFile) { Remove-Item -LiteralPath $script:DemoStateFile -Force }
  }
  if ($tunnel -and -not (Test-DemoProcess $state.tunnel)) {
    $orphan = Get-Process -Id $tunnel.Id -ErrorAction SilentlyContinue
    if ($orphan -and [string]::Equals($orphan.Path, $cloudflared, [System.StringComparison]::OrdinalIgnoreCase)) {
      Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue
    }
  }
  throw
} finally {
  foreach ($name in $previous.Keys) { [System.Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
}
