import type { Event } from '../types/event'
import { parseEventDateTime, toIsoDate } from './dates'

/** Local calendar day YYYY-MM-DD for the event start, or null if unknown */
export function eventIsoDate(e: Event): string | null {
  const dt = e.datetime?.trim()
  if (!dt) return null
  // Date-only values: already a calendar day (no timezone shift)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dt)) return dt
  const parsed = parseEventDateTime(dt)
  return parsed ? toIsoDate(parsed) : null
}
