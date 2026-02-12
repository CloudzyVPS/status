#!/bin/bash
# Regenerate config.js from config.json (single source of truth)
# Run after editing config.json

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_JSON="$ROOT/config.json"
CONFIG_JS="$ROOT/config.js"

if [ ! -f "$CONFIG_JSON" ]; then
  echo "config.json not found" >&2
  exit 1
fi

# Generate config.js
echo "// Generated from config.json - single source of truth
self.STATUS_CONFIG=$(cat "$CONFIG_JSON");
" > "$CONFIG_JS"

echo "Generated $CONFIG_JS from $CONFIG_JSON"
