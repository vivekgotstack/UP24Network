$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'Local-Configuration.ps1')
$environmentPath = Join-Path $projectRoot 'backend/.env'
if (-not (Test-Path -LiteralPath $environmentPath)) { throw 'Prepare the local backend first so backend/.env exists.' }
$lines = @(Get-Content -LiteralPath $environmentPath)
$keys = @{}
foreach ($line in $lines) { if ($line -match '^\s*([^#!\s=]+)\s*=') { $keys[$Matches[1]] = $true } }
$defaults = [ordered]@{
    BREVO_API_KEY = ''
    BREVO_SENDER_EMAIL = ''
    ASTROLOGICS_API_KEY = ''
    YOUTUBE_API_KEY = ''
    UP24_JOBS_TRANSPORT = 'local'
    JOB_ENCRYPTION_SECRET = ''
    RABBITMQ_HOST = '127.0.0.1'
    RABBITMQ_PORT = '5672'
    RABBITMQ_USERNAME = 'up24'
    RABBITMQ_PASSWORD = ''
    RABBITMQ_VHOST = 'up24'
}
$missing = @($defaults.Keys | Where-Object { -not $keys.ContainsKey($_) })
if ($missing.Count -gt 0) {
    $lines += @('', '# Services. Supply your own external-provider keys; leave unused providers empty.',
        '# Docker deployment generates a private RabbitMQ password automatically.',
        '# Keep JOB_ENCRYPTION_SECRET stable while queued jobs exist; it is separate from login codes.')
    foreach ($key in $missing) {
        $value = $defaults[$key]
        if ($key -eq 'JOB_ENCRYPTION_SECRET') {
            $deployedKey = Join-Path $projectRoot '.local/deployment/job-encryption-secret'
            if (Test-Path -LiteralPath $deployedKey) { $value = (Get-Content -LiteralPath $deployedKey -Raw).Trim() }
            else { $value = New-Up24LocalSecret -ByteCount 32 }
        }
        $lines += ($key + '=' + $value)
    }
    Write-Up24Utf8File -Path $environmentPath -Lines $lines
}
Write-Output 'Service fields are ready in ignored backend/.env. Existing values and provider credentials were preserved.'
