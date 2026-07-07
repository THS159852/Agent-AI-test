# Copy QA agent and skills into Cursor user directory
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$agentsSrc = Join-Path $root "agents"
$skillsSrc = Join-Path $root "skills"
$agentsDst = Join-Path $env:USERPROFILE ".cursor\agents"
$skillsDst = Join-Path $env:USERPROFILE ".cursor\skills"

New-Item -ItemType Directory -Force -Path $agentsDst | Out-Null
New-Item -ItemType Directory -Force -Path $skillsDst | Out-Null

# Only one agent — skills do the work
Copy-Item -Path (Join-Path $agentsSrc "qa-agent-router.md") -Destination $agentsDst -Force

Get-ChildItem $skillsSrc -Directory | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination (Join-Path $skillsDst $_.Name) -Recurse -Force
}

Write-Host "Installed agent:  $agentsDst\qa-agent-router.md"
Write-Host "Installed skills: $skillsDst"
