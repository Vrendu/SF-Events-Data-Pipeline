const STORAGE_KEY = 'plotted-access-token'

/** Access token for cross-origin API auth (Render: frontend + backend are separate hosts). */
export function getAccessToken(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setAccessToken(token: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, token)
  } catch {
    /* ignore */
  }
}

export function clearAccessToken(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function withAuthHeaders(headers: HeadersInit = {}): HeadersInit {
  const token = getAccessToken()
  if (!token) return headers
  const next = new Headers(headers)
  next.set('Authorization', `Bearer ${token}`)
  return next
}
