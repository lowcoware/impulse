#!/usr/bin/env bash
# impulse — statusline badge script for Claude Code.
# Reads the impulse flag file and prints a colored [IMPULSE:...] badge.
#
# Usage in ~/.claude/settings.json:
#   "statusLine": { "type": "command", "command": "bash /path/to/impulse-statusline.sh" }
#
# Renders nothing (exit 0) when impulse is inactive or the flag is unreadable.

FLAG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.impulse-active"

# Core layer state: on unless the config explicitly disables it (or env does).
# Real JSON parse via node (hooks already require node) — a grep would
# false-match "core": false inside nested objects or string values, and a
# byte-capped read would miss the key in a grown config.
core_on=1
[ "$IMPULSE_CORE" = "0" ] && core_on=0
CFG="$HOME/.config/impulse/config.json"
if [ "$core_on" = "1" ] && [ -f "$CFG" ]; then
  core_res=$(node -e '
    try {
      const fs = require("fs");
      const cfg = JSON.parse(fs.readFileSync(process.argv[1], "utf8").replace(/^﻿/, ""));
      process.stdout.write(cfg.core === false ? "off" : "on");
    } catch (e) { process.stdout.write("on"); }
  ' "$CFG" 2>/dev/null)
  [ "$core_res" = "off" ] && core_on=0
fi

RAW=""
[ -f "$FLAG" ] && RAW=$(head -c 1024 "$FLAG" 2>/dev/null)

backend=""
frontend=""
mode=""
if [ -n "$RAW" ]; then
  backend=$(printf '%s' "$RAW" | grep -o '"backend"[[:space:]]*:[[:space:]]*true')
  frontend=$(printf '%s' "$RAW" | grep -o '"frontend"[[:space:]]*:[[:space:]]*true')
  mode=$(printf '%s' "$RAW" | grep -oE '"mode"[[:space:]]*:[[:space:]]*"[a-z]+"' | grep -oE '"[a-z]+"$' | tr -d '"')
fi

label=""
[ -n "$backend" ] && label="BE"
if [ -n "$frontend" ]; then
  if [ -n "$label" ]; then label="${label}+FE"; else label="FE"; fi
fi

# No domain mode: show the core badge alone (or nothing if core is off too).
if [ -z "$label" ]; then
  if [ "$core_on" = "1" ]; then
    printf '\033[38;5;135m[IMPULSE:CORE]\033[0m'
  fi
  exit 0
fi

suffix=""
if [ -n "$mode" ] && [ "$mode" != "medium" ]; then
  suffix=":$(printf '%s' "$mode" | tr '[:lower:]' '[:upper:]')"
fi

printf '\033[38;5;135m[IMPULSE:%s%s]\033[0m' "$label" "$suffix"
