#!/bin/bash

set -e

echo "🧹 Cleaning up Firebase artifacts..."

# Firebase config files
files_to_remove=(
  "firebase.json"
  ".firebaserc"
  "firebase-debug.log"
  "src/lib/firebase/config.ts"
  "src/lib/firebase/client.ts"
  "src/lib/firebase/auth.ts"
  "src/lib/firebase/firestore.ts"
  "src/lib/ai/gemini.ts"
)

# Remove files
for file in "${files_to_remove[@]}"; do
  if [ -f "$file" ]; then
    echo "  Removing: $file"
    rm "$file"
  else
    echo "  Not found: $file"
  fi
done

# Removefirebase directory if empty
if [ -d "src/lib/firebase" ]; then
  echo "  Removing empty directory: src/lib/firebase"
  rmdir "src/lib/firebase" 2>/dev/null || true
fi

echo "✅ Firebase cleanup complete"