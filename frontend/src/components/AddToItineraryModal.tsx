import { useEffect, useState, type FormEvent } from 'react'
import { Check, Plus } from 'lucide-react'
import type { Event } from '../types/event'
import type { Itinerary } from '../types/itinerary'
import { formatEventDate, formatEventTime } from '../utils/dates'

interface AddToItineraryModalProps {
  event: Event
  onClose: () => void
  onListForEvent: (eventId: number) => Promise<Itinerary[]>
  onCreateItinerary: (name: string) => Promise<void>
  onAddToItinerary: (itineraryId: string, eventId: number) => Promise<void>
  onGoLogin: () => void
  isLoggedIn: boolean
}

export function AddToItineraryModal({
  event,
  onClose,
  onListForEvent,
  onCreateItinerary,
  onAddToItinerary,
  onGoLogin,
  isLoggedIn,
}: AddToItineraryModalProps) {
  const [items, setItems] = useState<Itinerary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    onListForEvent(event.id)
      .then((list) => {
        if (!cancelled) setItems(list)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [event.id, isLoggedIn, onListForEvent])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    setError(null)
    try {
      await onCreateItinerary(name)
      setNewName('')
      const list = await onListForEvent(event.id)
      setItems(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create itinerary')
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (it: Itinerary) => {
    if (it.hasEvent) return
    setBusyId(it.id)
    setError(null)
    try {
      await onAddToItinerary(it.id, event.id)
      const list = await onListForEvent(event.id)
      setItems(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add event')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-panel itinerary-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="modal-title">Add to itinerary</h2>
        </div>
        <p className="itinerary-modal__event">
          <strong>{event.title}</strong>
          <span>
            {formatEventDate(event.datetime)}
            {event.datetime ? ` · ${formatEventTime(event.datetime)}` : ''}
          </span>
        </p>

        {!isLoggedIn ? (
          <div className="itinerary-modal__guest">
            <p>Sign in to save events to an itinerary.</p>
            <button type="button" className="auth-form__submit" onClick={onGoLogin}>
              Log in
            </button>
          </div>
        ) : (
          <>
            <form className="itinerary-modal__create" onSubmit={handleCreate}>
              <input
                type="text"
                placeholder="New itinerary name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={120}
                disabled={creating}
              />
              <button type="submit" className="itinerary-modal__create-btn" disabled={creating}>
                <Plus size={18} />
              </button>
            </form>

            {loading ? (
              <p className="itinerary-modal__status">Loading itineraries…</p>
            ) : items.length === 0 ? (
              <p className="itinerary-modal__status">Create an itinerary above, then add this event.</p>
            ) : (
              <ul className="itinerary-pick-list">
                {items.map((it) => (
                  <li key={it.id}>
                    <button
                      type="button"
                      className={`itinerary-pick-item ${it.hasEvent ? 'itinerary-pick-item--added' : ''}`}
                      disabled={!!it.hasEvent || busyId === it.id}
                      onClick={() => void handleToggle(it)}
                    >
                      <span className="itinerary-pick-item__name">{it.name}</span>
                      <span className="itinerary-pick-item__meta">
                        {it.eventCount} event{it.eventCount === 1 ? '' : 's'}
                      </span>
                      {it.hasEvent && (
                        <span className="itinerary-pick-item__check" aria-hidden>
                          <Check size={18} />
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {error && (
              <p className="auth-form__error" role="alert">
                {error}
              </p>
            )}
          </>
        )}

        <button type="button" className="modal-done-btn" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}
