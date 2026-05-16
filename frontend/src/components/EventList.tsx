import type { Event } from '../types/event'
import { EventCard } from './EventCard'

interface EventListProps {
  events: Event[]
  favorites: Set<number>
  selectedEventId?: number | null
  onToggleFavorite: (id: number) => void
  onSelectEvent?: (id: number) => void
  /** When false, list does not scroll (collapsed sheet preview) */
  scrollable?: boolean
  /** Show at most this many events (e.g. 2 in collapsed preview) */
  maxItems?: number
  compact?: boolean
}

export function EventList({
  events,
  favorites,
  selectedEventId,
  onToggleFavorite,
  onSelectEvent,
  scrollable = true,
  maxItems,
  compact,
}: EventListProps) {
  const visible = maxItems != null ? events.slice(0, maxItems) : events

  if (events.length === 0) {
    return <p className="empty">No events match your filters.</p>
  }

  return (
    <div className={`event-list ${scrollable ? 'event-list--scrollable' : 'event-list--static'}`}>
      {visible.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          liked={favorites.has(event.id)}
          selected={selectedEventId === event.id}
          compact={compact}
          onToggleFavorite={onToggleFavorite}
          onSelect={onSelectEvent}
        />
      ))}
    </div>
  )
}
