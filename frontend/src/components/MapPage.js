import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapPage.css';

// Set your Mapbox token here
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || '';

function MapPage({ events, onNavigate }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapboxgl.accessToken) {
      console.error('Mapbox token not found. Please set REACT_APP_MAPBOX_TOKEN in .env');
      return;
    }

    if (map.current) return; // Initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-122.4194, 37.7749], // San Francisco coordinates
      zoom: 12,
    });

    map.current.on('load', () => {
      addEventMarkers();
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update markers when events change
  useEffect(() => {
    if (map.current && map.current.isStyleLoaded()) {
      addEventMarkers();
    }
  }, [events]);

  const addEventMarkers = () => {
    // Remove existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers for each event
    events.forEach((event) => {
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
        <h1>🗺️ SF Events Map</h1>
        <button className="nav-button" onClick={() => onNavigate('list')}>
          📋 View List
        </button>
      </div>
      <div className="map-container" ref={mapContainer} />
      <div className="map-info">
        <p>{events.length} events displayed on map</p>
      </div>
    </div>
  );
}

export default MapPage;
