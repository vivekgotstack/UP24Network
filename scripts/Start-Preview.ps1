$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'Backend.ps1') Restart -Profile local-preview
& (Join-Path $PSScriptRoot 'Start-Prototype.ps1')
Write-Output 'Local preview is ready: http://127.0.0.1:3000'
Write-Output 'Sample staff accounts: backend/.local/preview-login.txt'
Write-Output 'Admin sign-in: http://127.0.0.1:3000/admin/sign-in'
Write-Output 'Staff sign-in: http://127.0.0.1:3000/newsroom/sign-in'
Write-Output 'Email codes: backend/.local/preview-mailbox/latest-message.txt'
Write-Output 'Return to editorial data: .\scripts\Backend.ps1 Restart -Profile default'
