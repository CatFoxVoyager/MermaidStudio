# Launches the MermaidStudio dev crew with the OpenAI-compatible credentials
# stored at Windows USER level (HKCU registry). Running processes never see a
# registry update, so the values are copied into this process environment
# here. They are never printed.
param(
    [string]$Mission
)

$env:OPENAI_API_KEY = [Environment]::GetEnvironmentVariable('OPENAI_API_KEY', 'User')
$env:OPENAI_BASE_URL = [Environment]::GetEnvironmentVariable('OPENAI_BASE_URL', 'User')

if (-not $env:OPENAI_API_KEY) {
    Write-Error 'OPENAI_API_KEY is not set at user level (HKCU:\Environment).'
    exit 1
}

# Node (scoop) is needed by the reviewer's whitelisted npm/npx commands.
$node = "$env:USERPROFILE\scoop\apps\nodejs-lts\current"
if (Test-Path $node) { $env:PATH = "$node;$env:PATH" }

if ($Mission) { $env:CREW_MISSION = $Mission }

Set-Location $PSScriptRoot
crewai run @args
