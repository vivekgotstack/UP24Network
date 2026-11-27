$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDirectory = Join-Path $projectRoot '.local'
. (Join-Path $PSScriptRoot 'Local-WebRuntime.ps1')

New-Item -ItemType Directory -Force -Path $runtimeDirectory | Out-Null
try {
    $lock = [System.IO.File]::Open((Join-Path $runtimeDirectory 'prototype.lifecycle.lock'),
        [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
} catch { throw 'A frontend launcher is running. Wait for it to finish.' }

try {
    try { Stop-Up24Frontend -ProjectRoot $projectRoot }
    finally { & (Join-Path $PSScriptRoot 'Backend.ps1') Stop }
} finally { $lock.Dispose() }
