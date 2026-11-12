# Shared local-development process checks. Do not rely on Windows' CIM port query:
# it can omit listeners that are still reachable from this session.
function Test-Up24LocalPort {
    param([int]$Port)
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        return $client.ConnectAsync('127.0.0.1', $Port).Wait(1000) -and $client.Connected
    } catch { return $false } finally { $client.Dispose() }
}

function Get-Up24PortProcessIds {
    param([int]$Port)
    $netstat = Join-Path $env:SystemRoot 'System32\netstat.exe'
    $processIds = foreach ($line in (& $netstat -ano -p TCP)) {
        # Some Windows snapshots label a reachable listener CLOSED. Use the
        # bound local endpoint/PID, not its state; callers must verify identity.
        if ($line -match '^\s*TCP\s+\S+:(?<port>\d+)\s+\S+\s+\S+\s+(?<processId>\d+)\s*$' -and
            [int]$Matches.port -eq $Port -and [int]$Matches.processId -gt 0) {
            [int]$Matches.processId
        }
    }
    return @($processIds | Sort-Object -Unique)
}

function Get-Up24BackendProcess {
    param([string]$ProjectRoot, [int]$ProcessId)
    $process = Get-Process -Id $ProcessId -ErrorAction Stop
    $jcmd = Join-Path (Split-Path -Parent $process.Path) 'jcmd.exe'
    if (-not (Test-Path -LiteralPath $jcmd)) {
        throw "Cannot verify process $ProcessId. No adjacent JDK jcmd.exe was found; it will not be stopped."
    }
    $inspection = (& $jcmd $ProcessId VM.command_line 2>&1 | Out-String)
    if ($LASTEXITCODE -ne 0 -or $inspection -notmatch '(?m)^java_command:\s+com\.up24\.news\.NewsApplication(?:\s|$)') {
        throw "Port 8080 belongs to an unverified application (PID $ProcessId); it will not be stopped."
    }
    $classpathLine = @($inspection -split "`r?`n" | Where-Object { $_ -like 'java_class_path (initial):*' })
    $expectedClasses = [System.IO.Path]::GetFullPath((Join-Path $ProjectRoot 'backend\target\classes')).TrimEnd('\')
    $workspaceMatches = $false
    if ($classpathLine.Count -eq 1) {
        $classpath = $classpathLine[0].Substring($classpathLine[0].IndexOf(':') + 1).Trim()
        foreach ($entry in ($classpath -split ';')) {
            if ([string]::Equals($entry.TrimEnd('\'), $expectedClasses, [System.StringComparison]::OrdinalIgnoreCase)) {
                $workspaceMatches = $true
            }
        }
    }
    if (-not $workspaceMatches) {
        throw "Process $ProcessId is not the backend from this repository; it will not be stopped."
    }
    return $process
}

function Test-Up24BackendHealth {
    try {
        $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8080/actuator/health' -TimeoutSec 2
        return $health.status -eq 'UP'
    } catch { return $false }
}

function Find-Up24Backend {
    param([string]$ProjectRoot)
    # The TCP snapshot can briefly omit a reachable endpoint altogether. Fall
    # back to JVM identity, never to a stale PID file or a generic Java process.
    $candidateIds = @(Get-Up24PortProcessIds 8080) + @(
        Get-Process -Name java -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id
    )
    $owned = @(
        foreach ($candidateId in ($candidateIds | Sort-Object -Unique)) {
            try { Get-Up24BackendProcess -ProjectRoot $ProjectRoot -ProcessId $candidateId } catch { }
        }
    )
    if ($owned.Count -ne 1) {
        throw "Expected one verified backend from this repository; found $($owned.Count). No unverified process will be stopped."
    }
    return $owned[0]
}

function Wait-Up24Backend {
    param([System.Diagnostics.Process]$Launcher, [int]$TimeoutSeconds = 90)
    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    do {
        if (Test-Up24BackendHealth) { return }
        if ($Launcher) {
            $Launcher.Refresh()
            if ($Launcher.HasExited) { throw 'The backend launcher exited before the application became healthy. Check its startup logs.' }
        }
        Start-Sleep -Milliseconds 500
    } while ([DateTime]::UtcNow -lt $deadline)
    throw "Backend did not become healthy within $TimeoutSeconds seconds. Check its startup logs before retrying."
}
