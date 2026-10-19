$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')

$state = Get-DemoState
if (-not $state) { Write-Host 'VNTrueGo demo is already stopped.'; exit 0 }
Stop-DemoProcess $state.tunnel
Stop-DemoProcess $state.node
Start-Sleep -Seconds 1
if ((Test-DemoProcess $state.tunnel) -or (Test-DemoProcess $state.node)) {
  throw 'A managed process did not stop. Inspect the PIDs in .demo-runtime/state.json.'
}
Remove-Item -LiteralPath $script:DemoStateFile -Force
Write-Host 'VNTrueGo demo stopped. Demo SQLite and logs were preserved.'
