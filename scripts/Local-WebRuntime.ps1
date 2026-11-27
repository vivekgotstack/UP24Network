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

function Test-Up24NodeEntryPoint {
    param([string]$CommandLine, [string]$EntryPoint)
    $command = [regex]::Match($CommandLine, '^\s*(?:"[^"]*node(?:\.exe)?"|[^\s"]*node(?:\.exe)?)\s+(?:"(?<entry>[^"]+)"|(?<entry>[^\s"]+))(?=\s|$)', 'IgnoreCase')
    if (-not $command.Success) { return $false }
    $entry = $command.Groups['entry'].Value
    return [System.IO.Path]::IsPathRooted($entry) -and
        [System.IO.Path]::GetFullPath($entry) -eq [System.IO.Path]::GetFullPath($EntryPoint)
}

function Get-Up24FrontendProcess {
    param([string]$ProjectRoot, [int]$ProcessId)
    $frontend = Join-Path $ProjectRoot 'frontend'
    $next = Join-Path $frontend 'node_modules/next/dist/bin/next'
    $worker = Join-Path $frontend 'node_modules/next/dist/server/lib/start-server.js'
    $standalone = Join-Path $ProjectRoot '.local/frontend-standalone/server.js'
    $previousStandalone = Join-Path $frontend '.next/standalone/server.js'
    $candidate = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction Stop
    if (-not $candidate -or $candidate.Name -ne 'node.exe') {
        throw "Port 3000 belongs to an unverified process (PID $ProcessId)."
    }

    $listener = Get-Process -Id $ProcessId -ErrorAction Stop
    if ((Test-Up24NodeEntryPoint $candidate.CommandLine $standalone) -or
        (Test-Up24NodeEntryPoint $candidate.CommandLine $previousStandalone) -or
        ((Test-Up24NodeEntryPoint $candidate.CommandLine $next) -and $candidate.CommandLine -match '\s(?:dev|start)(?:\s|$)')) {
        return [pscustomobject]@{ Listener = $listener; Parent = $null }
    }
    if (Test-Up24NodeEntryPoint $candidate.CommandLine $worker) {
        $parent = Get-CimInstance Win32_Process -Filter "ProcessId=$($candidate.ParentProcessId)" -ErrorAction Stop
        if ($parent -and $parent.Name -eq 'node.exe' -and
            (Test-Up24NodeEntryPoint $parent.CommandLine $next) -and $parent.CommandLine -match '\sdev(?:\s|$)') {
            $owner = Get-Process -Id $parent.ProcessId -ErrorAction Stop
            if ($owner.StartTime -le $listener.StartTime) {
                return [pscustomobject]@{ Listener = $listener; Parent = $owner }
            }
        }
    }
    throw "Port 3000 belongs to an unverified frontend (PID $ProcessId)."
}

function Stop-Up24VerifiedProcess {
    param([System.Diagnostics.Process]$Verified)
    $current = Get-Process -Id $Verified.Id -ErrorAction SilentlyContinue
    if (-not $current) { return }
    if ($current.StartTime -ne $Verified.StartTime) { throw 'The process identity changed.' }
    Stop-Process -Id $current.Id -ErrorAction Stop
    Wait-Process -Id $current.Id -Timeout 10 -ErrorAction SilentlyContinue
}

function Stop-Up24Frontend {
    param([string]$ProjectRoot)
    if (Test-Up24LocalPort 3000) {
        $listeners = @(Get-Up24PortProcessIds 3000)
        if ($listeners.Count -ne 1) { throw 'The owner of port 3000 could not be verified.' }
        $frontend = Get-Up24FrontendProcess -ProjectRoot $ProjectRoot -ProcessId $listeners[0]
        if ($frontend.Parent) { Stop-Up24VerifiedProcess $frontend.Parent }
        Stop-Up24VerifiedProcess $frontend.Listener
        $deadline = [DateTime]::UtcNow.AddSeconds(10)
        while ((Test-Up24LocalPort 3000) -and [DateTime]::UtcNow -lt $deadline) {
            Start-Sleep -Milliseconds 250
        }
        if (Test-Up24LocalPort 3000) { throw 'Port 3000 is still listening after frontend shutdown.' }
        Write-Output "Stopped the frontend (PID $($frontend.Listener.Id))."
    }
    Remove-Item -LiteralPath (Join-Path $ProjectRoot '.local/frontend.pid') -ErrorAction SilentlyContinue
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
    $owned = @(@(
        foreach ($candidateId in ($candidateIds | Sort-Object -Unique)) {
            try { Get-Up24BackendProcess -ProjectRoot $ProjectRoot -ProcessId $candidateId } catch { }
        }
    ) | Where-Object { $_ -is [System.Diagnostics.Process] } | Sort-Object -Property Id -Unique)
    if ($owned.Count -ne 1) {
        throw "Expected one verified backend from this repository; found $($owned.Count). No unverified process will be stopped."
    }
    return $owned[0]
}

function Wait-Up24Backend {
    param([System.Diagnostics.Process]$Launcher, [int]$TimeoutSeconds = 180)
    $started = [DateTime]::UtcNow
    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    $nextProgress = $started.AddSeconds(15)
    do {
        if (Test-Up24BackendHealth) { return }
        if ($Launcher) {
            $Launcher.Refresh()
            if ($Launcher.HasExited) { throw 'The backend launcher exited before the application became healthy. Check its startup logs.' }
        }
        if ([DateTime]::UtcNow -ge $nextProgress) {
            Write-Output ("Waiting for backend startup ({0}s elapsed)…" -f [int]([DateTime]::UtcNow - $started).TotalSeconds)
            $nextProgress = [DateTime]::UtcNow.AddSeconds(15)
        }
        Start-Sleep -Milliseconds 500
    } while ([DateTime]::UtcNow -lt $deadline)
    throw "Backend did not become healthy within $TimeoutSeconds seconds. Check its startup logs before retrying."
}
