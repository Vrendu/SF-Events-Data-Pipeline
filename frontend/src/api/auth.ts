import type { User } from '../types/user'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

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

export async function fetchCurrentUser(): Promise<User | null> {
  const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
  if (res.status === 401) return null
  if (!res.ok) throw new Error(await parseAuthError(res))
  return res.json()
}

export async function loginUser(email: string, password: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    ...jsonOpts,
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(await parseAuthError(res))
  return res.json()
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
  return res.json()
}

export async function logoutUser(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    ...jsonOpts,
    method: 'POST',
  })
  if (!res.ok) throw new Error(await parseAuthError(res))
}
