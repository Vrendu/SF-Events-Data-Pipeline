import type { Event } from './event'

export interface Itinerary {
  id: string
  name: string
  eventCount: number
  createdAt: string
  updatedAt: string
  hasEvent?: boolean
}

export interface ItineraryDetail extends Itinerary {
  events: Event[]
}
