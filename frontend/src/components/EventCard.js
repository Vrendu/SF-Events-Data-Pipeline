import React from 'react';
import './EventCard.css';

function EventCard({ event }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'Date TBA';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="event-card">
      <div className="event-header">
        <h3 className="event-title">{event.name || event.title || 'Untitled Event'}</h3>
        {event.category && <span className="event-category">{event.category}</span>}
      </div>

      {event.description && (
        <p className="event-description">
          {event.description.substring(0, 150)}
          {event.description.length > 150 ? '...' : ''}
        </p>
      )}

      <div className="event-details">
        {event.date && (
          <div className="detail-item">
            <span className="detail-label">📅</span>
            <span className="detail-text">{formatDate(event.date)}</span>
          </div>
        )}

        {event.location && (
          <div className="detail-item">
            <span className="detail-label">📍</span>
            <span className="detail-text">{event.location}</span>
          </div>
        )}

        {event.price && (
          <div className="detail-item">
            <span className="detail-label">💰</span>
            <span className="detail-text">${event.price}</span>
          </div>
        )}

        {event.url && (
          <div className="detail-item">
            <a href={event.url} target="_blank" rel="noopener noreferrer" className="event-link">
              View Details →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default EventCard;
