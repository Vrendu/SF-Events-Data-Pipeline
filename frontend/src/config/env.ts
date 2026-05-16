/** Mapbox public token — copy `MAPBOX_API_KEY` from backend/.env into VITE_MAPBOX_ACCESS_TOKEN in frontend/.env */
export function getMapboxAccessToken(): string {
  const raw =
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? import.meta.env.VITE_MAPBOX_TOKEN ?? import.meta.env.VITE_MAPBOX_API_KEY ?? ''
  return String(raw).replace(/^["']|["']$/g, '').trim()
}
