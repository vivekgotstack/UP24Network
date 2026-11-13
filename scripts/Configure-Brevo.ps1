$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$localRoot = Join-Path $projectRoot 'backend\.local'
New-Item -ItemType Directory -Force -Path $localRoot | Out-Null
$sender = (Read-Host 'Sender email address already verified in Brevo').Trim()
try { $address = [System.Net.Mail.MailAddress]::new($sender) } catch { throw 'Enter a valid sender email address.' }
if ($address.Address -ne $sender) { throw 'Enter only the sender email address, without a display name.' }
$secureKey = Read-Host 'Brevo API key (hidden)' -AsSecureString
$credential = [System.Net.NetworkCredential]::new('', $secureKey)
$apiKey = $credential.Password.Trim()
if ($apiKey.Length -lt 20 -or $apiKey -match '[\r\n]') { throw 'The API key is incomplete.' }
@(('up24.providers.brevo.sender-email=' + $sender),
  ('up24.providers.brevo.api-key=' + $apiKey.Replace('\','\\'))) |
    Set-Content -LiteralPath (Join-Path $localRoot 'mail.properties') -Encoding utf8
$apiKey = $null
$credential = $null
Write-Output 'Brevo configuration saved in backend/.local/mail.properties (excluded from Git).'
Write-Output 'Restart with: .\scripts\Backend.ps1 Restart. Then open /admin/sign-in and request your code.'
