# Events Scraper Backend

A FastAPI backend for scraping events data from websites and storing them in a PostgreSQL database.

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Up PostgreSQL Database

#### Option A: Automated Setup (Recommended)

**Using the Python setup script:**
```bash
cd backend
python3 setup_db.py
```

**Using the Bash setup script:**
```bash
cd backend
chmod +x setup_db.sh
./setup_db.sh
```

Both scripts will:
- Check if PostgreSQL is installed
- Verify PostgreSQL is running
- Create the database
- Help you set the `DATABASE_URL` environment variable

#### Option B: Manual Setup

**Install PostgreSQL (macOS):**

Using Homebrew (recommended):
```bash
brew install postgresql@15
brew services start postgresql@15
```

Or download from: https://www.postgresql.org/download/macosx/

**Create the database:**

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE events_db;

# Create user (optional, you can use your system user)
CREATE USER events_user WITH PASSWORD 'your_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE events_db TO events_user;

# Exit
\q
```

**Set the DATABASE_URL environment variable:**

**Option 1: Using .env file (recommended)**
```bash
cd backend
echo "DATABASE_URL=postgresql://username:password@localhost:5432/events_db" > .env
```

Replace `username`, `password`, and `events_db` with your actual values.

**Option 2: Export in your shell**
```bash
export DATABASE_URL="postgresql://username:password@localhost:5432/events_db"
```

**Option 3: Add to your shell profile** (for permanent setup)
```bash
# Add to ~/.zshrc or ~/.bash_profile
echo 'export DATABASE_URL="postgresql://username:password@localhost:5432/events_db"' >> ~/.zshrc
source ~/.zshrc
```

**Note:** If you don't have a password set for your PostgreSQL user, use:
```
postgresql://username@localhost:5432/events_db
```

### 3. Run the Server

```bash
cd backend
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

**Verify the setup:**
```bash
# Check health endpoint
curl http://localhost:8000/health
```

## API Endpoints

### POST `/scrape`
Scrape events from a URL and store them in the database.

**Request body:**
```json
{
  "url": "https://example.com/events",
  "source": "optional-source-name"
}
```

**Response:**
```json
{
  "events": [...],
  "total_found": 10,
  "inserted": 8,
  "duplicates_skipped": 2
}
```

### GET `/events`
List stored events.

**Query parameters:**
- `source` (optional): Filter events by source
- `limit` (optional, default: 100): Maximum number of events to return

**Example:**
```
GET /events?source=example.com&limit=50
```

### GET `/health`
Health check endpoint to verify database connectivity.

## Features

- Scrapes events from web pages using schema.org markup or generic event elements
- Stores events in PostgreSQL database
- Prevents duplicate entries (based on title, date, and source)
- Async/await for better performance
- Error handling and validation

## Database Schema

The `events` table has the following structure:
- `id` (SERIAL PRIMARY KEY)
- `title` (TEXT NOT NULL)
- `date` (TEXT)
- `location` (TEXT)
- `url` (TEXT)
- `description` (TEXT)
- `source` (TEXT)
