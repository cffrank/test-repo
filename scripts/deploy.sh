#!/bin/bash

set -e

# Check if git repo
if [ ! -d .git ]; then
  echo "❌ Not a git repository"
  exit 1
fi

# Get current branch name
CURRENT_BRANCH=$(git branch --show-current)
echo "📤 Deploying branch: $CURRENT_BRANCH"

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  You have uncommitted changes"
  read -p "Commit them before deploying? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Committing changes..."
    git add .
    read -p "Enter commit message: " message
    git commit -m "$message"
  fi
fi

# Push to remote
echo "📡 Pushing to remote..."
git push origin "$CURRENT_BRANCH"

echo "✅ Code pushed to remote"
echo ""
echo "📋 Cloudflare Pages deployment:"
echo "  - Go to Cloudflare Dashboard → Pages"
echo "  - Select your project"
echo "  - Deployments will auto-trigger on git push"
echo "  - Or use: npx wrangler pages deploy ./dist --project-name=finops-saas-mvp"