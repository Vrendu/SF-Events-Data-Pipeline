import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import './App.css';
import EventList from './components/EventList';
import MapView from './components/MapView';

function ListPage() {
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
    <>
      {loading && <div className="loading">Loading events...</div>}
      {error && <div className="error">Error: {error}</div>}
      {!loading && !error && (
        <>
          <div className="event-count">Found {events.length} events</div>
          <EventList events={events} />
        </>
      )}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <h1>SF Events</h1>
          <p>Discover amazing events happening in San Francisco</p>
          <nav className="nav">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              List
            </NavLink>
            <NavLink to="/map" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Map
            </NavLink>
          </nav>
        </header>

        <main className="main">
          <Routes>
            <Route path="/" element={<ListPage />} />
            <Route path="/map" element={<MapView />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
