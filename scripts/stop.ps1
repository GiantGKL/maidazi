$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectRoot 'work\server.pid'
if (-not (Test-Path -LiteralPath $pidFile)) { Write-Host 'No managed MaiDazi process found.'; exit 0 }
$appProcessId = [int](Get-Content -LiteralPath $pidFile -Raw)
$appProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $appProcessId"
$expectedServer = Join-Path $projectRoot 'server\index.js'
if ($appProcess -and $appProcess.Name -eq 'node.exe' -and $appProcess.CommandLine.Contains($expectedServer)) {
  Stop-Process -Id $appProcessId
  Write-Host 'MaiDazi stopped.'
} elseif ($appProcess) {
  throw 'The process ID belongs to another application; it was not stopped.'
}
Remove-Item -LiteralPath $pidFile -Force
