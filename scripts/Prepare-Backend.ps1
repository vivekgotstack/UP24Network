$ErrorActionPreference = 'Stop'

# Keep dependency startup outside the Spring application. The IDE launches Java
# only after this task succeeds, with database credentials already available.
& (Join-Path $PSScriptRoot 'Start-LocalDatabase.ps1')
& (Join-Path $PSScriptRoot 'Backend.ps1') Stop
Write-Output 'Database ready and backend port released. The IDE can launch Spring Boot.'
