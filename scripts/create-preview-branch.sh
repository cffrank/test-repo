#!/bin/bash

set -e

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ .env file not found"
  exit 1
fi

# Source .env to get DATABASE_URL
source .env

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not found in .env"
  exit 1
fi

# Get branch name from script argument or use timestamp
BRANCH_NAME="${1:-preview-$(date +%s)}"
PR_ID="${2:-}"

echo "🔀 Creating Neon branch: $BRANCH_NAME"

# Create branch using Neon API
BRANCH_ID=$(curl -s -X POST \
  "https://console.neon.tech/api/v2/projects/neondb/branches" \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "branch": {
      "name": "'$BRANCH_NAME'",
      "parent_id": "br-evergreen-forest-1234567890"
    }
  }' | jq -r '.branch.id')

if [ -z "$BRANCH_ID" ]; then
  echo "❌ Failed to create branch"
  exit 1
fi

echo "  Branch ID: $BRANCH_ID"

# Get branch connection string
BRANCH_CONNECTION_STRING=$(curl -s \
  "https://console.neon.tech/api/v2/projects/neondb/branches/$BRANCH_ID/connection-uris" \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -H "Content-Type: application/json" | jq -r '.uris[0]')

echo "  Connection string: $BRANCH_CONNECTION_STRING"

# Update .env.cloudflare with preview URL
echo "DATABASE_URL=\"$BRANCH_CONNECTION_STRING\"" > .env.cloudflare.preview
echo "BRANCH_NAME=\"$BRANCH_NAME\"" >> .env.cloudflare.preview

echo "✅ Branch created: $BRANCH_NAME"
echo ""
echo "📋 Next steps:"
echo "  1. Deploy preview to Cloudflare Pages"
echo "  2. Use .env.cloudflare.preview for environment variables"