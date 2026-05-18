import { useCallback, useEffect, useState, lazy, Suspense } from 'react'
import { Header } from './components/Header'
import { LoginPage } from './components/LoginPage'
import { SignupPage } from './components/SignupPage'
import { DashboardPage } from './components/DashboardPage'
import { useAuth } from './hooks/useAuth'
import { useItineraries } from './hooks/useItineraries'
import { AddToItineraryModal } from './components/AddToItineraryModal'
import type { Event } from './types/event'
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
import { clearFavorites, getFavoriteIds, toggleFavorite } from './utils/favorites'
import { readStoredFilters, writeStoredFilters } from './utils/filterStorage'
import type { TimeOfDay } from './utils/dates'
import { defaultEventFilters } from './utils/dates'
import { parseLatLong } from './utils/geo'

type AppView = 'map' | 'login' | 'signup' | 'dashboard'

function firstMappableId(list: { id: number; latlong?: string | null }[]): number | null {
  for (const e of list) {
    if (parseLatLong(e.latlong)) return e.id
  }
  return null
}

export default function App() {
  const { user, login, signup, logout, initializing, isLoggedIn } = useAuth()
  const itineraryApi = useItineraries(isLoggedIn)
  const [itineraryEvent, setItineraryEvent] = useState<Event | null>(null)
  const [view, setView] = useState<AppView>('map')
  const [menuOpen, setMenuOpen] = useState(false)
  const [listExpanded, setListExpanded] = useState(true)
  const [filters, setFilters] = useState<EventFilters>(() => readStoredFilters())
  const [appliedFilters, setAppliedFilters] = useState<EventFilters>(() => readStoredFilters())
  const [modal, setModal] = useState<FilterModal>(null)
  const [favorites, setFavorites] = useState<Set<number>>(() => getFavoriteIds())
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)

  const { events, loading, error } = useEvents(appliedFilters)

  useEffect(() => {
    writeStoredFilters(appliedFilters)
  }, [appliedFilters])

  useEffect(() => {
    setSelectedEventId((prev) => {
      if (prev != null && events.some((e) => e.id === prev)) return prev
      return firstMappableId(events)
    })
  }, [events])

  const clearFilters = useCallback(() => {
    const next = defaultEventFilters()
    setFilters(next)
    setAppliedFilters(next)
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

  const goToMap = useCallback(() => setView('map'), [])

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      await login(email, password)
      setView('map')
    },
    [login],
  )

  const handleSignup = useCallback(
    async (email: string, password: string, displayName?: string) => {
      await signup(email, password, displayName)
      setView('map')
    },
    [signup],
  )

  const handleLogout = useCallback(async () => {
    await logout()
    clearFavorites()
    setFavorites(new Set())
    setView('map')
  }, [logout])

  useEffect(() => {
    if (view === 'dashboard' && !user && !initializing) {
      setView('map')
    }
  }, [view, user, initializing])

  if (view === 'login') {
    return (
      <LoginPage
        onBack={goToMap}
        onLogin={handleLogin}
        onGoSignup={() => setView('signup')}
      />
    )
  }

  if (view === 'signup') {
    return (
      <SignupPage
        onBack={goToMap}
        onSignup={handleSignup}
        onGoLogin={() => setView('login')}
      />
    )
  }

  if (view === 'dashboard' && user) {
    return (
      <DashboardPage
        user={user}
        itineraries={itineraryApi.itineraries}
        itinerariesLoading={itineraryApi.loading}
        itinerariesError={itineraryApi.error}
        onBack={goToMap}
        onLogout={() => void handleLogout()}
        onLoadDetail={itineraryApi.loadDetail}
        onDeleteItinerary={itineraryApi.remove}
        onRemoveEvent={itineraryApi.removeEvent}
      />
    )
  }

  return (
    <div className="app">
      <Header
        menuOpen={menuOpen}
        user={user}
        onToggleMenu={() => setMenuOpen((v) => !v)}
        onCloseMenu={() => setMenuOpen(false)}
        onLogin={() => setView('login')}
        onSignup={() => setView('signup')}
        onDashboard={() => setView('dashboard')}
        onLogout={handleLogout}
      />

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
            onAddToItinerary={setItineraryEvent}
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

      {itineraryEvent && (
        <AddToItineraryModal
          event={itineraryEvent}
          isLoggedIn={isLoggedIn}
          onClose={() => setItineraryEvent(null)}
          onListForEvent={itineraryApi.listForEvent}
          onGoLogin={() => {
            setItineraryEvent(null)
            setView('login')
          }}
          onCreateItinerary={async (name) => {
            const detail = await itineraryApi.create(name)
            await itineraryApi.addEvent(detail.id, itineraryEvent.id)
          }}
          onAddToItinerary={async (itineraryId) => {
            await itineraryApi.addEvent(itineraryId, itineraryEvent.id)
          }}
        />
      )}
    </div>
  )
}
