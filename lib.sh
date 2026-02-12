#!/bin/bash
# Smoke test library – defaults and shared functions
# Source this file: source "$(dirname "$0")/lib.sh"

# =============================================================================
# Default values
# =============================================================================

# X_IDENTIFIER: if set, passed as x-identifier header; default empty (header omitted when empty)
: "${X_IDENTIFIER:=}"
: "${API_BASE:=https://monitoring.cloudzy.com}"
: "${STATUS_SLUG:=uptime}"
: "${STATUS_BASE:=http://localhost:8765}"
: "${CURL_TIMEOUT:=15}"

# Error counter (call reset_errors before each scenario)
ERRORS=0

# =============================================================================
# Functions
# =============================================================================

reset_errors() {
  ERRORS=0
}

# Perform a GET request with standard headers
# Usage: curl_req <url>
# Output: response body + newline + http_code
curl_req() {
  local opts=(-sS -w "\n%{http_code}" --max-time "${CURL_TIMEOUT}"
    -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
    -H "Accept: application/json, text/plain, */*")
  [ -n "$X_IDENTIFIER" ] && opts+=(-H "x-identifier: $X_IDENTIFIER")
  curl "${opts[@]}" "$@"
}

# Perform a GET request (for static assets, simpler headers)
curl_req_simple() {
  local opts=(-sS -w "%{http_code}" -o /dev/null --max-time "${CURL_TIMEOUT}"
    -H "User-Agent: Mozilla/5.0")
  [ -n "$X_IDENTIFIER" ] && opts+=(-H "x-identifier: $X_IDENTIFIER")
  curl "${opts[@]}" "$@"
}

# Assert HTTP response code; increment ERRORS on failure
# Usage: assert_http <path> <code> [body_preview]
# Succeeds: 200, or 404 for incidents, or 301/302 for /api-docs
assert_http() {
  local path="$1"
  local code="$2"
  local body="${3:-}"
  if [ "$code" = "200" ]; then
    log_ok "$path" "$code"
  elif [ "$code" = "404" ] && [[ "$path" == *"incidents"* ]]; then
    log_ok "$path" "$code (announcements disabled)"
  elif [[ "$code" =~ ^(301|302)$ ]] && [[ "$path" == "/api-docs" ]]; then
    log_ok "$path" "$code (redirect)"
  else
    log_fail "$path" "$code" "$body"
    ERRORS=$((ERRORS + 1))
  fi
}

# Assert JSON body has required key(s)
# Usage: assert_json_has <body> <jq_path...>
# Example: assert_json_has "$body" .status .regions
assert_json_has() {
  local body="$1"
  shift
  for path in "$@"; do
    if ! echo "$body" | jq -e "$path" >/dev/null 2>&1; then
      return 1
    fi
  done
  return 0
}

# Assert JSON value; fails if missing or different
# Usage: assert_json_eq <body> <jq_path> <expected>
assert_json_eq() {
  local body="$1" path="$2" expected="$3"
  local actual
  actual=$(echo "$body" | jq -r "$path" 2>/dev/null)
  [ "$actual" = "$expected" ]
}

# Assert simple 200 for static assets
assert_ok() {
  local path="$1"
  local code="$2"
  if [ "$code" = "200" ]; then
    log_ok "$path" "$code"
  else
    log_fail "$path" "$code" ""
    ERRORS=$((ERRORS + 1))
  fi
}

log_ok() {
  printf "  OK %s -> %s\n" "$1" "$2"
}

log_fail() {
  printf "  FAIL %s -> %s\n" "$1" "$2"
  if [ -n "$3" ]; then
    printf "    Response: %s...\n" "${3:0:80}"
  fi
}

# Fetch URL and return (body, code)
# Usage: fetch_url <url>
# Sets: FETCH_BODY, FETCH_CODE
fetch_url() {
  local out
  out=$(curl_req "$1")
  FETCH_CODE=$(echo "$out" | tail -n1)
  FETCH_BODY=$(echo "$out" | sed '$d')
}

# =============================================================================
# API endpoint lists
# =============================================================================

# All public API endpoints for monitoring.cloudzy.com
get_api_endpoints() {
  echo "/health"
  echo "/robots.txt"
  echo "/sitemap.xml"
  echo "/api-docs"
  echo "/api-docs.json"
  echo "/api/status/${STATUS_SLUG}"
  echo "/api/status/${STATUS_SLUG}/incidents.json"
  echo "/api/status/${STATUS_SLUG}/incidents.rss"
  echo "/api/status/${STATUS_SLUG}/regions"
  echo "/api/status/${STATUS_SLUG}/regions/uptime"
  echo "/api/status/${STATUS_SLUG}/regions/latency"
  echo "/api/status/${STATUS_SLUG}/regions/incidents"
  echo "/api/status/${STATUS_SLUG}/regions/maintenance"
}

# Static assets for status-page (when served locally)
get_static_paths() {
  echo "/"
  echo "/offline.html"
  echo "/manifest.json"
  echo "/style.css"
  echo "/align-ui.css"
  echo "/globe.js"
  echo "/service-worker.js"
}
