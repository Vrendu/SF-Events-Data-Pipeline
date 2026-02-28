import React from 'react';
import './EventList.css';
import EventCard from './EventCard';

function EventList({ events }) {
  if (events.length === 0) {
    return (
      <div className="no-events">
        <p>No events found</p>
      </div>
    );
  }

  return (
    <div className="event-list">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

export default EventList;
