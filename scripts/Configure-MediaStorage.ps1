[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidatePattern('^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$')][string]$Bucket,
    [Parameter(Mandatory)][string]$CdnUrl,
    [ValidatePattern('^[a-z]{2}(-[a-z]+)+-[0-9]$')][string]$Region = 'ap-south-1',
    [ValidatePattern('^[a-zA-Z0-9_-]+(/[a-zA-Z0-9_-]+)*/$')][string]$Prefix = 'up24/published/images/',
    [ValidatePattern('^([0-9]{12})?$')][string]$AccountId = '',
    [ValidatePattern('^([A-Z0-9]{8,32})?$')][string]$DistributionId = ''
)
$ErrorActionPreference = 'Stop'
if ($Bucket.Contains('..') -or $Prefix.Length -gt 200) { throw 'Use a valid private bucket and a scoped prefix.' }
$origin = [Uri]$CdnUrl
if (-not $origin.IsAbsoluteUri -or $origin.Scheme -ne 'https' -or $origin.UserInfo -or $origin.Query -or $origin.Fragment -or
    $origin.AbsolutePath -ne '/' -or -not $origin.IsDefaultPort) { throw 'CdnUrl must be an HTTPS CloudFront/custom origin without a path.' }
if ([bool]$AccountId -ne [bool]$DistributionId) { throw 'Provide AccountId and DistributionId together to generate the CloudFront bucket policy.' }
& (Join-Path $PSScriptRoot 'Initialize-MediaEnvironment.ps1')
$projectRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'Local-Configuration.ps1')
function Set-PublicSetting {
    param([string]$Path,[System.Collections.IDictionary]$Settings)
    $remaining = @{}
    foreach ($key in $Settings.Keys) { $remaining[$key] = $Settings[$key] }
    $lines = @()
    if (Test-Path -LiteralPath $Path) {
        foreach ($line in @(Get-Content -LiteralPath $Path)) {
            if ($line -match '^\s*([^#!\s=]+)\s*=' -and $Settings.Contains($Matches[1])) {
                $key = $Matches[1]
                if ($remaining.ContainsKey($key)) { $lines += ($key + '=' + $remaining[$key]);$remaining.Remove($key) }
            } else { $lines += $line }
        }
    }
    foreach ($key in ($remaining.Keys | Sort-Object)) { $lines += ($key + '=' + $remaining[$key]) }
    Write-Up24Utf8File -Path $Path -Lines $lines
}
Set-PublicSetting -Path (Join-Path $projectRoot 'backend/.env') -Settings ([ordered]@{
    UP24_S3_BUCKET=$Bucket;AWS_REGION=$Region;UP24_S3_PREFIX=$Prefix;UP24_MEDIA_CDN_URL=$origin.GetLeftPart([UriPartial]::Authority)
})
Set-PublicSetting -Path (Join-Path $projectRoot 'frontend/.env.local') -Settings ([ordered]@{MEDIA_CDN_URL=$origin.GetLeftPart([UriPartial]::Authority)})
$outputDirectory = Join-Path $projectRoot '.local/media-storage'
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$runtimePolicy = [ordered]@{
    Version='2012-10-17';Statement=@(
        @{Sid='UP24MediaObjects';Effect='Allow';Action=@('s3:GetObject','s3:PutObject','s3:DeleteObject','s3:GetObjectTagging','s3:PutObjectTagging');Resource=('arn:aws:s3:::'+$Bucket+'/'+$Prefix+'*')},
        @{Sid='UP24ManagedRetention';Effect='Allow';Action=@('s3:GetLifecycleConfiguration','s3:PutLifecycleConfiguration');Resource=('arn:aws:s3:::'+$Bucket)}
    )
}
Write-Up24Utf8File -Path (Join-Path $outputDirectory 'runtime-iam-policy.json') -Lines @($runtimePolicy | ConvertTo-Json -Depth 10)
if ($AccountId) {
    $bucketPolicy = [ordered]@{Version='2012-10-17';Statement=@(@{
        Sid='UP24CloudFrontRead';Effect='Allow';Principal=@{Service='cloudfront.amazonaws.com'};Action='s3:GetObject';
        Resource=('arn:aws:s3:::'+$Bucket+'/'+$Prefix+'*');Condition=@{StringEquals=@{'AWS:SourceArn'=('arn:aws:cloudfront::'+$AccountId+':distribution/'+$DistributionId)}}
    })}
    Write-Up24Utf8File -Path (Join-Path $outputDirectory 'cloudfront-bucket-policy.json') -Lines @($bucketPolicy | ConvertTo-Json -Depth 10)
}
Write-Output 'Bucket/CDN settings saved; AWS credentials were left untouched.'
Write-Output 'Scoped IAM policies: .local/media-storage/. Keep S3 Block Public Access enabled and use CloudFront Origin Access Control.'
Write-Output 'When ready, set UP24_MEDIA_STORAGE=s3 in backend/.env and restart. Rebuild/restart the frontend to load its media origin.'
Write-Output 'Enable the 365-day GIR rule in Admin > Media library. No AWS resources were created or changed by this script.'
