# impulse — statusline badge script for Claude Code.
# Reads the impulse flag file and prints a colored [IMPULSE:...] badge.
#
# Usage in ~/.claude/settings.json:
#   "statusLine": { "type": "command", "command": "powershell -ExecutionPolicy Bypass -File C:\path\impulse-statusline.ps1" }
#
# Renders nothing (exit 0) when impulse is inactive or the flag is unreadable.

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ClaudeDir = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME ".claude" }
$Flag = Join-Path $ClaudeDir ".impulse-active"
if (-not (Test-Path $Flag)) { exit 0 }

$Data = $null
try {
    $Raw = Get-Content -LiteralPath $Flag -Raw -ErrorAction Stop
    $Data = $Raw | ConvertFrom-Json -ErrorAction Stop
} catch {
    exit 0
}

$Label = ""
if ($Data.backend -eq $true) { $Label = "BE" }
if ($Data.frontend -eq $true) {
    if ($Label) { $Label = "$Label+FE" } else { $Label = "FE" }
}
if (-not $Label) { exit 0 }

$Mode = [string]$Data.mode
$Suffix = ""
if ($Mode -and $Mode -ne "medium") {
    $Suffix = ":" + $Mode.ToUpperInvariant()
}

$Esc = [char]27
[Console]::Write("${Esc}[38;5;135m[IMPULSE:$Label$Suffix]${Esc}[0m")
