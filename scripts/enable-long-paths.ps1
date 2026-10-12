# RunONCE in elevated PowerShell (右键“以管理员身份运行”) to allow paths > 260 chars.
# After this, you can assembleRelease from the long D:\HSG 2026 Project\... folder.

$ErrorActionPreference = "Stop"
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
  -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force | Out-Null
Write-Host "LongPathsEnabled=1 set. Restart the terminal (or reboot), then rebuild."
