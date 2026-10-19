$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')

$state = Get-DemoState
if (-not $state) { Write-Host 'VNTrueGo demo: STOPPED (no managed processes)'; exit 1 }
$node = Test-DemoProcess $state.node
$tunnel = Test-DemoProcess $state.tunnel
$local = $node -and (Test-DemoUrl $state.localUrl)
$public = $tunnel -and (Test-DemoUrl $state.publicUrl)
Write-Host ('Next.js: ' + $(if ($local) { 'RUNNING' } else { 'STOPPED/UNHEALTHY' }))
Write-Host ('Cloudflare Tunnel: ' + $(if ($tunnel) { 'RUNNING' } else { 'STOPPED' }))
Write-Host ('Local URL: ' + $state.localUrl)
Write-Host ('Public URL: ' + $(if ($public) { $state.publicUrl } else { 'UNAVAILABLE (previous URL: ' + $state.publicUrl + ')' }))
Write-Host ('SQLite: ' + $state.database)
if (-not ($local -and $public)) { exit 1 }
