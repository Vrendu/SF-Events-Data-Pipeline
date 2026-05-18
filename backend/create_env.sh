#!/bin/bash

# Script to create .env file with DATABASE_URL

USERNAME=$(whoami)
DB_NAME="events_db"

echo "Creating .env file..."
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
{
  echo "DATABASE_URL=postgresql://${USERNAME}@localhost:5432/${DB_NAME}"
  echo "AUTH_JWT_SECRET=${JWT_SECRET}"
} > .env

echo "✅ Created .env file with:"
echo "   DATABASE_URL=postgresql://${USERNAME}@localhost:5432/${DB_NAME}"
echo "   AUTH_JWT_SECRET=(random 32-byte hex — keep secret)"
echo ""
echo "⚠️  Make sure:"
echo "   1. PostgreSQL is running (open Postgres.app or run: open -a Postgres)"
echo "   2. Database '${DB_NAME}' exists (run: psql postgres -c 'CREATE DATABASE ${DB_NAME};')"
echo ""
