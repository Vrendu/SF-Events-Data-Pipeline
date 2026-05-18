import type { Event, EventFilters } from '../types/event'
import { toIsoDate } from '../utils/dates'
import { FilterBar, type FilterModal } from './FilterBar'
import { EventList } from './EventList'

interface EventListSheetProps {
  expanded: boolean
  onToggleExpand: () => void
  events: Event[]
  filters: EventFilters
  favorites: Set<number>
  selectedEventId: number | null
  loading: boolean
  onOpenModal: (modal: FilterModal) => void
  onClearFilters: () => void
  onToggleFavorite: (id: number) => void
  onSelectEvent: (id: number) => void
}

export function EventListSheet({
  expanded,
  onToggleExpand,
  events,
  filters,
  favorites,
  selectedEventId,
  loading,
  onOpenModal,
  onClearFilters,
  onToggleFavorite,
  onSelectEvent,
}: EventListSheetProps) {
  const today = toIsoDate(new Date())
  const hasFilters =
    filters.categories.length > 0 ||
    (filters.onDate != null && filters.onDate !== today) ||
    filters.timeOfDay !== 'all'

  return (
    <section
      className={`event-list-sheet ${expanded ? 'event-list-sheet--expanded' : 'event-list-sheet--collapsed'}`}
      aria-label="Events list"
    >
      <button
        type="button"
        className="event-list-sheet__grab"
        onClick={onToggleExpand}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse event list' : 'Expand event list'}
      >
        <span className="sheet-handle" aria-hidden />
      </button>

      {expanded ? (
        <>
          <FilterBar filters={filters} onOpenModal={onOpenModal} />
          <div className="results-header">
            <span className="results-count">
              {loading ? 'Loading…' : `${events.length} Event${events.length === 1 ? '' : 's'} to plot`}
            </span>
            {hasFilters && !loading && (
              <button type="button" className="clear-filters" onClick={onClearFilters}>
                Clear filters
              </button>
            )}
          </div>
          {loading ? (
            <p className="event-list-sheet__loading">Loading events…</p>
          ) : (
            <EventList
              events={events}
              favorites={favorites}
              selectedEventId={selectedEventId}
              onToggleFavorite={onToggleFavorite}
              onSelectEvent={onSelectEvent}
              scrollable
            />
          )}
        </>
      ) : (
        <div className="event-list-sheet__collapsed-body">
          <div className="event-list-sheet__collapsed-head">
            <span className="results-count">
              {loading ? 'Loading…' : `${events.length} event${events.length === 1 ? '' : 's'}`}
            </span>
            <button type="button" className="event-list-sheet__expand-hint" onClick={onToggleExpand}>
              Expand
            </button>
          </div>
          {loading ? (
            <p className="event-list-sheet__loading">Loading events…</p>
          ) : events.length === 0 ? (
            <p className="event-list-sheet__empty-peek">No events match your filters.</p>
          ) : (
            <EventList
              events={events}
              favorites={favorites}
              selectedEventId={selectedEventId}
              onToggleFavorite={onToggleFavorite}
              onSelectEvent={onSelectEvent}
              scrollable={false}
              maxItems={2}
              compact
            />
          )}
        </div>
      )}
    </section>
  )
}
