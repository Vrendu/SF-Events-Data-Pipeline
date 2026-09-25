export function parseLatLong(latlong?: string | null): [number, number] | null {
  if (!latlong) return null
  const parts = latlong.split(',').map((s) => parseFloat(s.trim()))
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null
  return [parts[1], parts[0]]
}

/** The only cities this app covers — used both to scope what's fetched and to bound the map. */
export const MAP_CITIES = ['San Francisco', 'Oakland', 'Alameda', 'Berkeley'] as const

/** [[west, south], [east, north]] — loosely fitted around the four cities above, with margin. */
export const MAP_BOUNDS: [[number, number], [number, number]] = [
  [-122.58, 37.65],
  [-122.1, 37.93],
]
