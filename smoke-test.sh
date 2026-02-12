#!/bin/bash
# Smoke test – full scenario for monitoring.cloudzy.com and status-page
#
# Usage: ./smoke-test.sh [local]
#   local  - also test static assets on localhost:8765
#   (default) - API endpoints only
#
# Env: X_IDENTIFIER, API_BASE, STATUS_BASE, STATUS_SLUG, CURL_TIMEOUT
#      See lib.sh for defaults.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

# jq required for data assertions
command -v jq >/dev/null 2>&1 || { echo "jq required for data assertions (apt install jq)"; exit 1; }

MODE="${1:-}"

# =============================================================================
# Scenario: Status API availability
# =============================================================================
# Verifies all public monitoring.cloudzy.com endpoints respond correctly.
# Prerequisites: API_BASE points to monitoring backend
# Expected: 200 (or 404 for disabled incidents, 301/302 for redirects)
# =============================================================================
scenario_api_availability() {
  echo "--- Scenario: API Availability ($API_BASE) ---"
  reset_errors

  while IFS= read -r path; do
    [ -z "$path" ] && continue
    fetch_url "$API_BASE$path"
    assert_http "$path" "$FETCH_CODE" "$FETCH_BODY"
  done < <(get_api_endpoints)

  return $ERRORS
}

# =============================================================================
# Scenario: Status page data flow
# =============================================================================
# Simulates the status-page fetch sequence: health → regions → supplementary.
# Validates critical path for the dashboard to load.
# =============================================================================
scenario_data_flow() {
  echo ""
  echo "--- Scenario: Status Page Data Flow ---"
  reset_errors

  # Step 1: Health check
  echo "  Step 1: Health check"
  fetch_url "$API_BASE/health"
  if [ "$FETCH_CODE" != "200" ]; then
    log_fail "/health" "$FETCH_CODE" "$FETCH_BODY"
    ERRORS=$((ERRORS + 1))
  elif ! assert_json_has "$FETCH_BODY" .status .timestamp; then
    log_fail "/health" "200" "missing .status or .timestamp"
    ERRORS=$((ERRORS + 1))
  else
    log_ok "/health" "200 (status=$(echo "$FETCH_BODY" | jq -r .status))"
  fi

  # Step 2: Main status (critical for first paint)
  echo "  Step 2: Main status ($STATUS_SLUG)"
  fetch_url "$API_BASE/api/status/$STATUS_SLUG"
  if [ "$FETCH_CODE" != "200" ]; then
    log_fail "/api/status/$STATUS_SLUG" "$FETCH_CODE" "$FETCH_BODY"
    ERRORS=$((ERRORS + 1))
  elif ! assert_json_has "$FETCH_BODY" .tenant .overall_status; then
    log_fail "/api/status/$STATUS_SLUG" "200" "missing .tenant or .overall_status"
    ERRORS=$((ERRORS + 1))
  else
    log_ok "/api/status/$STATUS_SLUG" "200 (overall=$(echo "$FETCH_BODY" | jq -r .overall_status))"
  fi

  # Step 3: Regions (phase 1)
  echo "  Step 3: Regions"
  fetch_url "$API_BASE/api/status/$STATUS_SLUG/regions"
  if [ "$FETCH_CODE" != "200" ]; then
    log_fail "/api/status/$STATUS_SLUG/regions" "$FETCH_CODE" "$FETCH_BODY"
    ERRORS=$((ERRORS + 1))
  elif ! assert_json_has "$FETCH_BODY" .status .message .regions; then
    log_fail "/api/status/$STATUS_SLUG/regions" "200" "missing .status, .message or .regions"
    ERRORS=$((ERRORS + 1))
  else
    log_ok "/api/status/$STATUS_SLUG/regions" "200 (status=$(echo "$FETCH_BODY" | jq -r .status), regions=$(echo "$FETCH_BODY" | jq -r '.regions | length'))"
  fi

  # Step 4: Supplementary data (phase 2)
  echo "  Step 4: Supplementary (uptime, latency, incidents, maintenance)"
  for sub in uptime latency incidents maintenance; do
    fetch_url "$API_BASE/api/status/$STATUS_SLUG/regions/$sub"
    if [ "$FETCH_CODE" != "200" ]; then
      log_fail "/api/status/$STATUS_SLUG/regions/$sub" "$FETCH_CODE" "$FETCH_BODY"
      ERRORS=$((ERRORS + 1))
    elif [ "$sub" = "uptime" ] && ! assert_json_has "$FETCH_BODY" .days .regions; then
      log_fail "/api/status/$STATUS_SLUG/regions/uptime" "200" "missing .days or .regions"
      ERRORS=$((ERRORS + 1))
    elif [ "$sub" = "latency" ] && ! assert_json_has "$FETCH_BODY" .unit .matrix; then
      log_fail "/api/status/$STATUS_SLUG/regions/latency" "200" "missing .unit or .matrix"
      ERRORS=$((ERRORS + 1))
    elif [ "$sub" = "incidents" ] && ! echo "$FETCH_BODY" | jq -e 'type == "array"' >/dev/null 2>&1; then
      log_fail "/api/status/$STATUS_SLUG/regions/incidents" "200" "expected array"
      ERRORS=$((ERRORS + 1))
    elif [ "$sub" = "maintenance" ] && ! echo "$FETCH_BODY" | jq -e 'type == "array"' >/dev/null 2>&1; then
      log_fail "/api/status/$STATUS_SLUG/regions/maintenance" "200" "expected array"
      ERRORS=$((ERRORS + 1))
    else
      log_ok "/api/status/$STATUS_SLUG/regions/$sub" "200"
    fi
  done

  return $ERRORS
}

# =============================================================================
# Scenario: Static assets (local only)
# =============================================================================
# Verifies status-page static files when served locally.
# Prerequisites: python3 -m http.server 8765 in status-page dir
# =============================================================================
scenario_static_assets() {
  echo ""
  echo "--- Scenario: Static Assets ($STATUS_BASE) ---"
  reset_errors

  while IFS= read -r path; do
    [ -z "$path" ] && continue
    code=$(curl_req_simple "$STATUS_BASE$path")
    assert_ok "$path" "$code"
  done < <(get_static_paths)

  return $ERRORS
}

# =============================================================================
# Main
# =============================================================================

echo "=== Smoke Test ==="
echo ""

TOTAL_ERRORS=0

# Run API availability scenario
scenario_api_availability || TOTAL_ERRORS=$((TOTAL_ERRORS + ERRORS))

# Run data flow scenario (validates critical path)
scenario_data_flow || TOTAL_ERRORS=$((TOTAL_ERRORS + ERRORS))

# Run static assets scenario when in local mode
if [ "$MODE" = "local" ]; then
  scenario_static_assets || TOTAL_ERRORS=$((TOTAL_ERRORS + ERRORS))
fi

echo ""
if [ $TOTAL_ERRORS -eq 0 ]; then
  echo "=== All scenarios passed (no errors) ==="
  exit 0
else
  echo "=== $TOTAL_ERRORS request(s) failed ==="
  exit 1
fi
