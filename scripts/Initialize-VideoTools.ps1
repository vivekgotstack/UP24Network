[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
. (Join-Path $PSScriptRoot 'Local-Configuration.ps1')
$toolDirectory = [IO.Path]::GetFullPath((Join-Path $projectRoot '.local/media-tools'))
if (-not $toolDirectory.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid local video tool directory.' }
New-Item -ItemType Directory -Force -Path $toolDirectory | Out-Null
$ffmpegPath = Join-Path $toolDirectory 'ffmpeg.exe'
$ffprobePath = Join-Path $toolDirectory 'ffprobe.exe'
if (-not (Test-Path -LiteralPath $ffmpegPath) -or -not (Test-Path -LiteralPath $ffprobePath)) {
    $download = Join-Path $toolDirectory 'ffmpeg-release-essentials.zip'
    $checksumUrl = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip.sha256'
    $checksumResponse = Invoke-WebRequest -UseBasicParsing -Uri $checksumUrl -TimeoutSec 60
    $checksumText = if ($checksumResponse.Content -is [byte[]]) { [Text.Encoding]::UTF8.GetString($checksumResponse.Content) } else { [string]$checksumResponse.Content }
    $match = [regex]::Match([string]$checksumText,'(?i)\b[a-f0-9]{64}\b')
    if (-not $match.Success) { throw 'The FFmpeg publisher did not provide a usable SHA-256 checksum.' }
    Invoke-WebRequest -UseBasicParsing -Uri 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -OutFile $download -TimeoutSec 900
    if ((Get-FileHash -LiteralPath $download -Algorithm SHA256).Hash -ne $match.Value) { throw 'FFmpeg download checksum mismatch. No binary was installed.' }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($download)
    try {
        foreach ($binary in @('ffmpeg.exe','ffprobe.exe')) {
            $entries = @($archive.Entries | Where-Object { $_.FullName -match ('/bin/' + [regex]::Escape($binary) + '$') })
            if ($entries.Count -ne 1) { throw "The FFmpeg archive does not contain exactly one $binary." }
            [IO.Compression.ZipFileExtensions]::ExtractToFile($entries[0],(Join-Path $toolDirectory $binary),$true)
        }
        $license = @($archive.Entries | Where-Object { $_.FullName -match '/LICENSE(?:\.txt)?$' } | Select-Object -First 1)
        if ($license.Count -eq 1) { [IO.Compression.ZipFileExtensions]::ExtractToFile($license[0],(Join-Path $toolDirectory 'LICENSE.txt'),$true) }
    } finally { $archive.Dispose() }
    Remove-Item -LiteralPath $download
}
$environmentPath = Join-Path $projectRoot 'backend/.env'
if (-not (Test-Path -LiteralPath $environmentPath)) { throw 'Initialize the backend environment before setting video tools.' }
$settings = [ordered]@{UP24_VIDEO_FFMPEG=$ffmpegPath.Replace('\','/');UP24_VIDEO_FFPROBE=$ffprobePath.Replace('\','/')}
$seen = @{}
$lines = @(foreach ($line in @(Get-Content -LiteralPath $environmentPath)) {
    if ($line -match '^(UP24_VIDEO_FFMPEG|UP24_VIDEO_FFPROBE)=(.*)$') {
        $key=$Matches[1];$value=$Matches[2];$seen[$key]=$true
        if ($value -eq '' -or $value -eq 'ffmpeg' -or $value -eq 'ffprobe' -or $value.StartsWith($toolDirectory.Replace('\','/'),[StringComparison]::OrdinalIgnoreCase)) { $key+'='+$settings[$key] }
        else { $line }
    } else { $line }
})
foreach ($key in $settings.Keys) { if (-not $seen.ContainsKey($key)) { $lines += ($key+'='+$settings[$key]) } }
Write-Up24Utf8File -Path $environmentPath -Lines $lines
Write-Output 'Verified portable FFmpeg/ffprobe are ready in ignored .local/media-tools. Backend local-tool settings were prepared; custom settings were preserved.'
