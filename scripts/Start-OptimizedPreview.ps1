[CmdletBinding()]
param([switch]$ReuseBuild, [switch]$ReuseBackend)

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$frontendDirectory = Join-Path $projectRoot 'frontend'
$runtimeDirectory = Join-Path $projectRoot '.local'
$nextCli = Join-Path $frontendDirectory 'node_modules/next/dist/bin/next'
$buildId = Join-Path $frontendDirectory '.next/BUILD_ID'
$standalone = Join-Path $frontendDirectory '.next/standalone'
$standaloneServer = Join-Path $standalone 'server.js'
$runtimeFrontend = Join-Path $runtimeDirectory 'frontend-standalone'
$runtimeServer = Join-Path $runtimeFrontend 'server.js'
$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$npmPath = (Get-Command npm.cmd -ErrorAction Stop).Source
. (Join-Path $PSScriptRoot 'Local-WebRuntime.ps1')
. (Join-Path $PSScriptRoot 'Local-Configuration.ps1')

if (-not (Test-Path -LiteralPath $nextCli -PathType Leaf)) { throw 'Run npm ci in frontend/ first.' }
if ($ReuseBuild -and (!(Test-Path -LiteralPath $buildId -PathType Leaf) -or
    !(Test-Path -LiteralPath $standaloneServer -PathType Leaf))) {
    throw '-ReuseBuild requires a successful standalone build. Omit the switch to build it.'
}
New-Item -ItemType Directory -Force -Path $runtimeDirectory | Out-Null
if ((Get-Item -LiteralPath $runtimeDirectory -Force).Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
    throw 'The local runtime directory must be inside the workspace.'
}

function Copy-PreviewTree {
    param([string]$Source, [string]$Destination)
    # Robocopy uses exit codes below 8 for successful copies, including when it copies files.
    $PSNativeCommandUseErrorActionPreference = $false
    $output = & robocopy.exe $Source $Destination /E /MT:16 /R:1 /W:1 /NJH /NJS /NP /NFL /NDL
    if ($LASTEXITCODE -ge 8) {
        throw ("Could not copy $Source to the preview runtime." + [Environment]::NewLine + ($output -join [Environment]::NewLine))
    }
}

