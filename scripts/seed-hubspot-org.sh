#!/bin/bash
# Usage: ./scripts/seed-hubspot-org.sh <access-token> [portal-id]
# Seeds the org record with a HubSpot PAT so sync works without OAuth flow.
# portal-id defaults to 148052909 (winnow-alt dev portal).

set -euo pipefail

TOKEN="${1:-}"
PORTAL_ID="${2:-148052909}"

if [[ -z "$TOKEN" ]]; then
  echo "Usage: $0 <hubspot-access-token> [portal-id]"
  echo ""
  echo "Portal IDs:"
  echo "  148052909  winnow-alt (dev portal, default)"
  echo "  148052285  winnow     (standard install, PAT: pat-eu1-2c0bfa21-...)"
  exit 1
fi
DATABASE_URL="${DATABASE_URL:-postgresql://interviews:secret@localhost:5432/winnow}"

echo "→ Updating org record for portal $PORTAL_ID..."

psql "$DATABASE_URL" -c "
UPDATE \"Organization\"
SET
  \"hubspotPortalId\"       = '$PORTAL_ID',
  \"hubspotAccessToken\"    = '$TOKEN',
  \"hubspotRefreshToken\"   = 'not-used-static',
  \"hubspotTokenExpiresAt\" = '2099-01-01 00:00:00',
  \"crmConnectedAt\"        = now()
WHERE id = (
  SELECT id FROM \"Organization\" WHERE \"crmType\" = 'hubspot' LIMIT 1
);
"

echo "→ Running sync..."
curl -sf -X POST http://localhost:3000/api/hubspot/sync | jq .

echo ""
echo "✓ Done. Open a deal in HubSpot portal $PORTAL_ID to test the CRM card."
echo "  If you want validation results to show, also run:"
echo "  curl -X POST http://localhost:3000/api/validation/run"
