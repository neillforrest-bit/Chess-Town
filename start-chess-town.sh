#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$ROOT_DIR/dojo-app"

cd "$APP_DIR"

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install --no-audit --no-fund
fi

echo "Clearing stale preview processes on port 3000..."
pkill -f "next dev -p 3000" >/dev/null 2>&1 || true

printf "\nStarting Chess Town preview...\n"
printf "Open: http://localhost:3000\n\n"

PORT=3000 HOSTNAME=0.0.0.0 npm run dev
