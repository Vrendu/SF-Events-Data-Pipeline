# SF Events App Frontend

A simple React app to view and browse SF events.

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

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

- View all available events
- Event details including date, location, and price
- Responsive design for mobile and desktop
- Real-time data fetching from the backend API

## Architecture

- **App.js** - Main application component that fetches and manages events
- **EventList.js** - Displays a grid of events
- **EventCard.js** - Individual event card component with details

## API Integration

The frontend communicates with the backend API at `/api/events` endpoint. Make sure your backend is running and serves the correct API endpoint.
