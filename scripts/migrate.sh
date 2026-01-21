#!/bin/bash

echo "=========================================="
echo "FinOps MVP - Database Migration Script"
echo "=========================================="

echo ""
echo "Step 1: Generating migrations..."
npx drizzle-kit generate

if [ $? -eq 0 ]; then
  echo "✓ Migrations generated successfully"
else
  echo "✗ Migration generation failed"
  exit 1
fi

echo ""
echo "Step 2: Applying migrations to Neon..."
npx drizzle-kit migrate

if [ $? -eq 0 ]; then
  echo "✓ Migrations applied successfully"
else
  echo "✗ Migration application failed"
  exit 1
fi

echo ""
echo "=========================================="
echo "Migration complete!"
echo "=========================================="
echo ""
echo "You can now start the dev server with:"
echo "  npm run dev"