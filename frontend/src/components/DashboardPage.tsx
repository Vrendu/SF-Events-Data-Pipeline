import { useCallback, useEffect, useRef, useState } from 'react'
import { ExternalLink, Trash2 } from 'lucide-react'
import type { Event } from '../types/event'
import { ConfirmModal } from './ConfirmModal'
import type { User } from '../types/user'
import type { Itinerary, ItineraryDetail } from '../types/itinerary'
import { formatEventDate, formatEventTime } from '../utils/dates'
import { formatEventSource } from '../utils/source'

type DashboardView = 'itineraries' | 'favorites'

type ConfirmState =
  | { kind: 'delete-itinerary'; name: string }
  | { kind: 'remove-event'; eventId: number; title: string }
  | { kind: 'remove-favorite'; eventId: number; title: string }
  | null

interface DashboardPageProps {
  user: User
  itineraries: Itinerary[]
  itinerariesLoading: boolean
  itinerariesError: string | null
  onBack: () => void
  onLogout: () => void
  onLoadDetail: (id: string) => Promise<ItineraryDetail>
  onDeleteItinerary: (id: string) => Promise<void>
  onRemoveEvent: (itineraryId: string, eventId: number) => Promise<ItineraryDetail>
  favorites: Event[]
  favoritesLoading: boolean
  favoritesError: string | null
  onRemoveFavorite: (eventId: number) => Promise<void>
}

