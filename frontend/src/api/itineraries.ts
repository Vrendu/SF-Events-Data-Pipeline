import type { Itinerary, ItineraryDetail } from '../types/itinerary'

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

const jsonOpts: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
}

export async function fetchItineraries(forEventId?: number): Promise<Itinerary[]> {
  const q = forEventId != null ? `?for_event_id=${forEventId}` : ''
  const res = await fetch(`${API_BASE}/itineraries${q}`, { credentials: 'include' })
  if (res.status === 401) throw new Error('Sign in to manage itineraries')
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function fetchItinerary(id: string): Promise<ItineraryDetail> {
  const res = await fetch(`${API_BASE}/itineraries/${id}`, { credentials: 'include' })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function createItinerary(name: string): Promise<ItineraryDetail> {
  const res = await fetch(`${API_BASE}/itineraries`, {
    ...jsonOpts,
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function addEventToItinerary(
  itineraryId: string,
  eventId: number,
): Promise<ItineraryDetail> {
  const res = await fetch(`${API_BASE}/itineraries/${itineraryId}/events`, {
    ...jsonOpts,
    method: 'POST',
    body: JSON.stringify({ event_id: eventId }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function removeEventFromItinerary(
  itineraryId: string,
  eventId: number,
): Promise<ItineraryDetail> {
  const res = await fetch(`${API_BASE}/itineraries/${itineraryId}/events/${eventId}`, {
    ...jsonOpts,
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function deleteItinerary(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/itineraries/${id}`, {
    ...jsonOpts,
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await parseError(res))
}
