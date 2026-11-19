$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'Local-Configuration.ps1')
$configurationPath = Join-Path $taskRoot 'backend/.local/application.properties'
$configuration = Get-Content -Raw -LiteralPath $configurationPath | ConvertFrom-StringData
$environmentPath = Join-Path $taskRoot 'backend/.env'
if (-not (Test-Path -LiteralPath $environmentPath)) {
    $password = $configuration['up24.bootstrap.admin-password']
    if (-not $password) { $password = New-Up24LocalSecret -ByteCount 16 }
    Write-Up24Utf8File -Path $environmentPath -Lines @(
        '# Private backend configuration. Spring .properties syntax: keep values unquoted.'
        '# Set ADMIN_PASSWORD yourself, then restart the backend. Use 12-64 characters.'
        'ADMIN_EMAIL=admin@example.invalid'
        ('ADMIN_PASSWORD=' + $password)
        ''
        '# Bind these values to the identity module. Edit the two settings above.'
        'up24.bootstrap.admin-email=${ADMIN_EMAIL}'
        'up24.bootstrap.admin-password=${ADMIN_PASSWORD}'
        'up24.newsroom.admin-email=${ADMIN_EMAIL}'
    )
}
# Do not keep a second active copy of the administrator password.
$configuration.Remove('up24.bootstrap.admin-password')
Write-Up24Utf8File -Path $configurationPath -Lines @($configuration.GetEnumerator() | Sort-Object Name | ForEach-Object { $_.Key + '=' + $_.Value })
Write-Up24Utf8File -Path (Join-Path $taskRoot 'backend/.local/admin-login.txt') -Lines @(
    'Administrator email and password: backend/.env'
    'After changing ADMIN_PASSWORD, restart the backend; existing admin logins are revoked.'
)
Write-Output 'Administrator settings ready in backend/.env; existing values were preserved.'
