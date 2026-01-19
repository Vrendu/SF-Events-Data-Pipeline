#!/usr/bin/env python3
"""Python script to set up PostgreSQL database for the events scraper."""

import os
import subprocess
import sys
from getpass import getpass

def check_postgresql_installed():
    """Check if PostgreSQL is installed."""
    try:
        subprocess.run(["psql", "--version"], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def check_postgresql_running():
    """Check if PostgreSQL server is running."""
    try:
        subprocess.run(["pg_isready"], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def create_database(db_name, db_user, db_password=None):
    """Create the database if it doesn't exist."""
    env = os.environ.copy()
    if db_password:
        env["PGPASSWORD"] = db_password
    
    # Check if database exists
    check_cmd = [
        "psql", "-U", db_user, "-d", "postgres",
        "-tc", f"SELECT 1 FROM pg_database WHERE datname = '{db_name}'"
    ]
    
    result = subprocess.run(check_cmd, capture_output=True, text=True, env=env)
    exists = result.stdout.strip() == "1"
    
    if exists:
        print(f"⚠️  Database '{db_name}' already exists.")
        recreate = input("Do you want to drop and recreate it? (y/N): ").strip().lower()
        if recreate == 'y':
            subprocess.run(
                ["psql", "-U", db_user, "-d", "postgres", "-c", f"DROP DATABASE IF EXISTS {db_name};"],
                check=True, env=env
            )
            subprocess.run(
                ["psql", "-U", db_user, "-d", "postgres", "-c", f"CREATE DATABASE {db_name};"],
                check=True, env=env
            )
            print(f"✅ Database '{db_name}' recreated")
        else:
            print(f"✅ Using existing database '{db_name}'")
    else:
        subprocess.run(
            ["psql", "-U", db_user, "-d", "postgres", "-c", f"CREATE DATABASE {db_name};"],
            check=True, env=env
        )
        print(f"✅ Database '{db_name}' created")

def main():
    print("🚀 PostgreSQL Database Setup")
    print("=" * 30)
    print()
    
    # Check PostgreSQL installation
    if not check_postgresql_installed():
        print("❌ PostgreSQL is not installed.")
        print()
        print("To install PostgreSQL on macOS:")
        print("  1. Using Homebrew: brew install postgresql@15")
        print("  2. Start the service: brew services start postgresql@15")
        print()
        print("Or download from: https://www.postgresql.org/download/macosx/")
        sys.exit(1)
    
    print("✅ PostgreSQL is installed")
    print()
    
    # Check if PostgreSQL is running
    if not check_postgresql_running():
        print("⚠️  PostgreSQL server is not running.")
        print()
        print("To start PostgreSQL:")
        print("  brew services start postgresql@15")
        print("  # or")
        print("  pg_ctl -D /usr/local/var/postgresql@15 start")
        print()
        sys.exit(1)
    
    print("✅ PostgreSQL server is running")
    print()
    
    # Get database configuration
    db_name = input("Enter database name (default: events_db): ").strip() or "events_db"
    db_user = input(f"Enter PostgreSQL username (default: {os.getenv('USER', 'postgres')}): ").strip() or os.getenv('USER', 'postgres')
    db_password = getpass("Enter PostgreSQL password (press Enter if no password): ").strip() or None
    
    print()
    print("Creating database...")
    create_database(db_name, db_user, db_password)
    
    # Build DATABASE_URL
    if db_password:
        database_url = f"postgresql://{db_user}:{db_password}@localhost:5432/{db_name}"
    else:
        database_url = f"postgresql://{db_user}@localhost:5432/{db_name}"
    
    print()
    print("✅ Database setup complete!")
    print()
    print("📝 Add this to your .env file or export it:")
    print(f"   DATABASE_URL={database_url}")
    print()
    print("Or run:")
    print(f'   export DATABASE_URL="{database_url}"')
    print()
    
    # Try to create/update .env file
    env_file = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_file):
        update = input(f"Update existing .env file? (y/N): ").strip().lower()
        if update == 'y':
            with open(env_file, 'w') as f:
                f.write(f"DATABASE_URL={database_url}\n")
            print(f"✅ Updated {env_file}")
    else:
        create = input("Create .env file? (Y/n): ").strip().lower()
        if create != 'n':
            with open(env_file, 'w') as f:
                f.write(f"DATABASE_URL={database_url}\n")
            print(f"✅ Created {env_file}")

if __name__ == "__main__":
    main()
