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

const CACHE_WINDOW_MONTHS = 2
const FETCH_LIMIT = 1000

function eventMatchesCategories(event: Event, categories: EventCategory[]): boolean {
  if (categories.length === 0) return true
  const eventCats = (event.categories ?? []).map((c) => c.toLowerCase())
  if (eventCats.length === 0) return false
  return categories.some((c) => eventCats.includes(c))
}

export function useEvents(filters: EventFilters) {
  const [cachedEvents, setCachedEvents] = useState<Event[]>([])
  const [loadedStart, setLoadedStart] = useState<string | null>(null)
  const [loadedEnd, setLoadedEnd] = useState<string | null>(null)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const onDate = filters.onDate

    if (
      loadedStart &&
      loadedEnd &&
      (!onDate || (onDate >= loadedStart && onDate <= loadedEnd))
    ) {
      setFetching(false)
      return
    }

    async function run() {
      setFetching(true)
      setError(null)
      try {
        if (loadedStart === null || loadedEnd === null) {
          const start = toIsoDate(new Date())
          const end = addMonthsToIsoDate(start, CACHE_WINDOW_MONTHS)
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

        if (!onDate) {
          if (cancelled) return
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
          const to = maxIsoDate(onDate, addMonthsToIsoDate(from, CACHE_WINDOW_MONTHS))
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
    setCachedEvents([])
    setLoadedStart(null)
    setLoadedEnd(null)
    setFetching(true)
    setError(null)
  }, [])

  return { events: filtered, loading, error, reload }
}
