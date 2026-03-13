import React, { useState, useEffect } from 'react';
import './App.css';
import MapPage from './components/MapPage';

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
      {loading && <div style={{ padding: '1rem' }}>Loading events...</div>}
      {error && <div style={{ padding: '1rem' }}>Error: {error}</div>}
      {!loading && !error && <MapPage events={events} />}
    </div>
  );
}

export default App;
