$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$localRoot = Join-Path $projectRoot 'backend\.local'
$dataDirectory = Join-Path $localRoot 'postgres'
$postgresBin = $env:UP24_POSTGRES_BIN
if (-not $postgresBin) {
    $postgresBin = @('C:\Program Files\PostgreSQL\18\bin', 'C:\Program Files\PostgreSQL\17\bin') |
        Where-Object { Test-Path -LiteralPath (Join-Path $_ 'pg_ctl.exe') } | Select-Object -First 1
}
if (-not $postgresBin) { throw 'Install PostgreSQL or set UP24_POSTGRES_BIN to its bin folder.' }
New-Item -ItemType Directory -Force -Path $localRoot | Out-Null
$configurationPath = Join-Path $localRoot 'application.properties'
if (-not (Test-Path -LiteralPath $configurationPath)) {
    $databasePassword = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
    $adminPassword = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(16))
    @(
        'spring.datasource.url=jdbc:postgresql://127.0.0.1:55432/up24network'
        'spring.datasource.username=up24'
        ('spring.datasource.password=' + $databasePassword)
        'up24.bootstrap.admin-email=vivekni1224@gmail.com'
        ('up24.bootstrap.admin-password=' + $adminPassword)
    ) | Set-Content -LiteralPath $configurationPath -Encoding utf8
    @('Local development only', 'Email: vivekni1224@gmail.com', ('Password: ' + $adminPassword)) |
        Set-Content -LiteralPath (Join-Path $localRoot 'admin-login.txt') -Encoding utf8
}
$configuration = Get-Content -Raw -LiteralPath $configurationPath | ConvertFrom-StringData
$databasePassword = $configuration['spring.datasource.password']
$clusterPath = Join-Path $localRoot 'cluster.properties'
if (Test-Path -LiteralPath $clusterPath) {
    $databasePassword = (Get-Content -Raw -LiteralPath $clusterPath | ConvertFrom-StringData)['password']
}
if (-not (Test-Path -LiteralPath (Join-Path $dataDirectory 'PG_VERSION'))) {
    $passwordPath = Join-Path $localRoot 'init-password.txt'
    Set-Content -LiteralPath $passwordPath -Value $databasePassword -Encoding utf8
    try {
        & (Join-Path $postgresBin 'initdb.exe') -D $dataDirectory -U up24 -A scram-sha-256 --encoding=UTF8 --no-locale --pwfile=$passwordPath
        if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL initialization failed.' }
    } finally { Remove-Item -LiteralPath $passwordPath -ErrorAction SilentlyContinue }
}
& (Join-Path $postgresBin 'pg_ctl.exe') -D $dataDirectory status *> $null
if ($LASTEXITCODE -ne 0) {
    & (Join-Path $postgresBin 'pg_ctl.exe') -D $dataDirectory -l (Join-Path $localRoot 'postgres.log') -o '-h 127.0.0.1 -p 55432' -w start
    if ($LASTEXITCODE -ne 0) { throw 'The project database could not start. Check backend/.local/postgres.log.' }
}
$previousPassword = $env:PGPASSWORD
try {
    $env:PGPASSWORD = $databasePassword
    $databaseExists = & (Join-Path $postgresBin 'psql.exe') -h 127.0.0.1 -p 55432 -U up24 -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname='up24network';"
    if ($LASTEXITCODE -ne 0) { throw 'Could not connect to the project database.' }
    if ($databaseExists -ne '1') {
        & (Join-Path $postgresBin 'createdb.exe') -h 127.0.0.1 -p 55432 -U up24 up24network
        if ($LASTEXITCODE -ne 0) { throw 'Could not create the up24network database.' }
    }
} finally { $env:PGPASSWORD = $previousPassword }
$configuration['up24.newsroom.owner-email'] = 'vivekni1224@gmail.com'
$configuration['up24.bootstrap.admin-email'] = 'vivekni1224@gmail.com'
if (-not $configuration['up24.newsroom.otp-secret']) {
    $configuration['up24.newsroom.otp-secret'] = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
}
$configuration.GetEnumerator() | Sort-Object Name | ForEach-Object { $_.Key + '=' + $_.Value } |
    Set-Content -LiteralPath $configurationPath -Encoding utf8
@('Local development only', 'Email: vivekni1224@gmail.com', ('Password: ' + $configuration['up24.bootstrap.admin-password'])) |
    Set-Content -LiteralPath (Join-Path $localRoot 'admin-login.txt') -Encoding utf8
& (Join-Path $PSScriptRoot 'Set-LocalDatabaseRoles.ps1') -PostgresBin $postgresBin
Write-Output 'UP24Network database ready on 127.0.0.1:55432.'
Write-Output 'Local admin credentials: backend/.local/admin-login.txt (excluded from Git).'
