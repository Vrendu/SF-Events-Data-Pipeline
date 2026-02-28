import React, { useState, useEffect } from 'react';
import './EventListPage.css';
import EventList from './EventList';

function EventListPage({ onNavigate }) {
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
    <div className="event-list-page">
      <header className="header">
        <div className="header-content">
          <h1>🎉 SF Events</h1>
          <p>Discover amazing events happening in San Francisco</p>
        </div>
        <button className="nav-button" onClick={() => onNavigate('map')}>
          🗺️ View Map
        </button>
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

export default EventListPage;
