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

# Core layer state: on unless config/env explicitly disables it.
$CoreOn = $true
if ($env:IMPULSE_CORE -eq "0") { $CoreOn = $false }
if ($CoreOn) {
    $Cfg = Join-Path $HOME ".config/impulse/config.json"
    if (Test-Path $Cfg) {
        try {
            $CfgData = (Get-Content -LiteralPath $Cfg -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop)
            # Strict boolean check: PS coerces "false" (string) -eq $false to true,
            # which would disagree with the node hooks' cfg.core !== false.
            if (($CfgData.core -is [bool]) -and (-not $CfgData.core)) { $CoreOn = $false }
        } catch { }
    }
}

$Data = $null
if (Test-Path $Flag) {
    try {
        $Raw = Get-Content -LiteralPath $Flag -Raw -ErrorAction Stop
        $Data = $Raw | ConvertFrom-Json -ErrorAction Stop
    } catch { }
}

$Label = ""
if ($Data -and $Data.backend -eq $true) { $Label = "BE" }
if ($Data -and $Data.frontend -eq $true) {
    if ($Label) { $Label = "$Label+FE" } else { $Label = "FE" }
}

# No domain mode: core badge alone, or nothing if core is off too.
if (-not $Label) {
    if ($CoreOn) {
        $Esc = [char]27
        [Console]::Write("${Esc}[38;5;135m[IMPULSE:CORE]${Esc}[0m")
    }
    exit 0
}

$Mode = [string]$Data.mode
$Suffix = ""
if ($Mode -and $Mode -ne "medium") {
    $Suffix = ":" + $Mode.ToUpperInvariant()
}

$Esc = [char]27
[Console]::Write("${Esc}[38;5;135m[IMPULSE:$Label$Suffix]${Esc}[0m")
