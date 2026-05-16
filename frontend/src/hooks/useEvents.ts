import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchEvents } from '../api/events'
import type { Event, EventCategory, EventFilters } from '../types/event'
import { matchesTimeOfDay } from '../utils/dates'

function eventMatchesCategories(event: Event, categories: EventCategory[]): boolean {
  if (categories.length === 0) return true
  const eventCats = (event.categories ?? []).map((c) => c.toLowerCase())
  if (eventCats.length === 0) return false
  return categories.some((c) => eventCats.includes(c))
}

export function useEvents(filters: EventFilters) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Parameters<typeof fetchEvents>[0] = {
        limit: 500,
        sort: 'datetime_asc',
      }
      if (filters.onDate) params.onDate = filters.onDate

      const data = await fetchEvents(params)
      setEvents(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load events')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [filters.onDate])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (!eventMatchesCategories(e, filters.categories)) return false
      if (!matchesTimeOfDay(e.datetime, filters.timeOfDay)) return false
      return true
    })
  }, [events, filters.categories, filters.timeOfDay])

  return { events: filtered, loading, error, reload: load }
}
