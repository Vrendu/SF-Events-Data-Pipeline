import { useCallback, useEffect, useState, lazy, Suspense } from 'react'
import { Header } from './components/Header'
import { EventTypeModal } from './components/EventTypeModal'
import { DateModal } from './components/DateModal'
import { TimeModal } from './components/TimeModal'
import { EventListSheet } from './components/EventListSheet'
const MapView = lazy(() =>
  import('./components/MapView').then((m) => ({ default: m.MapView })),
)
import type { FilterModal } from './components/FilterBar'
import { useEvents } from './hooks/useEvents'
import type { EventFilters } from './types/event'
import { getFavoriteIds, toggleFavorite } from './utils/favorites'
import type { TimeOfDay } from './utils/dates'
import { parseLatLong } from './utils/geo'

const defaultFilters: EventFilters = {
  categories: [],
  onDate: null,
  timeOfDay: 'all',
}

function firstMappableId(list: { id: number; latlong?: string | null }[]): number | null {
  for (const e of list) {
    if (parseLatLong(e.latlong)) return e.id
  }
  return null
}

export default function App() {
  const [listExpanded, setListExpanded] = useState(true)
  const [filters, setFilters] = useState<EventFilters>(defaultFilters)
  const [appliedFilters, setAppliedFilters] = useState<EventFilters>(defaultFilters)
  const [modal, setModal] = useState<FilterModal>(null)
  const [favorites, setFavorites] = useState<Set<number>>(() => getFavoriteIds())
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)

  const { events, loading, error } = useEvents(appliedFilters)

  useEffect(() => {
    setSelectedEventId((prev) => {
      if (prev != null && events.some((e) => e.id === prev)) return prev
      return firstMappableId(events)
    })
  }, [events])

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters)
    setAppliedFilters(defaultFilters)
  }, [])

  const handleToggleFavorite = useCallback((id: number) => {
    setFavorites(toggleFavorite(id))
  }, [])

  const closeModal = () => setModal(null)

  const openModal = (m: FilterModal) => {
    setFilters(appliedFilters)
    setModal(m)
  }

  const toggleList = useCallback(() => {
    setListExpanded((v) => !v)
  }, [])

  return (
    <div className="app">
      <Header />

      <main className="main">
        <div className="map-view-shell">
          <Suspense fallback={<div className="map-stage map-stage--loading">Loading map…</div>}>
            <MapView
              events={events}
              selectedEventId={selectedEventId}
              onSelectEvent={setSelectedEventId}
              listExpanded={listExpanded}
            />
          </Suspense>

          {error && (
            <div className="map-overlay map-overlay--error" role="alert">
              {error}
            </div>
          )}

          <EventListSheet
            expanded={listExpanded}
            onToggleExpand={toggleList}
            events={events}
            filters={appliedFilters}
            favorites={favorites}
            selectedEventId={selectedEventId}
            loading={loading}
            onOpenModal={openModal}
            onClearFilters={clearFilters}
            onToggleFavorite={handleToggleFavorite}
            onSelectEvent={setSelectedEventId}
          />
        </div>
      </main>

      {modal === 'category' && (
        <EventTypeModal
          selected={filters.categories}
          onApply={(categories) => {
            const next = { ...filters, categories }
            setFilters(next)
            setAppliedFilters(next)
            closeModal()
          }}
          onClose={closeModal}
        />
      )}
      {modal === 'date' && (
        <DateModal
          value={filters.onDate}
          onApply={(onDate) => {
            const next = { ...filters, onDate }
            setFilters(next)
            setAppliedFilters(next)
            closeModal()
          }}
          onClose={closeModal}
        />
      )}
      {modal === 'time' && (
        <TimeModal
          value={filters.timeOfDay}
          onApply={(timeOfDay: TimeOfDay) => {
            const next = { ...filters, timeOfDay }
            setFilters(next)
            setAppliedFilters(next)
            closeModal()
          }}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
