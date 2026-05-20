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

export function setFavoriteIds(ids: Set<number>): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    /* ignore */
  }
}

export function toggleFavoriteLocal(id: number): Set<number> {
  const ids = getFavoriteIds()
  if (ids.has(id)) ids.delete(id)
  else ids.add(id)
  setFavoriteIds(ids)
  return ids
}

/** @deprecated Use toggleFavoriteLocal or useFavorites().toggle */
export function toggleFavorite(id: number): Set<number> {
  return toggleFavoriteLocal(id)
}

export function clearFavorites(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
