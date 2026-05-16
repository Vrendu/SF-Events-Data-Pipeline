export function parseLatLong(latlong?: string | null): [number, number] | null {
  if (!latlong) return null
  const parts = latlong.split(',').map((s) => parseFloat(s.trim()))
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null
  return [parts[1], parts[0]]
}
