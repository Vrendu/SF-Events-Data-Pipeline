import { useCallback, useEffect, useState, lazy, Suspense } from 'react'
import { Header } from './components/Header'
import { LoginPage } from './components/LoginPage'
import { SignupPage } from './components/SignupPage'
import { DashboardPage } from './components/DashboardPage'
import { useAuth } from './hooks/useAuth'
import { useItineraries } from './hooks/useItineraries'
import { useFavorites } from './hooks/useFavorites'
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
import { clearItinerariesCache, readItinerariesCache } from './utils/itineraryStorage'
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
  const itineraryApi = useItineraries(user?.id ?? null)
  const favoritesApi = useFavorites(user?.id ?? null)
  const [itineraryEvent, setItineraryEvent] = useState<Event | null>(null)
  const [view, setView] = useState<AppView>('map')
  const [menuOpen, setMenuOpen] = useState(false)
  const [listExpanded, setListExpanded] = useState(false)
  const [filters, setFilters] = useState<EventFilters>(() => readStoredFilters())
  const [appliedFilters, setAppliedFilters] = useState<EventFilters>(() => readStoredFilters())
  const [modal, setModal] = useState<FilterModal>(null)
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

  const handleToggleFavorite = useCallback(
    (id: number) => {
      void favoritesApi.toggle(id)
    },
    [favoritesApi.toggle],
  )

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
    favoritesApi.clear()
    clearItinerariesCache()
    setView('map')
  }, [logout, favoritesApi.clear])

  useEffect(() => {
    if (view === 'dashboard' && !user && !initializing) {
      setView('map')
    }
  }, [view, user, initializing])

  useEffect(() => {
    if (view !== 'dashboard' || !user?.id) return
    const cached = readItinerariesCache(user.id)
    void itineraryApi.refresh({ silent: (cached?.length ?? 0) > 0 })
    void favoritesApi.refresh({ silent: favoritesApi.favoriteEvents.length > 0 })
  }, [view, user?.id, itineraryApi.refresh, favoritesApi.refresh, favoritesApi.favoriteEvents.length])

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
        favorites={favoritesApi.favoriteEvents}
        favoritesLoading={favoritesApi.loading}
        favoritesError={favoritesApi.error}
        onBack={goToMap}
        onLogout={() => void handleLogout()}
        onLoadDetail={itineraryApi.loadDetail}
        onDeleteItinerary={itineraryApi.remove}
        onRemoveEvent={itineraryApi.removeEvent}
        onRemoveFavorite={favoritesApi.remove}
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
            favorites={favoritesApi.favoriteIds}
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
