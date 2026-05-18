import { useCallback, useEffect, useState } from 'react'
import { ChevronRight, Trash2 } from 'lucide-react'
import type { User } from '../types/user'
import type { Itinerary, ItineraryDetail } from '../types/itinerary'
import { formatEventDate, formatEventTime } from '../utils/dates'

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
}: DashboardPageProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ItineraryDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const openDetail = useCallback(
    async (id: string) => {
      setSelectedId(id)
      setDetailLoading(true)
      setDetailError(null)
      try {
        const d = await onLoadDetail(id)
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
    if (itineraries.length > 0 && !selectedId) {
      void openDetail(itineraries[0].id)
    }
    if (itineraries.length === 0) {
      setSelectedId(null)
      setDetail(null)
    }
  }, [itineraries, selectedId, openDetail])

  const handleDelete = async () => {
    if (!selectedId || !confirm('Delete this itinerary?')) return
    await onDeleteItinerary(selectedId)
    setSelectedId(null)
    setDetail(null)
  }

  const handleRemoveEvent = async (eventId: number) => {
    if (!selectedId) return
    const d = await onRemoveEvent(selectedId, eventId)
    setDetail(d)
  }

  return (
    <div className="auth-page dashboard-page">
      <header className="auth-page__head">
        <button type="button" className="auth-page__back" onClick={onBack}>
          ← Back to map
        </button>
      </header>
      <div className="auth-page__body dashboard-page__body">
        <h1 className="auth-page__title">Dashboard</h1>
        <p className="auth-page__subtitle">
          Signed in as <strong>{user.email}</strong>
        </p>

        <section className="dashboard-itineraries" aria-label="Your itineraries">
          <h2 className="dashboard-section-title">Itineraries</h2>
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
              <ul className="itinerary-list">
                {itineraries.map((it) => (
                  <li key={it.id}>
                    <button
                      type="button"
                      className={`itinerary-list-item ${selectedId === it.id ? 'is-active' : ''}`}
                      onClick={() => void openDetail(it.id)}
                    >
                      <span className="itinerary-list-item__name">{it.name}</span>
                      <span className="itinerary-list-item__meta">
                        {it.eventCount} event{it.eventCount === 1 ? '' : 's'}
                      </span>
                      <ChevronRight size={18} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="itinerary-detail-panel">
                {detailLoading && <p className="itinerary-modal__status">Loading events…</p>}
                {detailError && (
                  <p className="auth-form__error" role="alert">
                    {detailError}
                  </p>
                )}
                {detail && !detailLoading && (
                  <>
                    <div className="itinerary-detail-head">
                      <h3>{detail.name}</h3>
                      <button
                        type="button"
                        className="itinerary-detail-delete"
                        aria-label="Delete itinerary"
                        onClick={() => void handleDelete()}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    {detail.events.length === 0 ? (
                      <p className="dashboard-card__text">No events in this itinerary yet.</p>
                    ) : (
                      <ul className="itinerary-detail-events">
                        {detail.events.map((ev) => (
                          <li key={ev.id} className="itinerary-detail-event">
                            <div>
                              <strong>{ev.title}</strong>
                              <span>
                                {formatEventDate(ev.datetime)}
                                {ev.datetime ? ` · ${formatEventTime(ev.datetime)}` : ''}
                              </span>
                              <span>{ev.venue || ev.location || ''}</span>
                            </div>
                            <button
                              type="button"
                              className="itinerary-detail-remove"
                              onClick={() => void handleRemoveEvent(ev.id)}
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        <button type="button" className="auth-form__submit auth-form__submit--secondary" onClick={onLogout}>
          Log out
        </button>
      </div>
    </div>
  )
}
