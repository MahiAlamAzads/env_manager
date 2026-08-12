#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is required (>=20.19.0)." >&2
  exit 1
fi

NODE_VERSION="$(node -p 'process.versions.node')"
node -e 'const [a,b]=process.versions.node.split(".").map(Number); if (a < 20 || (a === 20 && b < 19)) process.exit(1)' || {
  echo "ERROR: Node.js >=20.19.0 is required. Found: $NODE_VERSION" >&2
  exit 1
}

if [[ ! -f .env && ! -f .env.local ]]; then
  cp .env.example .env
  echo "Created .env from .env.example. Edit DATABASE_URL and vault secrets before running the app."
fi

if [[ -d node_modules/.pnpm || -f pnpm-lock.yaml ]]; then
  echo "Detected a pnpm dependency tree. Cleaning it to use npm consistently..."
  rm -rf node_modules
  rm -f pnpm-lock.yaml
fi

npm install
npm run db:generate
npm run db:migrate
npm run typecheck
npm run build

echo
printf '%s\n' "Setup/build verification completed."
printf '%s\n' "If vault secrets are not configured yet, run: npm run vault:secrets"
printf '%s\n' "Then put the generated values in .env and start with: npm run dev"
