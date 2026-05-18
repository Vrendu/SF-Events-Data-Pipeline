import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchEvents } from '../api/events'
import type { Event, EventCategory, EventFilters } from '../types/event'
import {
  addDaysToIsoDate,
  addMonthsToIsoDate,
  matchesTimeOfDay,
  maxIsoDate,
  minIsoDate,
  toIsoDate,
} from '../utils/dates'
import { eventIsoDate, mergeEventsById } from '../utils/eventCache'
import {
  clearEventsCache,
  readEventsCache,
  writeEventsCache,
} from '../utils/eventCacheStorage'

/** Default preload window: today through today + this many calendar months */
const CACHE_WINDOW_MONTHS = 1
const FETCH_LIMIT = 1000

function defaultWindow(): { start: string; end: string } {
  const start = toIsoDate(new Date())
  return { start, end: addMonthsToIsoDate(start, CACHE_WINDOW_MONTHS) }
}

function monthCapFromToday(today: string): string {
  return addMonthsToIsoDate(today, CACHE_WINDOW_MONTHS)
}

function loadInitialState(): {
  cachedEvents: Event[]
  loadedStart: string | null
  loadedEnd: string | null
  fetching: boolean
} {
  const stored = readEventsCache()
  if (!stored || stored.events.length === 0) {
    return { cachedEvents: [], loadedStart: null, loadedEnd: null, fetching: true }
  }
  return {
    cachedEvents: stored.events,
    loadedStart: stored.loadedStart,
    loadedEnd: stored.loadedEnd,
    fetching: false,
  }
}

function eventMatchesCategories(event: Event, categories: EventCategory[]): boolean {
  if (categories.length === 0) return true
  const eventCats = (event.categories ?? []).map((c) => c.toLowerCase())
  if (eventCats.length === 0) return false
  return categories.some((c) => eventCats.includes(c))
}

function dateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

export function useEvents(filters: EventFilters) {
  const [cachedEvents, setCachedEvents] = useState<Event[]>(() => loadInitialState().cachedEvents)
  const [loadedStart, setLoadedStart] = useState<string | null>(() => loadInitialState().loadedStart)
  const [loadedEnd, setLoadedEnd] = useState<string | null>(() => loadInitialState().loadedEnd)
  const [fetching, setFetching] = useState(() => loadInitialState().fetching)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (loadedStart && loadedEnd && cachedEvents.length > 0) {
      writeEventsCache({
        events: cachedEvents,
        loadedStart,
        loadedEnd,
        savedAt: new Date().toISOString(),
      })
    }
  }, [cachedEvents, loadedStart, loadedEnd])

  useEffect(() => {
    let cancelled = false
    const onDate = filters.onDate
    const today = toIsoDate(new Date())
    const defaultEnd = monthCapFromToday(today)

    const rangeCoversToday =
      loadedStart != null && loadedEnd != null && dateInRange(today, loadedStart, loadedEnd)

    const rangeCoversFilter =
      !onDate ||
      (loadedStart != null && loadedEnd != null && dateInRange(onDate, loadedStart, loadedEnd))

    if (loadedStart && loadedEnd && rangeCoversToday && rangeCoversFilter) {
      setFetching(false)
      return
    }

    async function run() {
      setFetching(true)
      setError(null)
      try {
        if (loadedStart === null || loadedEnd === null) {
          const { start, end } = defaultWindow()
          const data = await fetchEvents({
            startDate: start,
            endDate: end,
            limit: FETCH_LIMIT,
            sort: 'datetime_asc',
          })
          if (cancelled) return
          setCachedEvents(data)
          setLoadedStart(start)
          setLoadedEnd(end)
          return
        }

        if (!rangeCoversToday && today > loadedEnd) {
          const from = addDaysToIsoDate(loadedEnd, 1)
          const to = maxIsoDate(defaultEnd, today)
          const data = await fetchEvents({
            startDate: from,
            endDate: to,
            limit: FETCH_LIMIT,
            sort: 'datetime_asc',
          })
          if (cancelled) return
          setCachedEvents((prev) => mergeEventsById(prev, data))
          setLoadedEnd(maxIsoDate(loadedEnd, to))
          if (rangeCoversFilter) return
        }

        if (!onDate) {
          return
        }

        if (onDate < loadedStart) {
          const to = addDaysToIsoDate(loadedStart, -1)
          const from = minIsoDate(onDate, addMonthsToIsoDate(to, -CACHE_WINDOW_MONTHS))
          const data = await fetchEvents({
            startDate: from,
            endDate: to,
            limit: FETCH_LIMIT,
            sort: 'datetime_asc',
          })
          if (cancelled) return
          setCachedEvents((prev) => mergeEventsById(prev, data))
          setLoadedStart(from)
        } else if (onDate > loadedEnd) {
          const from = addDaysToIsoDate(loadedEnd, 1)
          const to =
            onDate > defaultEnd
              ? maxIsoDate(onDate, addMonthsToIsoDate(from, CACHE_WINDOW_MONTHS))
              : maxIsoDate(onDate, loadedEnd)
          const data = await fetchEvents({
            startDate: from,
            endDate: to,
            limit: FETCH_LIMIT,
            sort: 'datetime_asc',
          })
          if (cancelled) return
          setCachedEvents((prev) => mergeEventsById(prev, data))
          setLoadedEnd(to)
        }
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
  }, [filters.onDate, loadedStart, loadedEnd])

  const filtered = useMemo(() => {
    return cachedEvents.filter((e) => {
      if (filters.onDate) {
        const d = eventIsoDate(e)
        if (!d || d !== filters.onDate) return false
      }
      if (!eventMatchesCategories(e, filters.categories)) return false
      if (!matchesTimeOfDay(e.datetime, filters.timeOfDay)) return false
      return true
    })
  }, [cachedEvents, filters.onDate, filters.categories, filters.timeOfDay])

  const loading = cachedEvents.length === 0 && fetching

  const reload = useCallback(() => {
    clearEventsCache()
    setCachedEvents([])
    setLoadedStart(null)
    setLoadedEnd(null)
    setFetching(true)
    setError(null)
  }, [])

  return { events: filtered, loading, error, reload }
}
