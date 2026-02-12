#!/bin/bash
# Smoke test for monitoring.cloudzy.com – all public endpoints
# Usage: ./smoke-test.sh [local]
#   local  - test static assets on localhost:8765 as well
#   (default) - API only on monitoring.cloudzy.com
#
# Env: X_IDENTIFIER (required)
#      API_BASE - override API host (e.g. http://localhost:3001 for local backend)

set -e
IDENTIFIER="${X_IDENTIFIER:?X_IDENTIFIER must be set and not exposed}"
MODE="${1:-}"
ERRORS=0

CURL_OPTS=(-sS -w "\n%{http_code}" -H "x-identifier: $IDENTIFIER" -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" -H "Accept: application/json, text/plain, */*")

curl_req() {
  curl "${CURL_OPTS[@]}" "$@"
}

echo "=== Smoke test monitoring.cloudzy.com (x-identifier: ***) ==="
echo ""

# Real API (production); override with API_BASE env for local testing
API_BASE="${API_BASE:-https://monitoring.cloudzy.com}"
BASE="http://localhost:8765"

# All public endpoints
ENDPOINTS=(
  "/health"
  "/robots.txt"
  "/sitemap.xml"
  "/api-docs"
  "/api-docs.json"
  "/api/status/uptime"
  "/api/status/uptime/incidents.json"
  "/api/status/uptime/incidents.rss"
  "/api/status/uptime/regions"
  "/api/status/uptime/regions/uptime"
  "/api/status/uptime/regions/latency"
  "/api/status/uptime/regions/incidents"
  "/api/status/uptime/regions/maintenance"
)

echo "--- All Endpoints ($API_BASE) ---"
for path in "${ENDPOINTS[@]}"; do
  out=$(curl_req "$API_BASE$path")
  code=$(echo "$out" | tail -n1)
  body=$(echo "$out" | sed '$d')
  # incidents.json/rss may return 404 when announcements disabled
  # /api-docs may redirect (302) then 200
  if [ "$code" = "200" ]; then
    echo "  OK $path -> $code"
  elif [ "$code" = "404" ] && [[ "$path" == *"incidents"* ]]; then
    echo "  OK $path -> $code (announcements disabled)"
  elif [ "$code" = "302" ] && [[ "$path" == "/api-docs" ]]; then
    echo "  OK $path -> $code (redirect)"
  else
    echo "  FAIL $path -> $code"
    echo "    Response: ${body:0:80}..."
    ERRORS=$((ERRORS + 1))
  fi
done

# Static assets (only when local)
if [ "$MODE" = "local" ]; then
  echo ""
  echo "--- Static Assets ($BASE) ---"
  for path in "/" "/offline.html" "/manifest.json" "/style.css" "/align-ui.css" "/globe.js" "/service-worker.js"; do
    code=$(curl -sS -o /dev/null -w "%{http_code}" -H "x-identifier: $IDENTIFIER" -H "User-Agent: Mozilla/5.0" "$BASE$path")
    if [ "$code" = "200" ]; then
      echo "  OK $path -> $code"
    else
      echo "  FAIL $path -> $code"
      ERRORS=$((ERRORS + 1))
    fi
  done
fi

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "=== All requests passed (no errors) ==="
  exit 0
else
  echo "=== $ERRORS request(s) failed ==="
  exit 1
fi
