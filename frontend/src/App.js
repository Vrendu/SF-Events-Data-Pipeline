import React, { useState, useEffect } from 'react';
import './App.css';
import EventList from './components/EventList';

function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/events');
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }
        const data = await response.json();
        setEvents(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>SF Events</h1>
        <p>Discover amazing events happening in San Francisco</p>
      </header>

      <main className="main">
        {loading && <div className="loading">Loading events...</div>}
        {error && <div className="error">Error: {error}</div>}
        {!loading && !error && (
          <>
            <div className="event-count">Found {events.length} events</div>
            <EventList events={events} />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
