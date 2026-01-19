#!/bin/bash

# PostgreSQL Database Setup Script
# This script helps set up PostgreSQL and create the events database

set -e

echo "🚀 PostgreSQL Database Setup"
echo "=============================="
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed."
    echo ""
    echo "To install PostgreSQL on macOS:"
    echo "  1. Using Homebrew: brew install postgresql@15"
    echo "  2. Start the service: brew services start postgresql@15"
    echo ""
    echo "Or download from: https://www.postgresql.org/download/macosx/"
    exit 1
fi

echo "✅ PostgreSQL is installed"
echo ""

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "⚠️  PostgreSQL server is not running."
    echo ""
    echo "To start PostgreSQL:"
    echo "  brew services start postgresql@15"
    echo "  # or"
    echo "  pg_ctl -D /usr/local/var/postgresql@15 start"
    echo ""
    exit 1
fi

echo "✅ PostgreSQL server is running"
echo ""

# Get database name, user, and password
read -p "Enter database name (default: events_db): " DB_NAME
DB_NAME=${DB_NAME:-events_db}

read -p "Enter PostgreSQL username (default: $(whoami)): " DB_USER
DB_USER=${DB_USER:-$(whoami)}

read -sp "Enter PostgreSQL password (press Enter if no password): " DB_PASSWORD
echo ""

# Create database
echo ""
echo "Creating database '$DB_NAME'..."
if psql -U "$DB_USER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1; then
    echo "⚠️  Database '$DB_NAME' already exists."
    read -p "Do you want to drop and recreate it? (y/N): " RECREATE
    if [[ $RECREATE =~ ^[Yy]$ ]]; then
        psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
        psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"
        echo "✅ Database '$DB_NAME' recreated"
    else
        echo "✅ Using existing database '$DB_NAME'"
    fi
else
    psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"
    echo "✅ Database '$DB_NAME' created"
fi

# Build DATABASE_URL
if [ -z "$DB_PASSWORD" ]; then
    DATABASE_URL="postgresql://$DB_USER@localhost:5432/$DB_NAME"
else
    DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
fi

echo ""
echo "✅ Database setup complete!"
echo ""
echo "📝 Add this to your .env file or export it:"
echo "   DATABASE_URL=$DATABASE_URL"
echo ""
echo "Or run:"
echo "   export DATABASE_URL=\"$DATABASE_URL\""
echo ""
