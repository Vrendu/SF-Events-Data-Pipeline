import { useCallback, useEffect, useState } from 'react'
import {
  addEventToItinerary,
  createItinerary,
  deleteItinerary,
  fetchItineraries,
  fetchItinerary,
  removeEventFromItinerary,
} from '../api/itineraries'
import type { Itinerary, ItineraryDetail } from '../types/itinerary'

export function useItineraries(isLoggedIn: boolean) {
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setItineraries([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchItineraries()
      setItineraries(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load itineraries')
      setItineraries([])
    } finally {
      setLoading(false)
    }
  }, [isLoggedIn])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const create = useCallback(
    async (name: string) => {
      const detail = await createItinerary(name)
      await refresh()
      return detail
    },
    [refresh],
  )

  const addEvent = useCallback(
    async (itineraryId: string, eventId: number) => {
      const detail = await addEventToItinerary(itineraryId, eventId)
      await refresh()
      return detail
    },
    [refresh],
  )

  const removeEvent = useCallback(
    async (itineraryId: string, eventId: number) => {
      const detail = await removeEventFromItinerary(itineraryId, eventId)
      await refresh()
      return detail
    },
    [refresh],
  )

  const remove = useCallback(
    async (itineraryId: string) => {
      await deleteItinerary(itineraryId)
      await refresh()
    },
    [refresh],
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
