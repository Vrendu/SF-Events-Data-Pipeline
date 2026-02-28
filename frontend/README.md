# SF Events App Frontend

A React app to view and browse SF events with an interactive map and list view.

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Mapbox account with API token

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the frontend directory and add your Mapbox token:
```bash
cp .env.example .env
# Then edit .env and add your Mapbox token
REACT_APP_MAPBOX_TOKEN=your_mapbox_token_here
```

Get your Mapbox token from: https://account.mapbox.com/tokens/

### Running the App

Make sure your backend API is running on `http://localhost:8000`.

Start the development server:
```bash
npm start
```

The app will open in your browser at `http://localhost:3000`.

### Building for Production

```bash
npm run build
```

## Features

- **Interactive Map View** (Default): See all events pinned on a San Francisco map
- **List View**: Browse events in a grid format with details
- **Event Details**: View date, location, venue, and links for each event
- **Responsive Design**: Works on mobile and desktop
- **Real-time Data**: Fetches events from the backend API

## Architecture

### Components
- **MapPage.js** - Interactive Mapbox map with event pins and popups (default page)
- **EventListPage.js** - Grid view of events with navigation
- **EventList.js** - Displays a grid of events
- **EventCard.js** - Individual event card component with details

### Pages
- `/map` - Interactive map view of events (default landing page)
- `/list` - Grid list view of events

## API Integration

The frontend communicates with the backend API at `/api/events` endpoint. 

**Required fields for map display:**
- `title` - Event name
- `datetime` - Event date/time
- `venue` - Venue name
- `latlong` - Coordinates in format "latitude,longitude"
- `url` - Link to event details (optional)

## Environment Variables

- `REACT_APP_MAPBOX_TOKEN` - Your Mapbox API token (required for map functionality)
