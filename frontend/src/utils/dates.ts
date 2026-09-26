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
  }
}

/** True "no filters" state — unlike `defaultEventFilters`, doesn't pin a date. */
export function clearedEventFilters(): EventFilters {
  return {
    categories: [],
    onDate: null,
    timeOfDay: 'all',
  }
}
