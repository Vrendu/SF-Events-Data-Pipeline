# API Usage Guide

Your events scraper API is now running! Here's how to use it.

## 🌐 API Base URL
```
http://localhost:8000
```

## 📚 Interactive API Documentation

FastAPI automatically generates interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

Open these in your browser to explore and test the API interactively!

## 🔍 Available Endpoints

### 1. Health Check
Check if the server and database are working:

```bash
curl http://localhost:8000/health
```

**Response:**
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### 2. Scrape Events from a URL
Scrape events from a website and store them in the database:

```bash
curl -X POST "http://localhost:8000/scrape" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/events",
    "source": "Example Events"
  }'
```

**Response:**
```json
{
  "events": [
    {
      "title": "Event Name",
      "date": "2024-01-15",
      "location": "San Francisco, CA",
      "url": "https://example.com/events",
      "description": "Event description",
      "source": "Example Events"
    }
  ],
  "total_found": 10,
  "inserted": 8,
  "duplicates_skipped": 2
}
```

**Note:** The scraper looks for:
- Schema.org Event markup (`itemtype="http://schema.org/Event"`)
- Generic HTML elements with event-related classes

### 3. List Stored Events
Get all stored events:

```bash
curl http://localhost:8000/events
```

**With filters:**
```bash
# Filter by source
curl "http://localhost:8000/events?source=Example%20Events"

# Limit results
curl "http://localhost:8000/events?limit=50"

# Both
curl "http://localhost:8000/events?source=Example%20Events&limit=50"
```

**Response:**
```json
[
  {
    "id": 1,
    "title": "Event Name",
    "date": "2024-01-15",
    "location": "San Francisco, CA",
    "url": "https://example.com/events",
    "description": "Event description",
    "source": "Example Events"
  }
]
```

## 🧪 Testing Examples

### Test with Python
```python
import requests

# Health check
response = requests.get("http://localhost:8000/health")
print(response.json())

# Scrape events
response = requests.post(
    "http://localhost:8000/scrape",
    json={
        "url": "https://example.com/events",
        "source": "Example"
    }
)
print(response.json())

# List events
response = requests.get("http://localhost:8000/events")
print(response.json())
```

### Test with JavaScript/Node.js
```javascript
// Health check
fetch('http://localhost:8000/health')
  .then(res => res.json())
  .then(data => console.log(data));

// Scrape events
fetch('http://localhost:8000/scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com/events',
    source: 'Example'
  })
})
  .then(res => res.json())
  .then(data => console.log(data));

// List events
fetch('http://localhost:8000/events')
  .then(res => res.json())
  .then(data => console.log(data));
```

## 📝 Example Workflow

1. **Check server health:**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Scrape events from a website:**
   ```bash
   curl -X POST "http://localhost:8000/scrape" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com/events", "source": "Example"}'
   ```

3. **View stored events:**
   ```bash
   curl http://localhost:8000/events
   ```

4. **Filter events by source:**
   ```bash
   curl "http://localhost:8000/events?source=Example"
   ```

## 🎯 Tips

- Use the interactive docs at `/docs` to test endpoints easily
- The scraper automatically prevents duplicate entries
- Events are stored with their source for easy filtering
- The API returns helpful error messages if something goes wrong

## 🚀 Next Steps

- Try scraping events from real event websites
- Build a frontend to display the events
- Add more scraping sources
- Customize the event parsing logic for specific websites
