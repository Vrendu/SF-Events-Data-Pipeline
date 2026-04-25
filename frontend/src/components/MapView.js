import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapView.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_API_KEY;

function MapView() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const fetchTodayEvents = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/events?on_date=${today}&limit=500`);
        if (!response.ok) throw new Error('Failed to fetch events');
        const data = await response.json();
        setEvents(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayEvents();
  }, [today]);

  // Initialize map once
  useEffect(() => {
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-122.4194, 37.7749], // San Francisco
      zoom: 12,
    });
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
  }, []);

  // Add markers when events load
  useEffect(() => {
    if (!map.current || loading) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const eventsWithCoords = events.filter((e) => e.latlong);

    eventsWithCoords.forEach((event) => {
      const [lat, lng] = event.latlong.split(',').map(Number);
      if (isNaN(lat) || isNaN(lng)) return;

      const formatDate = (dateString) => {
        if (!dateString) return 'Time TBA';
        const d = new Date(dateString);
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      };

      const popup = new mapboxgl.Popup({ offset: 25, maxWidth: '280px' }).setHTML(`
        <div class="map-popup">
          <h3 class="popup-title">${event.title || event.name || 'Untitled'}</h3>
          ${event.venue ? `<p class="popup-venue">📍 ${event.venue}</p>` : ''}
          ${event.datetime ? `<p class="popup-time">🕐 ${formatDate(event.datetime)}</p>` : ''}
          ${event.category ? `<span class="popup-category">${event.category}</span>` : ''}
          ${event.url ? `<a href="${event.url}" target="_blank" rel="noopener noreferrer" class="popup-link">View Details →</a>` : ''}
        </div>
      `);

      const el = document.createElement('div');
      el.className = 'map-marker';

      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current);

      markersRef.current.push(marker);
    });

  }, [events, loading]);

  const mappableCount = events.filter((e) => e.latlong).length;

  return (
    <div className="map-view">
      {loading && <div className="map-overlay-message">Loading today's events...</div>}
      {error && <div className="map-overlay-message map-error">Error: {error}</div>}
      {!loading && !error && (
        <div className="map-stats">
          {events.length} events today &nbsp;·&nbsp; {mappableCount} on map
        </div>
      )}
      <div ref={mapContainer} className="map-container" />
    </div>
  );
}

export default MapView;
