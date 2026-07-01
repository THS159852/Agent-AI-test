# Pull latest from GitHub and install into Cursor
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host "Pulling latest changes..."
git pull

Write-Host "Installing to Cursor..."
& (Join-Path $root "install.ps1")

Write-Host "Done. Agent and skills are up to date."
