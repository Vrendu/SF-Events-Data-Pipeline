# PostgreSQL Setup Instructions

## Current Status
✅ PostgreSQL is **installed** (via Postgres.app)  
⚠️  PostgreSQL server is **not currently running**

## Quick Setup Steps

### 1. Start PostgreSQL

Since you're using Postgres.app, you can start it by:
- Opening the **Postgres.app** application from your Applications folder
- Or from the command line:
  ```bash
  open -a Postgres
  ```

Wait a few seconds for it to start, then verify:
```bash
pg_isready
```

You should see: `/tmp:5432 - accepting connections`

### 2. Create the Database

**Option A: Use the automated setup script (Easiest)**
```bash
cd backend
python3 setup_db.py
```

**Option B: Manual creation**
```bash
# Connect to PostgreSQL (Postgres.app usually uses your system username)
psql postgres

# Create the database
CREATE DATABASE events_db;

# Exit
\q
```

### 3. Set DATABASE_URL Environment Variable

**For Postgres.app, the default connection is usually:**
```bash
# If you don't have a password set:
export DATABASE_URL="postgresql://$(whoami)@localhost:5432/events_db"

# Or create a .env file:
cd backend
echo "DATABASE_URL=postgresql://$(whoami)@localhost:5432/events_db" > .env
```

**To find your PostgreSQL username:**
```bash
whoami
# This is usually your macOS username
```

### 4. Verify Setup

```bash
# Test database connection
psql events_db -c "SELECT version();"

# Or use the Python script to test
python3 -c "import os; from backend.main import init_db; import asyncio; asyncio.run(init_db())"
```

### 5. Run the Application

```bash
cd backend
uvicorn main:app --reload
```

## Common Issues

### "Connection refused" error
- Make sure Postgres.app is running (check your Applications or menu bar)
- Verify with: `pg_isready`

### "Database does not exist" error
- Run the setup script: `python3 setup_db.py`
- Or manually create: `psql postgres -c "CREATE DATABASE events_db;"`

### "Authentication failed" error
- Postgres.app typically doesn't require a password for local connections
- Try: `postgresql://$(whoami)@localhost:5432/events_db`
- If you set a password, include it: `postgresql://user:password@localhost:5432/events_db`

## Next Steps

Once PostgreSQL is running and DATABASE_URL is set:
1. Install dependencies: `pip install -r requirements.txt`
2. Start the server: `uvicorn main:app --reload`
3. Test the API: `curl http://localhost:8000/health`
