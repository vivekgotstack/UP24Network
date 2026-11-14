# Shared by local launchers, including Windows PowerShell 5.1 used by VS Code.
function New-Up24LocalSecret {
    param([ValidateRange(16,64)][int]$ByteCount = 24)
    $bytes = New-Object byte[] $ByteCount
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($bytes)
        return [BitConverter]::ToString($bytes).Replace('-', '')
    } finally { $generator.Dispose() }
}

function Write-Up24Utf8File {
    param([Parameter(Mandatory)][string]$Path,
          [Parameter(Mandatory)][string[]]$Lines)
    # Java properties and PostgreSQL password files must not acquire a UTF-8 BOM.
    [System.IO.File]::WriteAllLines($Path, $Lines, [System.Text.UTF8Encoding]::new($false))
}
