import { Heart } from 'lucide-react'
import type { Event } from '../types/event'
import { formatEventDate, formatEventTime } from '../utils/dates'

interface EventCardProps {
  event: Event
  liked: boolean
  selected?: boolean
  compact?: boolean
  onToggleFavorite: (id: number) => void
  onSelect?: (id: number) => void
}

export function EventCard({
  event,
  liked,
  selected,
  compact,
  onToggleFavorite,
  onSelect,
}: EventCardProps) {
  const location = event.venue || event.location || 'Location TBA'

  return (
    <article
      className={`event-card ${selected ? 'is-selected' : ''} ${compact ? 'event-card--compact' : ''}`}
      onClick={onSelect ? () => onSelect(event.id) : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(event.id)
              }
            }
          : undefined
      }
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className="event-card-thumb" aria-hidden />
      <div className="event-card-body">
        <h3 className="event-card-title">{event.title}</h3>
        {compact ? (
          <p className="event-card-meta event-card-meta--inline">
            {formatEventDate(event.datetime)}
            {event.datetime ? ` · ${formatEventTime(event.datetime)}` : ''}
          </p>
        ) : (
          <>
            <p className="event-card-meta">{formatEventDate(event.datetime)}</p>
            {event.datetime && <p className="event-card-meta">{formatEventTime(event.datetime)}</p>}
            <p className="event-card-meta">{location}</p>
          </>
        )}
      </div>
      <button
        type="button"
        className={`favorite-btn ${liked ? 'is-liked' : ''}`}
        aria-label={liked ? 'Remove from favorites' : 'Save event'}
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(event.id)
        }}
      >
        <Heart size={compact ? 16 : 18} fill={liked ? 'currentColor' : 'none'} />
      </button>
    </article>
  )
}
