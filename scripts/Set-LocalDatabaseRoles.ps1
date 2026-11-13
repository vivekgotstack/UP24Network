param([Parameter(Mandatory)][string]$PostgresBin)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$localRoot = Join-Path $projectRoot 'backend\.local'
$configurationPath = Join-Path $localRoot 'application.properties'
$clusterPath = Join-Path $localRoot 'cluster.properties'
$rolesPath = Join-Path $localRoot 'database-roles.properties'
$configuration = Get-Content -Raw -LiteralPath $configurationPath | ConvertFrom-StringData

# Preserve the existing cluster credential before replacing the runtime account.
if (-not (Test-Path -LiteralPath $clusterPath)) {
    if ($configuration['spring.datasource.username'] -ne 'up24') {
        throw 'The original local cluster credential is missing. Restore backend/.local/cluster.properties.'
    }
    ('password=' + $configuration['spring.datasource.password']) | Set-Content -LiteralPath $clusterPath -Encoding utf8
}
if (-not (Test-Path -LiteralPath $rolesPath)) {
    @(
        ('applicationPassword=' + [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(24)))
        ('migrationPassword=' + [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(24)))
    ) | Set-Content -LiteralPath $rolesPath -Encoding utf8
}
$cluster = Get-Content -Raw -LiteralPath $clusterPath | ConvertFrom-StringData
$roles = Get-Content -Raw -LiteralPath $rolesPath | ConvertFrom-StringData
if ($roles['applicationPassword'] -notmatch '^[A-Fa-f0-9]{48}$' -or $roles['migrationPassword'] -notmatch '^[A-Fa-f0-9]{48}$') {
    throw 'Local role passwords must be 48 hexadecimal characters. No database changes were made.'
}
$sql = @'
BEGIN;
SELECT format('CREATE ROLE up24_migrator LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION', :'migration_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'up24_migrator') \gexec
SELECT format('CREATE ROLE up24_app LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION', :'application_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'up24_app') \gexec
ALTER DATABASE up24network OWNER TO up24_migrator;
ALTER SCHEMA public OWNER TO up24_migrator;
SELECT format('ALTER TABLE public.%I OWNER TO up24_migrator', tablename)
FROM pg_tables WHERE schemaname = 'public' AND tableowner = 'up24' \gexec
REVOKE ALL ON DATABASE up24network FROM PUBLIC;
GRANT CONNECT ON DATABASE up24network TO up24_app;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO up24_app;
SELECT format('GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.%I TO up24_app', tablename)
FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'flyway_schema_history' \gexec
COMMIT;
'@
$previousPassword = $env:PGPASSWORD
try {
    $env:PGPASSWORD = $cluster['password']
    # Passwords travel on stdin, never as process arguments or startup output.
    $inputSql = "\set application_password '" + $roles['applicationPassword'] + "'`n\set migration_password '" + $roles['migrationPassword'] + "'`n" + $sql
    $inputSql | & (Join-Path $PostgresBin 'psql.exe') -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 55432 -U up24 -d up24network *> $null
    if ($LASTEXITCODE -ne 0) { throw 'Could not provision the local database roles. Local application configuration was left unchanged.' }
} finally { $env:PGPASSWORD = $previousPassword }

$configuration['spring.datasource.username'] = 'up24_app'
$configuration['spring.datasource.password'] = $roles['applicationPassword']
$configuration['spring.flyway.url'] = $configuration['spring.datasource.url']
$configuration['spring.flyway.user'] = 'up24_migrator'
$configuration['spring.flyway.password'] = $roles['migrationPassword']
$configuration.GetEnumerator() | Sort-Object Name | ForEach-Object { $_.Key + '=' + $_.Value } |
    Set-Content -LiteralPath $configurationPath -Encoding utf8
Write-Output 'Database roles ready: restricted application login and separate migration owner.'
