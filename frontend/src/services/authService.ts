import type { AuthResponse, User } from '../types'

const API_BASE = '/api/auth'

export const authService = {
  async register(data: {
    name: string
    email: string
    username: string
    password: string
    timezone?: string
  }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error || 'Failed to register')
    }
    return json
  },

  async login(data: { emailOrUsername: string; password: string }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error || 'Failed to login')
    }
    return json
  },

  async logout(): Promise<void> {
    const res = await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error || 'Failed to logout')
    }
  },

  async getMe(): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/me`, {
      credentials: 'include',
    })
    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error || 'Failed to get current user')
    }
    return json
  },
}
