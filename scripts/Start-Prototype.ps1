$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDirectory = Join-Path $projectRoot '.local'
New-Item -ItemType Directory -Force -Path $runtimeDirectory | Out-Null
. (Join-Path $PSScriptRoot 'Local-WebRuntime.ps1')

try {
    $prototypeLock = [System.IO.File]::Open((Join-Path $runtimeDirectory 'prototype.lifecycle.lock'),
        [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
} catch { throw 'The prototype is already starting. Wait for that launcher to finish.' }

try {
& (Join-Path $PSScriptRoot 'Backend.ps1') Start

$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$frontendDirectory = Join-Path $projectRoot 'frontend'
$frontendEnvironment = Join-Path $frontendDirectory '.env.local'
if (-not (Test-Path -LiteralPath $frontendEnvironment)) {
    @('NEWS_API_URL=http://127.0.0.1:8080','SITE_URL=http://127.0.0.1:3000','SITE_INDEXABLE=false') |
        Set-Content -LiteralPath $frontendEnvironment -Encoding utf8
}
$nextPath = Join-Path $frontendDirectory 'node_modules\next\dist\bin\next'
if (-not (Test-Path -LiteralPath $nextPath)) { throw 'Run npm ci in frontend/ first.' }

if (-not (Test-Up24LocalPort 3000)) {
    $frontendProcess = Start-Process -FilePath $nodePath -ArgumentList @($nextPath,'dev','--hostname','127.0.0.1','--port','3000') `
        -WorkingDirectory $frontendDirectory -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $runtimeDirectory 'frontend.out.log') `
        -RedirectStandardError (Join-Path $runtimeDirectory 'frontend.err.log')
    $frontendProcess.Id | Set-Content -LiteralPath (Join-Path $runtimeDirectory 'frontend.pid')
    $frontendDeadline = [DateTime]::UtcNow.AddSeconds(45)
    do {
        $frontendProcess.Refresh()
        if ($frontendProcess.HasExited) { throw 'Frontend exited during startup. Check .local/frontend.err.log.' }
        if (Test-Up24LocalPort 3000) { break }
        Start-Sleep -Milliseconds 500
    } while ([DateTime]::UtcNow -lt $frontendDeadline)
    if (-not (Test-Up24LocalPort 3000)) { throw 'Frontend did not start on port 3000. Check .local/frontend.out.log.' }
}
Write-Output 'Reader prototype: http://127.0.0.1:3000'
Write-Output 'Newsroom: http://127.0.0.1:3000/admin'
Write-Output 'Reader account: http://127.0.0.1:3000/account'
Write-Output 'Startup logs: .local/. Local administrator sign-in: backend/.local/admin-login.txt.'
} finally { $prototypeLock.Dispose() }
