#!/usr/bin/env bash
set -e

# Run from repo root (allow being run from scripts/ or root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Winnow first-time setup (run from: $ROOT_DIR)"
echo ""

# Prerequisites
echo "==> Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required."; exit 1; }
command -v psql >/dev/null 2>&1 || { echo "PostgreSQL (psql) is required for database setup. Install PostgreSQL >= 14."; exit 1; }
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
[ "$NODE_VERSION" -ge 18 ] 2>/dev/null || { echo "Node.js 18+ is required (found $(node -v))."; exit 1; }
echo "    Node $(node -v), npm $(npm -v)"
echo ""

# Install dependencies
echo "==> Installing dependencies..."
npm install
echo ""

# Environment file
if [ ! -f .env ]; then
  echo "==> Creating .env from .env.example..."
  cp .env.example .env
  echo "    Edit .env if you need to change DATABASE_URL or PORT."
else
  echo "==> .env already exists, skipping."
fi
echo ""

# Database: create default DB if DATABASE_URL points to localhost
echo "==> Creating database (if needed)..."
if [ -f .env ]; then
  if grep -q 'localhost.*winnow' .env 2>/dev/null || grep -q '5432/winnow' .env 2>/dev/null; then
    createdb winnow 2>/dev/null || true
  fi
else
  createdb winnow 2>/dev/null || true
fi
echo ""

# Prisma
echo "==> Generating Prisma client..."
npx prisma generate
echo "==> Running database migrations..."
if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  npx prisma migrate dev
else
  npx prisma migrate dev --name init
fi
echo ""

# Build
echo "==> Building all packages..."
npm run build
echo ""

echo "==> First-time setup complete."
echo ""
echo "Run the app:"
echo "  npm run dev"
echo ""
echo "Then open:"
echo "  API:  http://localhost:3000"
echo "  Web:  http://localhost:5173"
echo ""
