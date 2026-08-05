#!/usr/bin/env bash
# impulse — statusline badge script for Claude Code.
# Reads the impulse flag file and prints a colored [IMPULSE:...] badge.
#
# Usage in ~/.claude/settings.json:
#   "statusLine": { "type": "command", "command": "bash /path/to/impulse-statusline.sh" }
#
# Renders nothing (exit 0) when impulse is inactive or the flag is unreadable.

FLAG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.impulse-active"
[ -f "$FLAG" ] || exit 0

RAW=$(head -c 1024 "$FLAG" 2>/dev/null)
[ -n "$RAW" ] || exit 0

backend=$(printf '%s' "$RAW" | grep -o '"backend"[[:space:]]*:[[:space:]]*true')
frontend=$(printf '%s' "$RAW" | grep -o '"frontend"[[:space:]]*:[[:space:]]*true')
mode=$(printf '%s' "$RAW" | grep -oE '"mode"[[:space:]]*:[[:space:]]*"[a-z]+"' | grep -oE '"[a-z]+"$' | tr -d '"')

label=""
[ -n "$backend" ] && label="BE"
if [ -n "$frontend" ]; then
  if [ -n "$label" ]; then label="${label}+FE"; else label="FE"; fi
fi
[ -n "$label" ] || exit 0

suffix=""
if [ -n "$mode" ] && [ "$mode" != "medium" ]; then
  suffix=":$(printf '%s' "$mode" | tr '[:lower:]' '[:upper:]')"
fi

printf '\033[38;5;135m[IMPULSE:%s%s]\033[0m' "$label" "$suffix"
