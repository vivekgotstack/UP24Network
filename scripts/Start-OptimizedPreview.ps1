[CmdletBinding()]
param([switch]$ReuseBuild, [switch]$ReuseBackend)

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$frontendDirectory = Join-Path $projectRoot 'frontend'
$runtimeDirectory = Join-Path $projectRoot '.local'
$nextCli = Join-Path $frontendDirectory 'node_modules/next/dist/bin/next'
$buildId = Join-Path $frontendDirectory '.next/BUILD_ID'
$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$npmPath = (Get-Command npm.cmd -ErrorAction Stop).Source
. (Join-Path $PSScriptRoot 'Local-WebRuntime.ps1')
. (Join-Path $PSScriptRoot 'Local-Configuration.ps1')

if (-not (Test-Path -LiteralPath $nextCli -PathType Leaf)) { throw 'Run npm ci in frontend/ first.' }
if ($ReuseBuild -and -not (Test-Path -LiteralPath $buildId -PathType Leaf)) {
    throw '-ReuseBuild requires an existing successful frontend build. Omit the switch to build it.'
}
New-Item -ItemType Directory -Force -Path $runtimeDirectory | Out-Null

# Share the existing development launcher's lock so these entry points cannot
# start two frontend processes while neither has bound port 3000 yet.
try {
    $lifecycleLock = [System.IO.File]::Open((Join-Path $runtimeDirectory 'prototype.lifecycle.lock'),
        [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
} catch { throw 'Another frontend launcher is running. Wait for it to finish.' }

function Test-FrontendEntryPoint {
    param([string]$CommandLine, [string]$EntryPoint)
    if ([string]::IsNullOrWhiteSpace($CommandLine)) { return $false }
    $normalized = $CommandLine.Replace('/', '\')
    $expected = [System.IO.Path]::GetFullPath($EntryPoint).Replace('/', '\')
    if ($normalized.IndexOf($expected, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) { return $false }
    $entry = [regex]::Escape($expected)
    $prefix = '^\s*(?:"[^\"]*node\.exe"|[^\s\"]*node\.exe)\s+'
    return $normalized -match ($prefix + '(?:"' + $entry + '"|' + $entry + ')(?=\s|$)')
}

function Get-OwnedFrontend {
    param([int]$ProcessId)
    $candidate = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction Stop
    if (-not $candidate -or $candidate.Name -ne 'node.exe') {
        throw "Port 3000 belongs to an unverified process (PID $ProcessId); it will not be stopped."
    }
    $listener = Get-Process -Id $ProcessId -ErrorAction Stop
    if (Test-FrontendEntryPoint -CommandLine $candidate.CommandLine -EntryPoint $nextCli) {
        if ($candidate.CommandLine -notmatch '(?i)\s(?:dev|start)(?:\s|$)') {
            throw "Process $ProcessId is not a Next.js server command; it will not be stopped."
        }
        return [pscustomobject]@{ Listener = $listener; Parent = $null }
    }
    $standalone = Join-Path $frontendDirectory '.next/standalone/server.js'
    if (Test-FrontendEntryPoint -CommandLine $candidate.CommandLine -EntryPoint $standalone) {
        return [pscustomobject]@{ Listener = $listener; Parent = $null }
    }
    # Next dev may put its server in a child worker. Verify both the worker's
    # entry point and its owning workspace CLI before stopping the parent.
    $worker = Join-Path $frontendDirectory 'node_modules/next/dist/server/lib/start-server.js'
    if (Test-FrontendEntryPoint -CommandLine $candidate.CommandLine -EntryPoint $worker) {
        $parentInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$($candidate.ParentProcessId)" -ErrorAction Stop
        if ($parentInfo -and $parentInfo.Name -eq 'node.exe' -and
            (Test-FrontendEntryPoint -CommandLine $parentInfo.CommandLine -EntryPoint $nextCli) -and
            $parentInfo.CommandLine -match '(?i)\s(?:dev|start)(?:\s|$)') {
            $owner = Get-Process -Id $parentInfo.ProcessId -ErrorAction Stop
            if ($owner.StartTime -le $listener.StartTime) {
                return [pscustomobject]@{ Listener = $listener; Parent = $owner }
            }
        }
    }
    throw "Process $ProcessId is not a verified Next.js server from this workspace; it will not be stopped."
}

function Stop-VerifiedProcess {
    param([System.Diagnostics.Process]$Verified)
    $current = Get-Process -Id $Verified.Id -ErrorAction SilentlyContinue
    if (-not $current) { return }
    if ($current.StartTime -ne $Verified.StartTime) { throw 'The process identity changed. Retry without stopping another process.' }
    Stop-Process -Id $current.Id -ErrorAction Stop
    Wait-Process -Id $current.Id -Timeout 10 -ErrorAction SilentlyContinue
}

try {
    if ($ReuseBackend) {
        # Explicit frontend-only refresh: preserve the verified backend and its current profile.
        & (Join-Path $PSScriptRoot 'Backend.ps1') Start -Profile local-preview
    } else {
        & (Join-Path $PSScriptRoot 'Backend.ps1') Restart -Profile local-preview
    }

    $environmentPath = Join-Path $frontendDirectory '.env.local'
    if (-not (Test-Path -LiteralPath $environmentPath)) {
        Write-Up24Utf8File -Path $environmentPath -Lines @(
            'NEWS_API_URL=http://127.0.0.1:8080', 'SITE_URL=http://127.0.0.1:3000', 'SITE_INDEXABLE=false')
    }

    $listeners = @(Get-Up24PortProcessIds 3000)
    if ($listeners.Count -gt 1) { throw 'Port 3000 has multiple owning processes. No process was stopped.' }
    if ($listeners.Count -eq 1) {
        $owned = Get-OwnedFrontend -ProcessId $listeners[0]
        if ($owned.Parent) { Stop-VerifiedProcess -Verified $owned.Parent }
        Stop-VerifiedProcess -Verified $owned.Listener
        $releaseDeadline = [DateTime]::UtcNow.AddSeconds(10)
        while ((Test-Up24LocalPort 3000) -and [DateTime]::UtcNow -lt $releaseDeadline) { Start-Sleep -Milliseconds 250 }
        if (Test-Up24LocalPort 3000) { throw 'Port 3000 did not release after stopping the verified frontend.' }
    } elseif (Test-Up24LocalPort 3000) {
        throw 'Port 3000 is reachable but its owner could not be verified. No process was stopped.'
    }

    if (-not $ReuseBuild) {
        Push-Location $frontendDirectory
        try {
            & $npmPath run build
            if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed. Review the build output; the backend is still running.' }
        } finally { Pop-Location }
        if (-not (Test-Path -LiteralPath $buildId -PathType Leaf)) { throw 'The frontend build did not produce BUILD_ID.' }
    } else { Write-Output 'Reusing the existing frontend build as explicitly requested.' }

    # Recheck before launching; a process outside these launchers may have bound
    # the port while npm was building. Never stop that new process implicitly.
    if (Test-Up24LocalPort 3000) { throw 'Another process claimed port 3000 during the build. It was not stopped.' }
    $stdout = Join-Path $runtimeDirectory 'frontend.out.log'
    $stderr = Join-Path $runtimeDirectory 'frontend.err.log'
    $standaloneDirectory = Join-Path $frontendDirectory '.next/standalone'
    $standaloneServer = Join-Path $standaloneDirectory 'server.js'
    if (-not (Test-Path -LiteralPath $standaloneServer -PathType Leaf)) { throw 'The optimized standalone server is missing. Rebuild the frontend.' }
    Copy-Item -LiteralPath (Join-Path $frontendDirectory 'public') -Destination $standaloneDirectory -Recurse -Force
    Copy-Item -LiteralPath (Join-Path $frontendDirectory '.next/static') -Destination (Join-Path $standaloneDirectory '.next') -Recurse -Force
    # Standard Next standalone runtime settings are scoped to the child process.
    $previousPort = [Environment]::GetEnvironmentVariable('PORT', 'Process')
    $previousHostname = [Environment]::GetEnvironmentVariable('HOSTNAME', 'Process')
    try {
        [Environment]::SetEnvironmentVariable('PORT', '3000', 'Process')
        [Environment]::SetEnvironmentVariable('HOSTNAME', '127.0.0.1', 'Process')
        $frontend = Start-Process -FilePath $nodePath -ArgumentList @(('"' + $standaloneServer + '"')) `
            -WorkingDirectory $frontendDirectory -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    } finally {
        [Environment]::SetEnvironmentVariable('PORT', $previousPort, 'Process')
        [Environment]::SetEnvironmentVariable('HOSTNAME', $previousHostname, 'Process')
    }
    $deadline = [DateTime]::UtcNow.AddSeconds(60)
    $ready = $false
    do {
        $frontend.Refresh()
        if ($frontend.HasExited) { throw "Frontend exited during startup. Check $stderr." }
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000/' -TimeoutSec 5
            if ($response.StatusCode -eq 200) { $ready = $true; break }
        } catch { }
        Start-Sleep -Milliseconds 500
    } while ([DateTime]::UtcNow -lt $deadline)
    if (-not $ready) {
        Stop-VerifiedProcess -Verified $frontend
        throw "Frontend did not become ready. Check $stdout and $stderr."
    }
    $bound = @(Get-Up24PortProcessIds 3000)
    if ($bound.Count -ne 1) { throw 'The responding frontend owner could not be verified. No unverified process was stopped.' }
    $owner = Get-OwnedFrontend -ProcessId $bound[0]
    if ($owner.Listener.Id -ne $frontend.Id -and (-not $owner.Parent -or $owner.Parent.Id -ne $frontend.Id)) {
        throw 'A different process answered on port 3000. It was not stopped.'
    }
    Write-Up24Utf8File -Path (Join-Path $runtimeDirectory 'frontend.pid') -Lines @([string]$owner.Listener.Id)
    Write-Output 'Optimized preview: http://127.0.0.1:3000'
    Write-Output 'Administrator: http://127.0.0.1:3000/admin/sign-in'
    Write-Output 'Backend health: http://127.0.0.1:8080/actuator/health'
    Write-Output 'Administrator settings: backend/.env. Preview email codes: backend/.local/preview-mailbox/latest-message.txt.'
    Write-Output 'Frontend logs: .local/frontend.out.log and .local/frontend.err.log.'
} finally { $lifecycleLock.Dispose() }
