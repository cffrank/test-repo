#!/bin/bash

echo "=========================================="
echo "FinOps MVP - Setup Script"
echo "=========================================="

echo ""
echo "Step 1: Installing new dependencies..."
npm install @neondatabase/auth @neondatabase/serverless drizzle-orm drizzle-kit arctic dotenv

echo ""
echo "Step 2: Removing Firebase dependencies..."
npm uninstall firebase @google-cloud/vertexai firebase-tools

echo ""
echo "Step 3: Creating .env file..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✓ .env file created from .env.example"
else
  echo "✓ .env file already exists"
fi

echo ""
echo "=========================================="
echo "Setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Edit .env and add your NEON_AUTH_BASE_URL from Neon Console"
echo "2. Run: ./scripts/migrate.sh"
echo ""
echo "To get NEON_AUTH_BASE_URL:"
echo "- Go to Neon Console -> Your Project -> Branch -> Auth -> Configuration"