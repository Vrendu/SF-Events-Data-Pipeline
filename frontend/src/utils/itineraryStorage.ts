import type { Itinerary } from '../types/itinerary'

const STORAGE_KEY = 'plotted-itineraries'

interface StoredItineraries {
  userId: string
  itineraries: Itinerary[]
  savedAt: string
}

function isItinerary(value: unknown): value is Itinerary {
  if (!value || typeof value !== 'object') return false
  const o = value as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.eventCount === 'number' &&
    typeof o.createdAt === 'string' &&
    typeof o.updatedAt === 'string'
  )
}

export function readItinerariesCache(userId: string): Itinerary[] | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredItineraries
    if (parsed.userId !== userId || !Array.isArray(parsed.itineraries)) return null
    if (!parsed.itineraries.every(isItinerary)) return null
    return parsed.itineraries
  } catch {
    return null
  }
}

export function writeItinerariesCache(userId: string, itineraries: Itinerary[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    const payload: StoredItineraries = {
      userId,
      itineraries,
      savedAt: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* quota / private mode */
  }
}

export function clearItinerariesCache(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
