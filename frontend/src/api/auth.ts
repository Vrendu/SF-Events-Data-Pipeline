import type { User } from '../types/user'
import {
  clearAccessToken,
  setAccessToken,
  withAuthHeaders,
} from '../utils/authSession'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

type AuthSession = User & { accessToken?: string | null }

function persistSession(body: AuthSession): User {
  if (body.accessToken) setAccessToken(body.accessToken)
  const { accessToken: _t, ...user } = body
  return user
}

async function parseAuthError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: string | { msg?: string }[] }
    if (typeof body.detail === 'string') return body.detail
    if (Array.isArray(body.detail) && body.detail[0]?.msg) return body.detail[0].msg
  } catch {
    /* ignore */
  }
  return `Request failed (${res.status})`
}

const jsonOpts: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
}

function authJsonOpts(): RequestInit {
  return {
    credentials: 'include',
    headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
  }
}

export async function fetchCurrentUser(): Promise<User | null> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    credentials: 'include',
    headers: withAuthHeaders(),
  })
  if (res.status === 401) {
    clearAccessToken()
    return null
  }
  if (!res.ok) throw new Error(await parseAuthError(res))
  const body = (await res.json()) as AuthSession
  return persistSession(body)
}

export async function loginUser(email: string, password: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    ...jsonOpts,
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(await parseAuthError(res))
  const body = (await res.json()) as AuthSession
  return persistSession(body)
}

export async function registerUser(
  email: string,
  password: string,
  displayName?: string,
): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    ...jsonOpts,
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      display_name: displayName || undefined,
    }),
  })
  if (!res.ok) throw new Error(await parseAuthError(res))
  const body = (await res.json()) as AuthSession
  return persistSession(body)
}

export async function logoutUser(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    ...authJsonOpts(),
    method: 'POST',
  })
  clearAccessToken()
  if (!res.ok) throw new Error(await parseAuthError(res))
}

/** Headers for authenticated API calls (itineraries, favorites). */
export function authenticatedFetchInit(init: RequestInit = {}): RequestInit {
  return {
    ...init,
    credentials: 'include',
    headers: withAuthHeaders(init.headers),
  }
}
