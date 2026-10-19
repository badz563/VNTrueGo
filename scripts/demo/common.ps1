$script:DemoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$script:DemoRuntime = Join-Path $script:DemoRoot '.demo-runtime'
$script:DemoStateFile = Join-Path $script:DemoRuntime 'state.json'

function Get-DemoState {
  if (-not (Test-Path -LiteralPath $script:DemoStateFile)) { return $null }
  try { return Get-Content -LiteralPath $script:DemoStateFile -Raw | ConvertFrom-Json }
  catch { throw "Demo state file is invalid: $script:DemoStateFile" }
}

function Save-DemoState($state) {
  [System.IO.File]::WriteAllText($script:DemoStateFile, ($state | ConvertTo-Json -Depth 6), (New-Object System.Text.UTF8Encoding($false)))
}

function Test-DemoProcess($entry) {
  if ($null -eq $entry -or -not $entry.pid -or -not $entry.path -or -not $entry.startTicks) { return $false }
  try {
    $process = Get-Process -Id ([int]$entry.pid) -ErrorAction Stop
    return [string]::Equals($process.Path, [string]$entry.path, [System.StringComparison]::OrdinalIgnoreCase) -and
      $process.StartTime.ToUniversalTime().Ticks.ToString() -eq [string]$entry.startTicks
  } catch { return $false }
}

function New-DemoProcessEntry($process) {
  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    try {
      $live = Get-Process -Id $process.Id -ErrorAction Stop
      if ($live.Path) {
        return @{ pid = $live.Id; path = $live.Path; startTicks = $live.StartTime.ToUniversalTime().Ticks.ToString() }
      }
    } catch { }
    Start-Sleep -Milliseconds 250
  }
  throw "Could not identify managed process $($process.Id)."
}

function Stop-DemoProcess($entry) {
  if (-not (Test-DemoProcess $entry)) { return }
  & taskkill.exe /PID ([int]$entry.pid) /T /F *> $null
}

function Test-DemoUrl([string]$url, [int]$timeout = 12) {
  if (-not $url) { return $false }
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec $timeout -MaximumRedirection 3
    return [int]$response.StatusCode -eq 200
  } catch {
    # Some local Windows DNS resolvers cache NXDOMAIN for fresh Quick Tunnel hosts.
    # Probe Cloudflare's public DNS without changing the machine's DNS settings.
    try {
      $uri = [uri]$url
      if ($uri.Scheme -ne 'https' -or $uri.Host -notmatch '^[a-z0-9-]+\.trycloudflare\.com$') { return $false }
      $record = Resolve-DnsName -Name $uri.Host -Server 1.1.1.1 -Type A -ErrorAction Stop | Where-Object { $_.IPAddress } | Select-Object -First 1
      if (-not $record) { return $false }
      $code = & curl.exe --silent --show-error --max-time $timeout --output NUL --write-out '%{http_code}' --resolve "$($uri.Host):443:$($record.IPAddress)" $url 2>$null
      return $LASTEXITCODE -eq 0 -and $code -eq '200'
    } catch { return $false }
  }
}

function Find-Cloudflared {
  $command = Get-Command cloudflared -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  foreach ($candidate in @('C:\Program Files (x86)\cloudflared\cloudflared.exe', 'C:\Program Files\cloudflared\cloudflared.exe')) {
    if (Test-Path -LiteralPath $candidate) { return $candidate }
  }
  throw 'cloudflared not found. Install Cloudflare.cloudflared with winget.'
}
