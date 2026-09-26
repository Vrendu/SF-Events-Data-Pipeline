export interface EventImage {
  url: string
  ratio?: string
  width?: number
  height?: number
  fallback?: boolean
}

/** Mirrors the backend's `Event` model exactly — one shape, on both ends. */
export interface Event {
  id: number
  title: string
  datetime?: string
  venue?: string
  location?: string
  latlong?: string
  url?: string
  description?: string
  categories?: string[]
  source?: string
  images?: EventImage[]
  recurrence?: string
}

export type EventCategory =
  | 'music'
  | 'comedy'
  | 'sports'
  | 'festival'
  | 'culture'
  | 'active'
  | 'nightlife'

export const EVENT_CATEGORIES: { id: EventCategory; label: string }[] = [
  { id: 'music', label: 'Music' },
  { id: 'comedy', label: 'Comedy' },
  { id: 'sports', label: 'Sports' },
  { id: 'festival', label: 'Festival' },
  { id: 'culture', label: 'Culture' },
  { id: 'active', label: 'Active' },
  { id: 'nightlife', label: 'Nightlife' },
]

export interface EventFilters {
  categories: EventCategory[]
  onDate: string | null
  timeOfDay: 'all' | 'morning' | 'afternoon' | 'evening' | 'night'
}
