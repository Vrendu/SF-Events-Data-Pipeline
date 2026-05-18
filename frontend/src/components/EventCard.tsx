import type { MouseEvent } from 'react'
import { CalendarPlus, ExternalLink, Heart } from 'lucide-react'
import type { Event } from '../types/event'
import { formatEventDate, formatEventTime } from '../utils/dates'

interface EventCardProps {
  event: Event
  liked: boolean
  selected?: boolean
  compact?: boolean
  onToggleFavorite: (id: number) => void
  onAddToItinerary?: (event: Event) => void
  onSelect?: (id: number) => void
}

export function EventCard({
  event,
  liked,
  selected,
  compact,
  onToggleFavorite,
  onAddToItinerary,
  onSelect,
}: EventCardProps) {
  const location = event.venue || event.location || 'Location TBA'
  const eventUrl = event.url?.trim()

  const stopCardClick = (e: MouseEvent) => {
    e.stopPropagation()
  }

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
        <h3 className="event-card-title">
          {eventUrl ? (
            <a
              href={eventUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="event-card-title-link"
              onClick={stopCardClick}
            >
              {event.title}
            </a>
          ) : (
            event.title
          )}
        </h3>
        {compact ? (
          <p className="event-card-meta event-card-meta--inline">
            {formatEventDate(event.datetime)}
            {event.datetime ? ` · ${formatEventTime(event.datetime)}` : ''}
            {eventUrl && (
              <>
                {' · '}
                <a
                  href={eventUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="event-card-link"
                  onClick={stopCardClick}
                  aria-label={`Open ${event.title}`}
                >
                  <ExternalLink size={12} aria-hidden />
                </a>
              </>
            )}
          </p>
        ) : (
          <>
            <p className="event-card-meta">{formatEventDate(event.datetime)}</p>
            {event.datetime && <p className="event-card-meta">{formatEventTime(event.datetime)}</p>}
            <p className="event-card-meta">{location}</p>
            {eventUrl && (
              <a
                href={eventUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="event-card-link"
                onClick={stopCardClick}
              >
                View event
                <ExternalLink size={14} aria-hidden />
              </a>
            )}
          </>
        )}
      </div>
      <div className="event-card-actions">
        {onAddToItinerary && (
          <button
            type="button"
            className="itinerary-add-btn"
            aria-label="Add to itinerary"
            onClick={(e) => {
              e.stopPropagation()
              onAddToItinerary(event)
            }}
          >
            <CalendarPlus size={compact ? 16 : 18} />
          </button>
        )}
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
      </div>
    </article>
  )
}