# Serialize preview start and stop, including the time before port 3000 is bound.
try {
    $lifecycleLock = [System.IO.File]::Open((Join-Path $runtimeDirectory 'prototype.lifecycle.lock'),
        [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
} catch { throw 'Another frontend launcher is running. Wait for it to finish.' }

$previousEnvironment = @{}
try {
    Stop-Up24Frontend -ProjectRoot $projectRoot
    if ($ReuseBackend) {
        & (Join-Path $PSScriptRoot 'Backend.ps1') Start -Profile local-preview
    } else {
        & (Join-Path $PSScriptRoot 'Backend.ps1') Restart -Profile local-preview
    }

    $environmentPath = Join-Path $frontendDirectory '.env.local'
    if (-not (Test-Path -LiteralPath $environmentPath)) {
        Write-Up24Utf8File -Path $environmentPath -Lines @(
            'NEWS_API_URL=http://127.0.0.1:8080', 'SITE_URL=http://127.0.0.1:3000', 'SITE_INDEXABLE=false')
    }

    # The standalone process runs in the copied tree and loads its own environment files.
    $localEnvironment = @{
        NEWS_API_URL = 'http://127.0.0.1:8080'
        SITE_URL = 'http://127.0.0.1:3000'
        SITE_INDEXABLE = 'false'
        PORT = '3000'
        HOSTNAME = '127.0.0.1'
    }
    foreach ($setting in $localEnvironment.GetEnumerator()) {
        $previousEnvironment[$setting.Key] = [Environment]::GetEnvironmentVariable($setting.Key, 'Process')
        [Environment]::SetEnvironmentVariable($setting.Key, $setting.Value, 'Process')
    }

    if (-not $ReuseBuild) {
        Push-Location $frontendDirectory
        try {
            & $npmPath run build
            if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed. Review its output.' }
        } finally { Pop-Location }
    } else { Write-Output 'Reusing the existing frontend build.' }

    if (-not (Test-Path -LiteralPath $standaloneServer -PathType Leaf)) {
        throw 'The build did not produce a standalone server.'
    }

    # Next changes into the server directory. Keep that directory outside its Windows build output.
    if (Test-Path -LiteralPath $runtimeFrontend) {
        $oldRuntime = Get-Item -LiteralPath $runtimeFrontend -Force
        if (-not $oldRuntime.PSIsContainer -or
            ($oldRuntime.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -or
            (Resolve-Path -LiteralPath $runtimeFrontend).ProviderPath -ne $runtimeFrontend) {
            throw 'The previous frontend runtime path could not be verified.'
        }
        Remove-Item -LiteralPath $runtimeFrontend -Recurse -Force
    }
    Copy-PreviewTree $standalone $runtimeFrontend
    Copy-PreviewTree (Join-Path $frontendDirectory 'public') (Join-Path $runtimeFrontend 'public')
    Copy-PreviewTree (Join-Path $frontendDirectory '.next/static') (Join-Path $runtimeFrontend '.next/static')
    if (Test-Up24LocalPort 3000) { throw 'Another process claimed port 3000 during the build.' }

    $stdout = Join-Path $runtimeDirectory 'frontend.out.log'
    $stderr = Join-Path $runtimeDirectory 'frontend.err.log'
    $launch = @{
        FilePath = $nodePath
        ArgumentList = @(('"' + $runtimeServer + '"'))
        WorkingDirectory = $runtimeFrontend
        WindowStyle = 'Hidden'
        PassThru = $true
        RedirectStandardOutput = $stdout
        RedirectStandardError = $stderr
    }
    $frontend = Start-Process @launch
    $deadline = [DateTime]::UtcNow.AddSeconds(60)
    $ready = $false
    do {
        $frontend.Refresh()
        if ($frontend.HasExited) { throw "Frontend exited during startup. Check $stderr." }
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000/' -TimeoutSec 5
            if ($response.StatusCode -eq 200 -and $response.Content -match 'id="stories"') {
                $ready = $true
                break
            }
        } catch { }
        Start-Sleep -Milliseconds 500
    } while ([DateTime]::UtcNow -lt $deadline)
    if (-not $ready) {
        Stop-Up24VerifiedProcess -Verified $frontend
        throw "The homepage did not load. Check $stdout and $stderr."
    }

    $bound = @(Get-Up24PortProcessIds 3000)
    if ($bound.Count -ne 1 -or $bound[0] -ne $frontend.Id) {
        Stop-Up24VerifiedProcess -Verified $frontend
        throw 'The responding frontend owner could not be verified.'
    }
    Write-Up24Utf8File -Path (Join-Path $runtimeDirectory 'frontend.pid') -Lines @([string]$frontend.Id)
    Write-Output 'Optimized preview: http://127.0.0.1:3000'
    Write-Output 'Administrator: http://127.0.0.1:3000/admin/sign-in'
    Write-Output 'Backend health: http://127.0.0.1:8080/actuator/health'
    Write-Output 'Administrator settings: backend/.env. Preview email codes: backend/.local/preview-mailbox/latest-message.txt.'
    Write-Output 'Frontend logs: .local/frontend.out.log and .local/frontend.err.log.'
} finally {
    foreach ($setting in $previousEnvironment.GetEnumerator()) {
        if ($null -eq $setting.Value) {
            Remove-Item -LiteralPath ('Env:' + $setting.Key) -ErrorAction SilentlyContinue
        } else {
            [Environment]::SetEnvironmentVariable($setting.Key, $setting.Value, 'Process')
        }
    }
    $lifecycleLock.Dispose()
}
