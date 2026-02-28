import React, { useState, useEffect } from 'react';
import './App.css';
import MapPage from './components/MapPage';
import EventListPage from './components/EventListPage';

function App() {
  const [currentPage, setCurrentPage] = useState('map'); // 'map' or 'list'
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

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="app">
      {currentPage === 'map' ? (
        <MapPage events={events} onNavigate={handleNavigate} />
      ) : (
        <EventListPage onNavigate={handleNavigate} />
      )}
    </div>
  );
}

export default App;
