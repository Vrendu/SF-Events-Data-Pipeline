import type { Event } from '../types/event'

const STORAGE_KEY = 'plotted-events-cache'

export interface StoredEventsCache {
  events: Event[]
  loadedStart: string
  loadedEnd: string
  savedAt: string
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
    if (
      !Array.isArray(parsed.events) ||
      !isIsoDate(parsed.loadedStart) ||
      !isIsoDate(parsed.loadedEnd)
    ) {
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
