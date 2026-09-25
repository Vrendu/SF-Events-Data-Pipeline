import type { EventCategory, EventFilters } from '../types/event'
import { EVENT_CATEGORIES } from '../types/event'
import type { TimeOfDay } from './dates'
import { defaultEventFilters, toIsoDate } from './dates'

const STORAGE_KEY = 'plotted-event-filters'

const CATEGORY_IDS = new Set<EventCategory>(EVENT_CATEGORIES.map((c) => c.id))

const TIME_SLOTS: TimeOfDay[] = ['all', 'morning', 'afternoon', 'evening', 'night']

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function parseStored(raw: string): EventFilters {
  const defaults = defaultEventFilters()
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return defaults
  }
  if (!parsed || typeof parsed !== 'object') return defaults
  const rec = parsed as Record<string, unknown>

  let categories: EventCategory[] = defaults.categories
  if (Array.isArray(rec.categories)) {
    categories = rec.categories.filter(
      (c): c is EventCategory => typeof c === 'string' && CATEGORY_IDS.has(c as EventCategory),
    )
  }

  let onDate: string | null = defaults.onDate
  if (rec.onDate === null) onDate = null
  else if (typeof rec.onDate === 'string' && isIsoDate(rec.onDate)) onDate = rec.onDate

  let timeOfDay: TimeOfDay = defaults.timeOfDay
  if (typeof rec.timeOfDay === 'string' && TIME_SLOTS.includes(rec.timeOfDay as TimeOfDay)) {
    timeOfDay = rec.timeOfDay as TimeOfDay
  }

  const savedAt = typeof rec.savedAt === 'string' && isIsoDate(rec.savedAt) ? rec.savedAt : null

  return normalizeOnDate({ categories, onDate, timeOfDay }, savedAt)
}

/**
 * A stored `onDate` only reflects the user's intent for the day it was saved
 * on — an explicit "browse next Friday" pick they're still looking at today,
 * say. Once a new calendar day rolls around (or we can't tell when it was
 * saved, e.g. storage from before `savedAt` existed) it's a stale leftover
 * — whether it lands in the past or the future — so snap back to today.
 */
function normalizeOnDate(filters: EventFilters, savedAt: string | null): EventFilters {
  if (filters.onDate == null) return filters
  const today = toIsoDate(new Date())
  if (savedAt !== today) {
    return { ...filters, onDate: today }
  }
  return filters
}

/** Hydrate filters from localStorage, or defaults if missing / invalid */
export function readStoredFilters(): EventFilters {
  if (typeof localStorage === 'undefined') return defaultEventFilters()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultEventFilters()
    return parseStored(raw)
  } catch {
    return defaultEventFilters()
  }
}

export function writeStoredFilters(filters: EventFilters): void {
  if (typeof localStorage === 'undefined') return
  try {
    const savedAt = toIsoDate(new Date())
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...filters, savedAt }))
  } catch {
    /* quota / private mode */
  }
}
