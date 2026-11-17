$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'Local-Configuration.ps1')
$environmentPath = Join-Path $projectRoot 'backend/.env'
if (-not (Test-Path -LiteralPath $environmentPath)) { throw 'Prepare the local backend first so backend/.env exists.' }
$lines = @(Get-Content -LiteralPath $environmentPath)
$keys = @{}
foreach ($line in $lines) {
    if ($line -match '^\s*([^#!\s=]+)\s*=') { $keys[$Matches[1]] = $true }
}
$defaults = [ordered]@{
    UP24_MEDIA_STORAGE = 'local'
    UP24_MEDIA_QUOTA_BYTES = '1073741824'
    UP24_S3_BUCKET = ''
    AWS_REGION = 'ap-south-1'
    UP24_S3_PREFIX = 'up24/published/images/'
    UP24_S3_VIDEO_PREFIX = 'up24/published/videos/'
    UP24_S3_STAGING_PREFIX = 'up24/private/videos/'
    UP24_VIDEO_QUOTA_BYTES = '53687091200'
    UP24_VIDEO_MAX_UPLOAD_BYTES = '262144000'
    UP24_VIDEO_FFMPEG = 'ffmpeg'
    UP24_VIDEO_FFPROBE = 'ffprobe'
    UP24_MEDIA_CDN_URL = ''
    AWS_ACCESS_KEY_ID = ''
    AWS_SECRET_ACCESS_KEY = ''
    AWS_SESSION_TOKEN = ''
}
$missing = @($defaults.Keys | Where-Object { -not $keys.ContainsKey($_) })
if ($missing.Count -gt 0) {
    $lines += @('', '# Media storage. Fill your own AWS settings, then select s3 and restart.',
        '# The local-preview profile always uses local storage. No AWS account is needed for preview.',
        '# AWS_SESSION_TOKEN is optional for temporary credentials. Keep all secrets private.')
    foreach ($key in $missing) { $lines += ($key + '=' + $defaults[$key]) }
    Write-Up24Utf8File -Path $environmentPath -Lines $lines
}
Write-Output 'Media settings ready in ignored backend/.env. Existing values were preserved; no cloud resources were contacted.'
