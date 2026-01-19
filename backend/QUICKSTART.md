# Quick Start Guide

## Fastest Way to Get Started

### Step 1: Install PostgreSQL (if not already installed)

```bash
# Check if PostgreSQL is installed
psql --version

# If not installed, install via Homebrew:
brew install postgresql@15
brew services start postgresql@15
```

### Step 2: Run the Setup Script

```bash
cd backend
python3 setup_db.py
```

This will:
- ✅ Check PostgreSQL installation
- ✅ Create the database
- ✅ Generate your DATABASE_URL
- ✅ Optionally create a .env file

### Step 3: Install Python Dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Start the Server

```bash
uvicorn main:app --reload
```

### Step 5: Test It

```bash
# Health check
curl http://localhost:8000/health

# View API docs
open http://localhost:8000/docs
```

## Troubleshooting

### PostgreSQL not running?
```bash
brew services start postgresql@15
# or
pg_ctl -D /usr/local/var/postgresql@15 start
```

### Connection errors?
- Make sure PostgreSQL is running: `pg_isready`
- Check your DATABASE_URL format: `postgresql://user:pass@localhost:5432/dbname`
- Verify database exists: `psql -l`

### Permission denied?
- Make sure your user has access to PostgreSQL
- Try using `postgres` as the username: `postgresql://postgres@localhost:5432/events_db`