export function DashboardPage({
  user,
  itineraries,
  itinerariesLoading,
  itinerariesError,
  onBack,
  onLogout,
  onLoadDetail,
  onDeleteItinerary,
  onRemoveEvent,
  favorites,
  favoritesLoading,
  favoritesError,
  onRemoveFavorite,
}: DashboardPageProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ItineraryDetail | null>(null)
  const detailCacheRef = useRef<Record<string, ItineraryDetail>>({})
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [dashboardView, setDashboardView] = useState<DashboardView>('itineraries')

  const openDetail = useCallback(
    async (id: string) => {
      setSelectedId(id)
      setDetailError(null)

      const cached = detailCacheRef.current[id]
      if (cached) {
        setDetail(cached)
        setDetailLoading(false)
        return
      }

      setDetailLoading(true)
      try {
        const d = await onLoadDetail(id)
        detailCacheRef.current[id] = d
        setDetail(d)
      } catch (e) {
        setDetailError(e instanceof Error ? e.message : 'Failed to load itinerary')
        setDetail(null)
      } finally {
        setDetailLoading(false)
      }
    },
    [onLoadDetail],
  )

  useEffect(() => {
    if (itineraries.length === 0) {
      setSelectedId(null)
      setDetail(null)
      return
    }

    const stillExists = selectedId != null && itineraries.some((it) => it.id === selectedId)
    if (!stillExists) {
      void openDetail(itineraries[0].id)
    }
  }, [itineraries, selectedId, openDetail])

  const handleDeleteItinerary = async () => {
    if (!selectedId) return
    const deletedId = selectedId
    const remaining = itineraries.filter((it) => it.id !== deletedId)
    await onDeleteItinerary(deletedId)

    delete detailCacheRef.current[deletedId]

    if (remaining.length > 0) {
      void openDetail(remaining[0].id)
    } else {
      setSelectedId(null)
      setDetail(null)
    }
  }

  const handleRemoveEvent = async (eventId: number) => {
    if (!selectedId) return
    const d = await onRemoveEvent(selectedId, eventId)
    detailCacheRef.current[selectedId] = d
    setDetail(d)
  }

  const handleConfirm = async () => {
    if (!confirm || confirmBusy) return
    setConfirmBusy(true)
    try {
      if (confirm.kind === 'delete-itinerary') {
        await handleDeleteItinerary()
      } else if (confirm.kind === 'remove-event') {
        await handleRemoveEvent(confirm.eventId)
      } else {
        await onRemoveFavorite(confirm.eventId)
      }
      setConfirm(null)
    } finally {
      setConfirmBusy(false)
    }
  }

  const selectedSummary = itineraries.find((it) => it.id === selectedId)

  return (
    <div className="app dashboard-page">
      <header className="dashboard-page__head">
        <button type="button" className="auth-page__back" onClick={onBack}>
          ← Back to map
        </button>
      </header>
      <div className="dashboard-page__intro">
        <h1 className="auth-page__title">Dashboard</h1>
        <p className="auth-page__subtitle">
          Signed in as <strong>{user.email}</strong>
        </p>

        <div className="dashboard-view-toggle" role="tablist" aria-label="Dashboard view">
          <button
            type="button"
            role="tab"
            aria-selected={dashboardView === 'itineraries'}
            className={`dashboard-view-toggle__btn ${dashboardView === 'itineraries' ? 'is-active' : ''}`}
            onClick={() => setDashboardView('itineraries')}
          >
            Itineraries
            {itineraries.length > 0 && (
              <span className="dashboard-view-toggle__count">{itineraries.length}</span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={dashboardView === 'favorites'}
            className={`dashboard-view-toggle__btn ${dashboardView === 'favorites' ? 'is-active' : ''}`}
            onClick={() => setDashboardView('favorites')}
          >
            Favorites
            {favorites.length > 0 && (
              <span className="dashboard-view-toggle__count">{favorites.length}</span>
            )}
          </button>
        </div>
      </div>

      <div className="dashboard-page__main">
        {dashboardView === 'itineraries' && (
        <section className="dashboard-panel dashboard-itineraries" aria-label="Your itineraries">
          {itinerariesLoading && <p className="itinerary-modal__status">Loading…</p>}
          {itinerariesError && (
            <p className="auth-form__error" role="alert">
              {itinerariesError}
            </p>
          )}
          {!itinerariesLoading && itineraries.length === 0 && (
            <p className="dashboard-card__text">
              No itineraries yet. From the map, open an event and tap the calendar icon to add it.
            </p>
          )}

          {itineraries.length > 0 && (
            <div className="dashboard-itineraries-layout">
              <div className="itinerary-tabs" role="tablist" aria-label="Select itinerary">
                {itineraries.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    role="tab"
                    aria-selected={selectedId === it.id}
                    className={`itinerary-tab ${selectedId === it.id ? 'is-active' : ''}`}
                    onClick={() => void openDetail(it.id)}
                  >
                    <span className="itinerary-tab__name">{it.name}</span>
                    <span className="itinerary-tab__count">
                      {it.eventCount} event{it.eventCount === 1 ? '' : 's'}
                    </span>
                  </button>
                ))}
              </div>

              <div
                className="itinerary-detail-panel"
                role="tabpanel"
                aria-label={selectedSummary?.name ?? 'Itinerary details'}
              >
                {detail && !detailLoading && (
                  <div className="itinerary-detail-head">
                      <h3>{detail.name}</h3>
                      <button
                        type="button"
                        className="itinerary-detail-delete"
                        aria-label="Delete itinerary"
                        onClick={() =>
                          setConfirm({ kind: 'delete-itinerary', name: detail.name })
                        }
                      >
                        <Trash2 size={18} />
                      </button>
                  </div>
                )}
                <div className="dashboard-scroll">
                  {detailLoading && <p className="itinerary-modal__status">Loading events…</p>}
                  {detailError && (
                    <p className="auth-form__error" role="alert">
                      {detailError}
                    </p>
                  )}
                  {detail && !detailLoading && detail.events.length === 0 && (
                    <p className="dashboard-card__text">No events in this itinerary yet.</p>
                  )}
                  {detail && !detailLoading && detail.events.length > 0 && (
                    <ul className="itinerary-detail-events">
                        {detail.events.map((ev) => {
                          const sourceLabel = formatEventSource(ev.source)
                          return (
                          <li key={ev.id} className="itinerary-detail-event">
                            <div>
                              <strong>{ev.title}</strong>
                              <span>
                                {formatEventDate(ev.datetime)}
                                {ev.datetime ? ` · ${formatEventTime(ev.datetime)}` : ''}
                              </span>
                              <span>{ev.venue || ev.location || ''}</span>
                              {sourceLabel && (
                                <span className="itinerary-detail-event-source">{sourceLabel}</span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="itinerary-detail-remove"
                              onClick={() =>
                                setConfirm({
                                  kind: 'remove-event',
                                  eventId: ev.id,
                                  title: ev.title,
                                })
                              }
                            >
                              Remove
                            </button>
                          </li>
                          )
                        })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
        )}

        {dashboardView === 'favorites' && (
        <section className="dashboard-panel dashboard-favorites" aria-label="Your favorites">
          <div className="dashboard-scroll">
            {favoritesLoading && <p className="itinerary-modal__status">Loading…</p>}
            {favoritesError && (
              <p className="auth-form__error" role="alert">
                {favoritesError}
              </p>
            )}
            {!favoritesLoading && favorites.length === 0 && (
              <p className="dashboard-card__text">
                No favorites yet. From the map, tap the heart on an event to save it here.
              </p>
            )}
            {favorites.length > 0 && (
            <div className="itinerary-detail-panel dashboard-favorites-panel">
            <ul className="itinerary-detail-events dashboard-favorites-list">
              {favorites.map((ev) => {
                const sourceLabel = formatEventSource(ev.source)
                const eventUrl = ev.url?.trim()
                return (
                  <li key={ev.id} className="itinerary-detail-event">
                    <div>
                      <strong>
                        {eventUrl ? (
                          <a
                            href={eventUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="event-card-title-link"
                          >
                            {ev.title}
                          </a>
                        ) : (
                          ev.title
                        )}
                      </strong>
                      <span>
                        {formatEventDate(ev.datetime)}
                        {ev.datetime ? ` · ${formatEventTime(ev.datetime)}` : ''}
                      </span>
                      <span>{ev.venue || ev.location || ''}</span>
                      {sourceLabel && (
                        <span className="itinerary-detail-event-source">{sourceLabel}</span>
                      )}
                      {eventUrl && (
                        <a
                          href={eventUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="event-card-link dashboard-favorites-list__link"
                        >
                          View event
                          <ExternalLink size={14} aria-hidden />
                        </a>
                      )}
                    </div>
                    <button
                      type="button"
                      className="itinerary-detail-remove"
                      onClick={() =>
                        setConfirm({
                          kind: 'remove-favorite',
                          eventId: ev.id,
                          title: ev.title,
                        })
                      }
                    >
                      Remove
                    </button>
                  </li>
          
                )
              })}
            </ul>
            </div>
            )}
          </div>
        </section>
        )}
      </div>

      <footer className="dashboard-page__footer">
        <button type="button" className="auth-form__submit auth-form__submit--secondary" onClick={onLogout}>
          Log out
        </button>
      </footer>

      {confirm?.kind === 'delete-itinerary' && (
        <ConfirmModal
          title="Delete itinerary?"
          message={`“${confirm.name}” and all events in it will be removed. This can’t be undone.`}
          confirmLabel={confirmBusy ? 'Deleting…' : 'Delete itinerary'}
          busy={confirmBusy}
          onConfirm={() => void handleConfirm()}
          onClose={() => !confirmBusy && setConfirm(null)}
        />
      )}
      {confirm?.kind === 'remove-event' && (
        <ConfirmModal
          title="Remove event?"
          message={`Remove “${confirm.title}” from this itinerary?`}
          confirmLabel={confirmBusy ? 'Removing…' : 'Remove'}
          busy={confirmBusy}
          onConfirm={() => void handleConfirm()}
          onClose={() => !confirmBusy && setConfirm(null)}
        />
      )}
      {confirm?.kind === 'remove-favorite' && (
        <ConfirmModal
          title="Remove favorite?"
          message={`Remove “${confirm.title}” from your favorites?`}
          confirmLabel={confirmBusy ? 'Removing…' : 'Remove'}
          busy={confirmBusy}
          onConfirm={() => void handleConfirm()}
          onClose={() => !confirmBusy && setConfirm(null)}
        />
      )}
    </div>
  )
}
