import type { Event } from '../types/event'
import { toIsoDate } from './dates'
import { eventIsoDate } from './eventCache'

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

/** Drops events whose calendar day has already passed; keeps undated events. */
function dropPastEvents(events: Event[]): Event[] {
  const today = toIsoDate(new Date())
  return events.filter((e) => {
    const d = eventIsoDate(e)
    return d === null || d >= today
  })
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
    const events = dropPastEvents(parsed.events)
    if (events.length !== parsed.events.length) {
      writeEventsCache({ events, fetchedOn: parsed.fetchedOn })
    }
    return { events, fetchedOn: parsed.fetchedOn }
  } catch {
    return null
  }
}

export function writeEventsCache(cache: StoredEventsCache): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...cache, events: dropPastEvents(cache.events) }),
    )
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
