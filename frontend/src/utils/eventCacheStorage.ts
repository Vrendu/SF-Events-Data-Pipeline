import type { Event } from '../types/event'

// v2: scoped to SF/Oakland/Alameda/Berkeley only — bumped so any older cache
// holding events from every city isn't mistaken for the new, narrower one.
const STORAGE_KEY = 'plotted-events-cache-v2'

export interface StoredEventsCache {
  events: Event[]
  /** Calendar day (YYYY-MM-DD) every event was fetched on. */
  fetchedOn: string
}

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

export function readEventsCache(): StoredEventsCache | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredEventsCache
    if (!Array.isArray(parsed.events) || !isIsoDate(parsed.fetchedOn)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writeEventsCache(cache: StoredEventsCache): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch {
    /* quota / private mode */
  }
}

export function clearEventsCache(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
