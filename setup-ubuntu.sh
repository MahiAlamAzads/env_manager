#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
  if [[ -f .env.local ]]; then
    cp .env.local .env
    echo "Created .env from the existing .env.local for Prisma CLI compatibility."
  else
    cp .env.example .env
    echo "Created .env. Update DATABASE_URL before continuing if you are not using the included Docker PostgreSQL."
  fi
fi

docker compose up -d
npm install
npm run db:generate
npm run db:migrate

echo
echo "Setup complete. Optional sample data: npm run db:seed"
echo "Start the app with: npm run dev"
