const STORAGE_KEY = 'plotted-favorites'

export function getFavoriteIds(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const ids = JSON.parse(raw) as number[]
    return new Set(ids)
  } catch {
    return new Set()
  }
}

export function toggleFavorite(id: number): Set<number> {
  const ids = getFavoriteIds()
  if (ids.has(id)) ids.delete(id)
  else ids.add(id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  return ids
}
