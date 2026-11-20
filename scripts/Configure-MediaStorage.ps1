[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidatePattern('^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$')][string]$Bucket,
    [Parameter(Mandatory)][string]$CdnUrl,
    [Parameter(Mandatory)][ValidatePattern('^[a-z]{2}(-[a-z]+)+-[0-9]$')][string]$Region,
    [ValidatePattern('^[a-zA-Z0-9_-]+(/[a-zA-Z0-9_-]+)*/$')][string]$Prefix = 'up24/published/images/',
    [ValidatePattern('^[a-zA-Z0-9_-]+(/[a-zA-Z0-9_-]+)*/$')][string]$VideoPrefix = 'up24/published/videos/',
    [ValidatePattern('^[a-zA-Z0-9_-]+(/[a-zA-Z0-9_-]+)*/$')][string]$PrivateVideoPrefix = 'up24/private/videos/',
    [string]$SiteUrl = 'https://www.up24network.com',
    [ValidatePattern('^([0-9]{12})?$')][string]$AccountId = '',
    [ValidatePattern('^([A-Z0-9]{8,32})?$')][string]$DistributionId = ''
)
$ErrorActionPreference = 'Stop'
if ($Bucket.Contains('..') -or $Prefix.Length -gt 200 -or $VideoPrefix.Length -gt 200 -or $PrivateVideoPrefix.Length -gt 200) { throw 'Use a valid private bucket and scoped prefixes.' }
foreach ($publicPrefix in @($Prefix,$VideoPrefix)) {
    if ($publicPrefix.StartsWith($PrivateVideoPrefix) -or $PrivateVideoPrefix.StartsWith($publicPrefix)) { throw 'Private originals must use a separate prefix from public media.' }
}
$origin = [Uri]$CdnUrl
if (-not $origin.IsAbsoluteUri -or $origin.Scheme -ne 'https' -or $origin.UserInfo -or $origin.Query -or $origin.Fragment -or
    $origin.AbsolutePath -ne '/' -or -not $origin.IsDefaultPort) { throw 'CdnUrl must be an HTTPS CloudFront/custom origin without a path.' }
if ([bool]$AccountId -ne [bool]$DistributionId) { throw 'Provide AccountId and DistributionId together to generate the CloudFront bucket policy.' }
$site = [Uri]$SiteUrl
if (-not $site.IsAbsoluteUri -or $site.Scheme -ne 'https' -or $site.UserInfo -or $site.Query -or $site.Fragment -or $site.AbsolutePath -ne '/' -or -not $site.IsDefaultPort) { throw 'SiteUrl must be your public HTTPS site origin.' }
$uploadOrigin = 'https://' + $Bucket + '.s3.' + $Region + '.amazonaws.com'
if ($Bucket.Contains('.')) { $uploadOrigin = 'https://s3.' + $Region + '.amazonaws.com' }
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
    UP24_S3_BUCKET=$Bucket;AWS_REGION=$Region;UP24_S3_PREFIX=$Prefix;UP24_S3_VIDEO_PREFIX=$VideoPrefix;UP24_S3_STAGING_PREFIX=$PrivateVideoPrefix;UP24_MEDIA_CDN_URL=$origin.GetLeftPart([UriPartial]::Authority)
})
Set-PublicSetting -Path (Join-Path $projectRoot 'frontend/.env.local') -Settings ([ordered]@{MEDIA_CDN_URL=$origin.GetLeftPart([UriPartial]::Authority);MEDIA_UPLOAD_ORIGIN=$uploadOrigin})
$outputDirectory = Join-Path $projectRoot '.local/media-storage'
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$runtimePolicy = [ordered]@{
    Version='2012-10-17';Statement=@(
        @{Sid='UP24MediaObjects';Effect='Allow';Action=@('s3:GetObject','s3:PutObject','s3:DeleteObject','s3:GetObjectTagging','s3:PutObjectTagging');Resource=@(('arn:aws:s3:::'+$Bucket+'/'+$Prefix+'*'),('arn:aws:s3:::'+$Bucket+'/'+$VideoPrefix+'*'),('arn:aws:s3:::'+$Bucket+'/'+$PrivateVideoPrefix+'*'))},
        @{Sid='UP24ManagedRetention';Effect='Allow';Action=@('s3:GetLifecycleConfiguration','s3:PutLifecycleConfiguration');Resource=('arn:aws:s3:::'+$Bucket)}
    )
}
Write-Up24Utf8File -Path (Join-Path $outputDirectory 'runtime-iam-policy.json') -Lines @($runtimePolicy | ConvertTo-Json -Depth 10)
if ($AccountId) {
    $bucketArn = 'arn:aws:s3:::' + $Bucket
    $bucketPolicy = [ordered]@{Version='2012-10-17';Statement=@(
        @{
            Sid='UP24CloudFrontRead';Effect='Allow';Principal=@{Service='cloudfront.amazonaws.com'};Action='s3:GetObject'
            Resource=@(($bucketArn+'/'+$Prefix+'*'),($bucketArn+'/'+$VideoPrefix+'*'))
            Condition=@{StringEquals=@{
                'AWS:SourceArn'=('arn:aws:cloudfront::'+$AccountId+':distribution/'+$DistributionId)
                'AWS:SourceAccount'=$AccountId
            }}
        },
        @{
            Sid='UP24DenyInsecureTransport';Effect='Deny';Principal='*';Action='s3:*'
            Resource=@($bucketArn,($bucketArn+'/*'))
            Condition=@{Bool=@{'aws:SecureTransport'='false';'aws:PrincipalIsAWSService'='false'}}
        }
    )}
    Write-Up24Utf8File -Path (Join-Path $outputDirectory 'cloudfront-bucket-policy.json') -Lines @($bucketPolicy | ConvertTo-Json -Depth 10)
}
$corsPolicy = [ordered]@{CORSRules=@(@{
    AllowedOrigins=@($site.GetLeftPart([UriPartial]::Authority));AllowedMethods=@('PUT','HEAD');
    AllowedHeaders=@('content-type','if-none-match','x-amz-checksum-sha256','x-amz-checksum-crc32','x-amz-sdk-checksum-algorithm');ExposeHeaders=@('ETag','x-amz-checksum-sha256');MaxAgeSeconds=600
})}
Write-Up24Utf8File -Path (Join-Path $outputDirectory 'bucket-cors.json') -Lines @($corsPolicy | ConvertTo-Json -Depth 10)
Write-Output 'Bucket/CDN settings saved; AWS credentials were left untouched.'
Write-Output 'Scoped IAM policies: .local/media-storage/. Keep S3 Block Public Access enabled and use CloudFront Origin Access Control.'
Write-Output 'Apply bucket-cors.json to allow signed video uploads from your exact site origin. Private originals are excluded from the CloudFront read policy.'
Write-Output 'When ready, set UP24_MEDIA_STORAGE=s3 in backend/.env and restart. Rebuild/restart the frontend to load its media origin.'
Write-Output 'Enable the 365-day GIR rule in Admin > Media library. No AWS resources were created or changed by this script.'
