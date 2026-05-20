import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addEventToItinerary,
  createItinerary,
  deleteItinerary,
  fetchItineraries,
  fetchItinerary,
  removeEventFromItinerary,
} from '../api/itineraries'
import type { Itinerary, ItineraryDetail } from '../types/itinerary'
import {
  clearItinerariesCache,
  readItinerariesCache,
  writeItinerariesCache,
} from '../utils/itineraryStorage'

function detailToSummary(detail: ItineraryDetail): Itinerary {
  return {
    id: detail.id,
    name: detail.name,
    eventCount: detail.events.length,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  }
}

export function useItineraries(userId: string | null) {
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedForUser = useRef<string | null>(null)

  const persist = useCallback(
    (next: Itinerary[]) => {
      setItineraries(next)
      if (userId) writeItinerariesCache(userId, next)
    },
    [userId],
  )

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!userId) {
        setItineraries([])
        return
      }
      const silent = options?.silent ?? false
      if (!silent) setLoading(true)
      setError(null)
      try {
        const data = await fetchItineraries()
        persist(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load itineraries')
        if (!silent) {
          setItineraries([])
          clearItinerariesCache()
        }
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [userId, persist],
  )

  useEffect(() => {
    if (!userId) {
      setItineraries([])
      setLoading(false)
      setError(null)
      loadedForUser.current = null
      return
    }

    if (loadedForUser.current === userId) return
    loadedForUser.current = userId

    const cached = readItinerariesCache(userId)
    if (cached) {
      setItineraries(cached)
      setLoading(false)
      setError(null)
      return
    }

    void refresh()
  }, [userId, refresh])

  const create = useCallback(
    async (name: string) => {
      const detail = await createItinerary(name)
      persist([...itineraries, detailToSummary(detail)])
      return detail
    },
    [itineraries, persist],
  )

  const addEvent = useCallback(
    async (itineraryId: string, eventId: number) => {
      const detail = await addEventToItinerary(itineraryId, eventId)
      persist(
        itineraries.map((it) =>
          it.id === itineraryId
            ? {
                ...it,
                eventCount: detail.events.length,
                updatedAt: detail.updatedAt,
                hasEvent: true,
              }
            : it,
        ),
      )
      return detail
    },
    [itineraries, persist],
  )

  const removeEvent = useCallback(
    async (itineraryId: string, eventId: number) => {
      const detail = await removeEventFromItinerary(itineraryId, eventId)
      persist(
        itineraries.map((it) =>
          it.id === itineraryId
            ? {
                ...it,
                eventCount: detail.events.length,
                updatedAt: detail.updatedAt,
                hasEvent: detail.events.some((e) => e.id === eventId),
              }
            : it,
        ),
      )
      return detail
    },
    [itineraries, persist],
  )

  const remove = useCallback(
    async (itineraryId: string) => {
      await deleteItinerary(itineraryId)
      persist(itineraries.filter((it) => it.id !== itineraryId))
    },
    [itineraries, persist],
  )

  const loadDetail = useCallback(async (itineraryId: string): Promise<ItineraryDetail> => {
    return fetchItinerary(itineraryId)
  }, [])

  const listForEvent = useCallback(async (eventId: number): Promise<Itinerary[]> => {
    return fetchItineraries(eventId)
  }, [])

  return {
    itineraries,
    loading,
    error,
    refresh,
    create,
    addEvent,
    removeEvent,
    remove,
    loadDetail,
    listForEvent,
  }
}
