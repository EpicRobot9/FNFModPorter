#!/usr/bin/env bash
set -euo pipefail
if ! command -v node >/dev/null; then
  echo "Node.js 18+ is required. Install Node LTS then rerun."; exit 1
fi
if ! command -v git >/dev/null; then
  echo "Git is required. Install git then rerun."; exit 1
fi
npm install
npm run build
echo "Install complete. Use: npx fnf-porter port <inputs...> --dry-run"
