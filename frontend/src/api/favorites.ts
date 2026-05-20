import type { Event } from '../types/event'
import { authenticatedFetchInit } from './auth'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: string }
    if (typeof body.detail === 'string') return body.detail
  } catch {
    /* ignore */
  }
  return `Request failed (${res.status})`
}

const jsonOpts = (): RequestInit =>
  authenticatedFetchInit({ headers: { 'Content-Type': 'application/json' } })

export async function fetchFavorites(): Promise<Event[]> {
  const res = await fetch(`${API_BASE}/favorites`, authenticatedFetchInit())
  if (res.status === 401) throw new Error('Sign in to sync favorites')
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function fetchFavoriteIds(): Promise<number[]> {
  const res = await fetch(`${API_BASE}/favorites/ids`, authenticatedFetchInit())
  if (res.status === 401) throw new Error('Sign in to sync favorites')
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { event_ids: number[] }
  return body.event_ids ?? []
}

export async function addFavorite(eventId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/favorites/${eventId}`, {
    ...jsonOpts(),
    method: 'POST',
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function removeFavorite(eventId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/favorites/${eventId}`, {
    ...jsonOpts(),
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function syncFavorites(eventIds: number[]): Promise<void> {
  const res = await fetch(`${API_BASE}/favorites/sync`, {
    ...jsonOpts(),
    method: 'PUT',
    body: JSON.stringify({ event_ids: eventIds }),
  })
  if (!res.ok) throw new Error(await parseError(res))
}
