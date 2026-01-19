#!/bin/bash

# Script to create the database specified in DATABASE_URL

# Load .env file if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Extract database name from DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set"
    echo "Please set it in .env file or export it"
    exit 1
fi

# Extract database name from DATABASE_URL
# Format: postgresql://user:pass@host:port/dbname
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

if [ -z "$DB_NAME" ]; then
    echo "❌ Could not extract database name from DATABASE_URL"
    exit 1
fi

echo "Creating database: $DB_NAME"

# Extract user from DATABASE_URL
DB_USER=$(echo $DATABASE_URL | sed -n 's/postgresql:\/\/\([^:]*\).*/\1/p')

# Try to create the database
psql postgres -c "CREATE DATABASE \"$DB_NAME\";" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Database '$DB_NAME' created successfully"
else
    # Check if it already exists
    EXISTS=$(psql postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")
    if [ "$EXISTS" = "1" ]; then
        echo "✅ Database '$DB_NAME' already exists"
    else
        echo "❌ Failed to create database. Make sure PostgreSQL is running and you have permissions."
        exit 1
    fi
fi
