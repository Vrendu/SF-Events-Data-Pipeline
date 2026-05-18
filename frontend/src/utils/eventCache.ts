import type { Event } from '../types/event'
import { parseEventDateTime, toIsoDate } from './dates'

/** Calendar day YYYY-MM-DD from event datetime, or null if unknown */
export function eventIsoDate(e: Event): string | null {
  const dt = e.datetime
  if (!dt) return null
  const left = dt.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(left)) return left
  const parsed = parseEventDateTime(dt)
  return parsed ? toIsoDate(parsed) : null
}

export function mergeEventsById(a: Event[], b: Event[]): Event[] {
  const m = new Map<number, Event>()
  for (const e of a) m.set(e.id, e)
  for (const e of b) m.set(e.id, e)
  return [...m.values()].sort((x, y) => {
    const ax = x.datetime ?? ''
    const ay = y.datetime ?? ''
    return ax.localeCompare(ay)
  })
}
