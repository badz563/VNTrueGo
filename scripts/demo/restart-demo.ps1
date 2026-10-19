$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'stop-demo.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& (Join-Path $PSScriptRoot 'start-demo.ps1')
exit $LASTEXITCODE
