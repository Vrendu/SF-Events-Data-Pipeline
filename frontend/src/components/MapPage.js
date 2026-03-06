import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapPage.css';

// Set your Mapbox token here
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || '';

function MapPage({ events, onNavigate }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  const latestUpcomingEventsRef = useRef([]);
  const [mapError, setMapError] = useState(false);
  const [todayEvents, setTodayEvents] = useState([]);

  // Helper function to parse datetime strings in format "2026-05-15T20:00-0800"
  const parseEventDateTime = (dateTimeString) => {
    if (!dateTimeString) return null;

    // Handle date-only format as local date to avoid UTC timezone shift
    const dateOnlyMatch = dateTimeString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
    }

    // Handle "YYYY-MM-DD HH:mm" local datetime format
    const localDateTimeMatch = dateTimeString.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    if (localDateTimeMatch) {
      const [, year, month, day, hour, minute] = localDateTimeMatch;
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        0
      );
    }

    // Normalize timezone format: "-0800" -> "-08:00"
    const normalized = dateTimeString.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
    const date = new Date(normalized);
    return isNaN(date.getTime()) ? null : date;
  };

  useEffect(() => {
    const fetchTodayEvents = async () => {
      try {
        const now = new Date();
        const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const response = await fetch(`/api/events?on_date=${localDate}&limit=1000`);
        if (!response.ok) {
          throw new Error('Failed to fetch events for today');
        }
        const data = await response.json();
        setTodayEvents(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch today events:', error);
        setTodayEvents([]);
      }
    };

    fetchTodayEvents();
  }, []);

  // Filter events to show today's and upcoming events
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    // Start of today
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // End of today
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const sourceEvents = todayEvents.length > 0 ? todayEvents : events;

    const filtered = sourceEvents.filter((event) => {
      if (!event.datetime) {
        console.warn('Event missing datetime:', event);
        return false;
      }
      const eventDate = parseEventDateTime(event.datetime);
      if (!eventDate) {
        console.warn('Failed to parse datetime:', event.datetime);
        return false;
      }
      return eventDate >= startOfDay && eventDate < endOfDay;
    });

    console.log(`Found ${filtered.length} events for today`);
    console.log('Events with latlong:', filtered.filter(e => e.latlong).length);
    console.log('Events without latlong:', filtered.filter(e => !e.latlong).length);
    
    return filtered;
  }, [events, todayEvents]);

  useEffect(() => {
    latestUpcomingEventsRef.current = upcomingEvents;
  }, [upcomingEvents]);

  useEffect(() => {
    if (!mapboxgl.accessToken) {
      console.error('Mapbox token not found. Please set REACT_APP_MAPBOX_TOKEN in .env');
      setMapError(true);
      return;
    }

    if (map.current) return; // Initialize map only once

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-122.4194, 37.7749], // San Francisco coordinates
        zoom: 12,
      });

      map.current.on('load', () => {
        addEventMarkers(latestUpcomingEventsRef.current);
      });

      map.current.on('error', (error) => {
        console.error('Map error:', error);
        setMapError(true);
      });
    } catch (error) {
      console.error('Failed to initialize map:', error);
      setMapError(true);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update markers when events change
  useEffect(() => {
    if (!map.current) return;

    if (map.current.isStyleLoaded()) {
      addEventMarkers(upcomingEvents);
      return;
    }

    map.current.once('load', () => {
      addEventMarkers(latestUpcomingEventsRef.current);
    });
  }, [upcomingEvents]);

  const addEventMarkers = (eventsToRender = []) => {
    // Remove existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers for each event in the next 24 hours
    eventsToRender.forEach((event) => {
      if (event.latlong) {
        const [lat, lng] = event.latlong.split(',').map(coord => parseFloat(coord.trim()));
        
        if (!isNaN(lat) && !isNaN(lng)) {
          // Create popup
          const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="popup-content">
              <h3>${event.title || 'Untitled Event'}</h3>
              <p><strong>Date:</strong> ${event.datetime || 'Date TBA'}</p>
              <p><strong>Venue:</strong> ${event.venue || 'N/A'}</p>
              ${event.url ? `<a href="${event.url}" target="_blank" rel="noopener noreferrer" class="popup-link">View Details</a>` : ''}
            </div>`
          );

          // Create marker
          const marker = new mapboxgl.Marker({ color: '#667eea' })
            .setLngLat([lng, lat])
            .setPopup(popup)
            .addTo(map.current);

          markersRef.current.push(marker);
        }
      }
    });
  };

  return (
    <div className="map-page">
      <div className="map-header">
        <h1>🗺️ SF Events Map (Today)</h1>
        <button className="nav-button" onClick={() => onNavigate('list')}>
          📋 View List
        </button>
      </div>
      {mapError && (
        <div className="error-banner">
          <p>⚠️ Map failed to load. Please check that your Mapbox token is set in .env file.</p>
        </div>
      )}
      <div className="map-container" ref={mapContainer} />
      <div className="map-info">
        <p>{upcomingEvents.length} events happening today</p>
        {upcomingEvents.length > 0 && upcomingEvents.filter(e => !e.latlong).length > 0 && (
          <p style={{ fontSize: '0.9rem', color: '#999', marginTop: '0.5rem' }}>
            ({upcomingEvents.filter(e => e.latlong).length} have location data on map)
          </p>
        )}
      </div>
    </div>
  );
}

export default MapPage;
