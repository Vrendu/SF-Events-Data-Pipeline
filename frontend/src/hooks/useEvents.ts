import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchEvents } from '../api/events'
import type { Event, EventCategory, EventFilters } from '../types/event'
import { matchesTimeOfDay, toIsoDate } from '../utils/dates'
import { eventIsoDate } from '../utils/eventCache'
import {
  clearEventsCache,
  readEventsCache,
  writeEventsCache,
} from '../utils/eventCacheStorage'
import { MAP_CITIES } from '../utils/geo'

/** Every event in SF/Oakland/Alameda/Berkeley, frontloaded once and kept in localStorage. */
const FETCH_LIMIT = 20000
const CITIES_PARAM = MAP_CITIES.join(',')

function eventMatchesCategories(event: Event, categories: EventCategory[]): boolean {
  if (categories.length === 0) return true
  const eventCats = (event.categories ?? []).map((c) => c.toLowerCase())
  if (eventCats.length === 0) return false
  return categories.some((c) => eventCats.includes(c))
}

function loadInitialState(): { events: Event[]; loaded: boolean; fetching: boolean } {
  const stored = readEventsCache()
  const today = toIsoDate(new Date())
  // Refetch once a new calendar day starts, so newly-scraped events show up.
  if (!stored || stored.events.length === 0 || stored.fetchedOn !== today) {
    return { events: [], loaded: false, fetching: true }
  }
  return { events: stored.events, loaded: true, fetching: false }
}

export function useEvents(filters: EventFilters) {
  const [allEvents, setAllEvents] = useState<Event[]>(() => loadInitialState().events)
  const [loaded, setLoaded] = useState(() => loadInitialState().loaded)
  const [fetching, setFetching] = useState(() => loadInitialState().fetching)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (loaded) return

    async function run() {
      setFetching(true)
      setError(null)
      try {
        const data = await fetchEvents({
          cities: CITIES_PARAM,
          limit: FETCH_LIMIT,
          sort: 'datetime_asc',
        })
        if (cancelled) return
        setAllEvents(data)
        setLoaded(true)
        writeEventsCache({ events: data, fetchedOn: toIsoDate(new Date()) })
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load events')
        }
      } finally {
        if (!cancelled) setFetching(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [loaded])

  const filtered = useMemo(() => {
    return allEvents.filter((e) => {
      if (filters.onDate) {
        const d = eventIsoDate(e)
        if (!d || d !== filters.onDate) return false
      }
      if (!eventMatchesCategories(e, filters.categories)) return false
      if (!matchesTimeOfDay(e.datetime, filters.timeOfDay)) return false
      return true
    })
  }, [allEvents, filters.onDate, filters.categories, filters.timeOfDay])

  const loading = allEvents.length === 0 && fetching

  const reload = useCallback(() => {
    clearEventsCache()
    setAllEvents([])
    setLoaded(false)
    setFetching(true)
    setError(null)
  }, [])

  return { events: filtered, loading, error, reload }
}
