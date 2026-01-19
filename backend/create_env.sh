#!/bin/bash

# Script to create .env file with DATABASE_URL

USERNAME=$(whoami)
DB_NAME="events_db"

echo "Creating .env file..."
echo "DATABASE_URL=postgresql://${USERNAME}@localhost:5432/${DB_NAME}" > .env

echo "✅ Created .env file with:"
echo "   DATABASE_URL=postgresql://${USERNAME}@localhost:5432/${DB_NAME}"
echo ""
echo "⚠️  Make sure:"
echo "   1. PostgreSQL is running (open Postgres.app or run: open -a Postgres)"
echo "   2. Database '${DB_NAME}' exists (run: psql postgres -c 'CREATE DATABASE ${DB_NAME};')"
echo ""
