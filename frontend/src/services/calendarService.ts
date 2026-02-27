import type { CalendarStatusResponse } from '../types'

const API_BASE = '/api/calendar'

export const calendarService = {
  async getStatus(): Promise<CalendarStatusResponse> {
    const res = await fetch(`${API_BASE}/google/status`, {
      credentials: 'include',
    })
    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error || 'Failed to get calendar status')
    }
    return json
  },

  async sync(): Promise<{ message: string; result?: unknown }> {
    const res = await fetch(`${API_BASE}/google/sync`, {
      method: 'POST',
      credentials: 'include',
    })
    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error || 'Failed to sync Google Calendar')
    }
    return json
  },

  async disconnect(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/google/disconnect`, {
      method: 'POST',
      credentials: 'include',
    })
    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error || 'Failed to disconnect Google Calendar')
    }
    return json
  },
}
