import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addFavorite,
  fetchFavoriteIds,
  fetchFavorites,
  removeFavorite,
  syncFavorites,
} from '../api/favorites'
import type { Event } from '../types/event'
import {
  clearFavorites,
  getFavoriteIds,
  setFavoriteIds,
  toggleFavoriteLocal,
} from '../utils/favorites'

export function useFavorites(userId: string | null) {
  const [favoriteIds, setFavoriteIdsState] = useState<Set<number>>(() =>
    userId ? new Set() : getFavoriteIds(),
  )
  const [favoriteEvents, setFavoriteEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hydratedForUser = useRef<string | null>(null)

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!userId) return
    const silent = options?.silent ?? false
    if (!silent) setLoading(true)
    setError(null)
    try {
      const [events, ids] = await Promise.all([fetchFavorites(), fetchFavoriteIds()])
      setFavoriteEvents(events)
      setFavoriteIdsState(new Set(ids))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load favorites')
      setFavoriteEvents([])
      setFavoriteIdsState(new Set())
    } finally {
      if (!silent) setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setFavoriteIdsState(getFavoriteIds())
      setFavoriteEvents([])
      setLoading(false)
      setError(null)
      hydratedForUser.current = null
      return
    }

    if (hydratedForUser.current === userId) return
    hydratedForUser.current = userId

    void (async () => {
      const localIds = [...getFavoriteIds()]
      try {
        if (localIds.length > 0) {
          await syncFavorites(localIds)
          clearFavorites()
        }
        await refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load favorites')
        setFavoriteIdsState(new Set(localIds))
      }
    })()
  }, [userId, refresh])

  const toggle = useCallback(
    async (eventId: number) => {
      if (!userId) {
        const next = toggleFavoriteLocal(eventId)
        setFavoriteIdsState(next)
        return
      }

      const isFavorite = favoriteIds.has(eventId)
      setError(null)
      try {
        if (isFavorite) {
          await removeFavorite(eventId)
        } else {
          await addFavorite(eventId)
        }
        await refresh({ silent: true })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update favorite')
      }
    },
    [userId, favoriteIds, refresh],
  )

  const remove = useCallback(
    async (eventId: number) => {
      if (!userId) {
        const next = new Set(favoriteIds)
        next.delete(eventId)
        setFavoriteIds(next)
        setFavoriteIdsState(next)
        setFavoriteEvents((prev) => prev.filter((e) => e.id !== eventId))
        return
      }
      setError(null)
      try {
        await removeFavorite(eventId)
        await refresh({ silent: true })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to remove favorite')
      }
    },
    [userId, favoriteIds, refresh],
  )

  const clear = useCallback(() => {
    clearFavorites()
    setFavoriteIdsState(new Set())
    setFavoriteEvents([])
  }, [])

  return {
    favoriteIds,
    favoriteEvents,
    loading,
    error,
    refresh,
    toggle,
    remove,
    clear,
    isFavorite: (eventId: number) => favoriteIds.has(eventId),
  }
}
