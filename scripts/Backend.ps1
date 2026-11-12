param([ValidateSet('Start', 'Stop', 'Restart')][string]$Action = 'Start')

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDirectory = Join-Path $projectRoot '.local'
New-Item -ItemType Directory -Force -Path $runtimeDirectory | Out-Null
. (Join-Path $PSScriptRoot 'Local-WebRuntime.ps1')

# An exclusive file handle serializes our launchers, including the time before
# Spring Boot binds its port. A crashed script releases the handle automatically.
try {
    $lifecycleLock = [System.IO.File]::Open((Join-Path $runtimeDirectory 'backend.lifecycle.lock'),
        [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
} catch { throw 'Another backend start/stop operation is running. Wait for it to finish.' }

try {
    if (Test-Up24LocalPort 8080) {
        $backend = Find-Up24Backend -ProjectRoot $projectRoot
        if ($Action -eq 'Start') {
            Wait-Up24Backend -TimeoutSeconds 30
            Write-Output "Backend already running and healthy: http://127.0.0.1:8080 (PID $($backend.Id))."
            return
        }

        # Recheck identity immediately before stopping to guard against PID reuse.
        $current = Get-Process -Id $backend.Id -ErrorAction Stop
        if ($current.StartTime -ne $backend.StartTime) { throw 'The owning process changed. Retry without stopping another process.' }
        Stop-Process -Id $backend.Id -ErrorAction Stop
        Wait-Process -Id $backend.Id -Timeout 10 -ErrorAction SilentlyContinue
        $releaseDeadline = [DateTime]::UtcNow.AddSeconds(10)
        while ((Test-Up24LocalPort 8080) -and [DateTime]::UtcNow -lt $releaseDeadline) {
            Start-Sleep -Milliseconds 250
        }
        if (Test-Up24LocalPort 8080) { throw 'Port 8080 is still occupied after stopping the verified backend.' }
        Remove-Item -LiteralPath (Join-Path $runtimeDirectory 'backend.pid') -ErrorAction SilentlyContinue
        Write-Output "Stopped this repository's backend (PID $($backend.Id))."
    } elseif ($Action -eq 'Stop') {
        Write-Output 'The backend is already stopped.'
    }
    if ($Action -eq 'Stop') { return }

    & (Join-Path $PSScriptRoot 'Start-LocalDatabase.ps1')
    $mavenPath = (Get-Command mvn.cmd -ErrorAction Stop).Source
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
    $stdout = Join-Path $runtimeDirectory "backend-$stamp.out.log"
    $stderr = Join-Path $runtimeDirectory "backend-$stamp.err.log"
    $mavenArguments = '"{0}" -q spring-boot:run -Dspring-boot.run.arguments=--server.port=8080' -f $mavenPath
    $launcher = Start-Process -FilePath $env:COMSPEC -ArgumentList @('/d','/s','/c',$mavenArguments) `
        -WorkingDirectory (Join-Path $projectRoot 'backend') -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    Write-Output "Starting backend. Logs: $stdout and $stderr"
    Wait-Up24Backend -Launcher $launcher
    $backend = Find-Up24Backend -ProjectRoot $projectRoot
    $backend.Id | Set-Content -LiteralPath (Join-Path $runtimeDirectory 'backend.pid')
    Write-Output "Backend ready: http://127.0.0.1:8080 (PID $($backend.Id))."
} finally { $lifecycleLock.Dispose() }
