#!/usr/bin/env python3
"""Script to create the database specified in DATABASE_URL."""

import os
import re
import subprocess
import sys
from urllib.parse import urlparse

def load_env_file():
    """Load environment variables from .env file."""
    env_file = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_file):
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()

def extract_db_name(database_url):
    """Extract database name from DATABASE_URL."""
    # Parse the URL
    parsed = urlparse(database_url)
    db_name = parsed.path.lstrip('/')
    # Remove query parameters if any
    if '?' in db_name:
        db_name = db_name.split('?')[0]
    return db_name

def main():
    # Load .env file
    load_env_file()
    
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL is not set")
        print("Please set it in .env file or export it")
        sys.exit(1)
    
    db_name = extract_db_name(database_url)
    if not db_name:
        print("❌ Could not extract database name from DATABASE_URL")
        sys.exit(1)
    
    print(f"Creating database: {db_name}")
    
    # Extract user from DATABASE_URL
    parsed = urlparse(database_url)
    db_user = parsed.username or os.getenv("USER", "postgres")
    
    # Try to create the database
    try:
        # Check if database already exists
        result = subprocess.run(
            ["psql", "postgres", "-tAc", f"SELECT 1 FROM pg_database WHERE datname='{db_name}'"],
            capture_output=True,
            text=True
        )
        
        if result.stdout.strip() == "1":
            print(f"✅ Database '{db_name}' already exists")
            return
        
        # Create the database
        subprocess.run(
            ["psql", "postgres", "-c", f'CREATE DATABASE "{db_name}";'],
            check=True
        )
        print(f"✅ Database '{db_name}' created successfully")
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to create database: {e}")
        print("Make sure PostgreSQL is running and you have permissions.")
        sys.exit(1)
    except FileNotFoundError:
        print("❌ psql command not found. Make sure PostgreSQL is installed.")
        sys.exit(1)

if __name__ == "__main__":
    main()
