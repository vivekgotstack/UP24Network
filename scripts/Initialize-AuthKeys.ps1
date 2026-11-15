$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'Local-Configuration.ps1')
$configurationPath = Join-Path $taskRoot 'backend/.local/application.properties'
$configuration = Get-Content -Raw -LiteralPath $configurationPath | ConvertFrom-StringData
$keyPath = Join-Path $taskRoot 'backend/.local/auth-signing.p12'
if (-not (Test-Path -LiteralPath $keyPath)) {
    $password = New-Up24LocalSecret -ByteCount 32
    $previousPassword = $env:UP24_LOCAL_KEY_PASSWORD
    try {
        $env:UP24_LOCAL_KEY_PASSWORD = $password
        & keytool.exe -genkeypair -alias up24 -keyalg RSA -keysize 3072 -validity 3650 -storetype PKCS12 -keystore $keyPath -storepass:env UP24_LOCAL_KEY_PASSWORD -dname 'CN=UP24Network Local Signing' -noprompt
        if ($LASTEXITCODE -ne 0) { throw 'Could not generate the local authentication signing key.' }
    } finally { $env:UP24_LOCAL_KEY_PASSWORD = $previousPassword }
    $configuration['up24.auth.key-store-password'] = $password
}
if (-not $configuration['up24.auth.key-store-password']) { throw 'The local signing key password is missing. Restore its local configuration.' }
$configuration['up24.auth.key-store'] = 'file:./.local/auth-signing.p12'
$configuration['up24.auth.cookie-secure'] = 'false'
Write-Up24Utf8File -Path $configurationPath -Lines @($configuration.GetEnumerator() | Sort-Object Name | ForEach-Object { $_.Key + '=' + $_.Value })
Write-Output 'Local JWT signing key ready; private key and password are excluded from Git.'
