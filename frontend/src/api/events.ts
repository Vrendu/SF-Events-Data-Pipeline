import type { Event } from '../types/event'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'
const READ_KEY = import.meta.env.VITE_READ_API_KEY ?? ''

export interface FetchEventsParams {
  onDate?: string
  startDate?: string
  endDate?: string
  category?: string
  limit?: number
  sort?: string
}

export async function fetchEvents(params: FetchEventsParams = {}): Promise<Event[]> {
  const search = new URLSearchParams()
  if (params.onDate) search.set('on_date', params.onDate)
  if (params.startDate) search.set('start_date', params.startDate)
  if (params.endDate) search.set('end_date', params.endDate)
  if (params.category) search.set('category', params.category)
  search.set('limit', String(params.limit ?? 500))
  search.set('sort', params.sort ?? 'datetime_asc')

  const headers: HeadersInit = {}
  if (READ_KEY) headers['X-API-Key'] = READ_KEY

  const url = `${API_BASE}/events?${search}`
  const res = await fetch(url, { headers })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(detail || `Failed to load events (${res.status})`)
  }
  return res.json()
}
