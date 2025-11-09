import type {
  AvailabilityRule,
  AvailabilityResponse,
  AvailabilityOverride,
  OverridesResponse,
  OverrideResponse,
} from '../types'

const API_BASE = '/api/availability'

export const availabilityService = {
  async getAvailability(): Promise<AvailabilityRule[]> {
    const res = await fetch(API_BASE, {
      credentials: 'include',
    })
    const json: AvailabilityResponse = await res.json()
    if (!res.ok) {
      throw new Error((json as unknown as { error: string }).error || 'Failed to fetch availability rules')
    }
    return json.rules
  },

  async setAvailability(
    rules: Array<{ dayOfWeek: number; startTime: string; endTime: string }>
  ): Promise<AvailabilityRule[]> {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ rules }),
    })
    const json: AvailabilityResponse = await res.json()
    if (!res.ok) {
      throw new Error((json as unknown as { error: string }).error || 'Failed to update availability')
    }
    return json.rules
  },

  async deleteRule(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error || 'Failed to delete availability rule')
    }
  },

  async getOverrides(): Promise<AvailabilityOverride[]> {
    const res = await fetch(`${API_BASE}/overrides`, {
      credentials: 'include',
    })
    const json: OverridesResponse = await res.json()
    if (!res.ok) {
      throw new Error((json as unknown as { error: string }).error || 'Failed to fetch overrides')
    }
    return json.overrides
  },

  async setOverride(data: {
    date: string
    isAvailable: boolean
    startTime?: string
    endTime?: string
  }): Promise<AvailabilityOverride> {
    const res = await fetch(`${API_BASE}/overrides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    const json: OverrideResponse = await res.json()
    if (!res.ok) {
      throw new Error((json as unknown as { error: string }).error || 'Failed to set override')
    }
    return json.override
  },

  async deleteOverride(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/overrides/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error || 'Failed to delete override')
    }
  },
}
