$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDirectory = Join-Path $projectRoot '.local'
New-Item -ItemType Directory -Force -Path $runtimeDirectory | Out-Null
& (Join-Path $PSScriptRoot 'Start-LocalDatabase.ps1')

$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$mavenPath = (Get-Command mvn.cmd -ErrorAction Stop).Source
$backendDirectory = Join-Path $projectRoot 'backend'
$frontendDirectory = Join-Path $projectRoot 'frontend'
$nextPath = Join-Path $frontendDirectory 'node_modules\next\dist\bin\next'
if (-not (Test-Path -LiteralPath $nextPath)) { throw 'Run npm ci in frontend/ first.' }

if (-not (Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue)) {
    $mavenArguments = '"{0}" -q spring-boot:run' -f $mavenPath
    $backendProcess = Start-Process -FilePath $env:COMSPEC -ArgumentList @('/d','/s','/c',$mavenArguments) `
        -WorkingDirectory $backendDirectory -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $runtimeDirectory 'backend.out.log') `
        -RedirectStandardError (Join-Path $runtimeDirectory 'backend.err.log')
    $backendProcess.Id | Set-Content -LiteralPath (Join-Path $runtimeDirectory 'backend.pid')
}
if (-not (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)) {
    $frontendProcess = Start-Process -FilePath $nodePath -ArgumentList @($nextPath,'dev','--hostname','127.0.0.1','--port','3000') `
        -WorkingDirectory $frontendDirectory -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $runtimeDirectory 'frontend.out.log') `
        -RedirectStandardError (Join-Path $runtimeDirectory 'frontend.err.log')
    $frontendProcess.Id | Set-Content -LiteralPath (Join-Path $runtimeDirectory 'frontend.pid')
}
Write-Output 'Reader prototype: http://127.0.0.1:3000'
Write-Output 'Newsroom: http://127.0.0.1:3000/admin'
Write-Output 'Reader account: http://127.0.0.1:3000/account'
Write-Output 'Startup logs: .local/. Local administrator sign-in: backend/.local/admin-login.txt.'
