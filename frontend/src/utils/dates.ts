export function parseEventDateTime(datetime?: string | null): Date | null {
  if (!datetime) return null
  const normalized = datetime.replace(/([+-]\d{4})$/, '$1:00')
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatEventDate(datetime?: string | null): string {
  const d = parseEventDateTime(datetime)
  if (!d) return 'Date TBA'
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

export function formatFilterDate(iso: string | null): string {
  if (!iso) return 'Date'
  const d = new Date(iso + 'T12:00:00')
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
