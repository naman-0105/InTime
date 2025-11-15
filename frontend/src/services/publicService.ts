import type { PublicEventResponse } from '../types'

const API_BASE = '/api/public'

export const publicService = {
  async getPublicEvent(username: string, eventSlug: string): Promise<PublicEventResponse> {
    const res = await fetch(`${API_BASE}/${username}/${eventSlug}`)
    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error || 'Failed to load booking page')
    }
    return json
  },
}
