import type { EventFilters } from '../types/event'

export function parseEventDateTime(datetime?: string | null): Date | null {
  if (!datetime) return null
  const normalized = datetime.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d
}

const WEEKLY_EVENT_DAYS: Record<string, string> = {
  sun: 'Sunday',
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
}

/** dothebay recurring-event URLs look like dothebay.com/events/weekly/sun/some-slug */
export function weeklyEventDay(url?: string | null): string | null {
  if (!url) return null
  const match = url.match(/\/events\/weekly\/(sun|mon|tue|wed|thu|fri|sat)\//i)
  return match ? WEEKLY_EVENT_DAYS[match[1].toLowerCase()] : null
}

export function formatEventDate(
  datetime?: string | null,
  url?: string | null,
  recurrence?: string | null,
): string {
  if (recurrence) return recurrence
  const d = parseEventDateTime(datetime)
  if (!d) {
    const day = weeklyEventDay(url)
    return day ? `Every ${day}` : 'Date TBA'
  }
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatEventTime(datetime?: string | null): string {
  const d = parseEventDateTime(datetime)
  if (!d) return ''
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Combined "when" string for an event: the recurrence label (e.g. "Every
 * Sunday") in place of date + time when the event is recurring, otherwise
 * "date · time". `recurrence` is a generic field any source can set — it
 * isn't dothebay-specific — this is just the one place that honors it.
 */
export function formatEventWhen(
  datetime?: string | null,
  url?: string | null,
  recurrence?: string | null,
): string {
  const date = formatEventDate(datetime, url, recurrence)
  if (recurrence) return date
  const time = formatEventTime(datetime)
  return time ? `${date} · ${time}` : date
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse YYYY-MM-DD as noon local time (avoids UTC midnight off-by-one in displays). */
export function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

export function formatFilterDate(iso: string | null): string {
  if (!iso) return 'Date'
  const d = parseIsoDateLocal(iso)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export type TimeOfDay = 'all' | 'morning' | 'afternoon' | 'evening' | 'night'

export function matchesTimeOfDay(datetime: string | undefined, slot: TimeOfDay): boolean {
  if (slot === 'all') return true
  const d = parseEventDateTime(datetime)
  if (!d) return true
  const h = d.getHours()
  switch (slot) {
    case 'morning':
      return h >= 5 && h < 12
    case 'afternoon':
      return h >= 12 && h < 17
    case 'evening':
      return h >= 17 && h < 22
    case 'night':
      return h >= 22 || h < 5
    default:
      return true
  }
}

export const TIME_OPTIONS: { id: TimeOfDay; label: string }[] = [
  { id: 'all', label: 'Any time' },
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
  { id: 'night', label: 'Night' },
]

/** Default UI filters: events on the user's current local calendar day */
export function defaultEventFilters(): EventFilters {
  return {
    categories: [],
    onDate: toIsoDate(new Date()),
    timeOfDay: 'all',
    recurringOnly: false,
  }
}

/** True "no filters" state — unlike `defaultEventFilters`, doesn't pin a date. */
export function clearedEventFilters(): EventFilters {
  return {
    categories: [],
    onDate: null,
    timeOfDay: 'all',
    recurringOnly: false,
  }
}

/** "Every Sunday" -> "Sunday" (or null if `recurrence` isn't in that shape). */
export function recurrenceWeekday(recurrence?: string | null): string | null {
  if (!recurrence) return null
  const match = recurrence.match(/^Every (\w+)$/i)
  return match ? match[1] : null
}

/** True if a recurring event's weekly pattern falls on the given calendar day (e.g. "Every Sunday" matches any Sunday, not just its stored next-occurrence date). */
export function recurrenceMatchesDate(recurrence: string | null | undefined, isoDate: string): boolean {
  const weekday = recurrenceWeekday(recurrence)
  if (!weekday) return false
  const dayName = parseIsoDateLocal(isoDate).toLocaleDateString('en-US', { weekday: 'long' })
  return dayName.toLowerCase() === weekday.toLowerCase()
}
