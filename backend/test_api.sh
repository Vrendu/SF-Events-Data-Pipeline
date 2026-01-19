#!/bin/bash

# Quick test script for the Events API

BASE_URL="http://localhost:8000"

echo "🧪 Testing Events Scraper API"
echo "=============================="
echo ""

# Test 1: Health Check
echo "1️⃣  Testing health endpoint..."
curl -s "$BASE_URL/health" | python3 -m json.tool
echo ""
echo ""

# Test 2: List events (should be empty initially)
echo "2️⃣  Listing stored events..."
curl -s "$BASE_URL/events" | python3 -m json.tool
echo ""
echo ""

# Test 3: Scrape example (this will fail if URL doesn't have events)
echo "3️⃣  Testing scrape endpoint..."
echo "   (This will only work if the URL contains event data)"
echo ""
echo "To test scraping, run:"
echo '  curl -X POST "'$BASE_URL'/scrape" \'
echo '    -H "Content-Type: application/json" \'
echo '    -d '"'"'{"url": "https://example.com/events", "source": "Test"}'"'"
echo ""
