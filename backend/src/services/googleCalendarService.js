import prisma from '../db/prisma.js'

export const getValidAccessToken = async (userId) => {
  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { userId },
  })

  if (!connection) {
    const err = new Error('Google Calendar is not connected')
    err.statusCode = 404
    throw err
  }

  const now = new Date()
  const expiryBuffer = 5 * 60 * 1000
  const isExpired =
    connection.tokenExpiry &&
    new Date(connection.tokenExpiry).getTime() - expiryBuffer <= now.getTime()

  if (!isExpired && connection.accessToken) {
    return {
      accessToken: connection.accessToken,
      calendarId: connection.calendarId || 'primary',
      connection,
    }
  }

  if (!connection.refreshToken) {
    const err = new Error('Google Calendar refresh token missing. Please reconnect.')
    err.statusCode = 401
    throw err
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId || '',
      client_secret: clientSecret || '',
      refresh_token: connection.refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const data = await res.json()

  if (!res.ok || !data.access_token) {
    const err = new Error(data.error_description || 'Failed to refresh Google access token')
    err.statusCode = res.status === 400 || res.status === 401 ? 401 : 500
    throw err
  }

  const newExpiry = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000)
    : new Date(Date.now() + 3600 * 1000)

  const updatedConnection = await prisma.googleCalendarConnection.update({
    where: { userId },
    data: {
      accessToken: data.access_token,
      tokenExpiry: newExpiry,
    },
  })

  return {
    accessToken: updatedConnection.accessToken,
    calendarId: updatedConnection.calendarId || 'primary',
    connection: updatedConnection,
  }
}

export const queryFreeBusy = async ({
  accessToken,
  timeMin,
  timeMax,
  calendarId = 'primary',
}) => {
  const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin: new Date(timeMin).toISOString(),
      timeMax: new Date(timeMax).toISOString(),
      items: [{ id: calendarId }],
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    const err = new Error(data.error?.message || 'Failed to query Google Calendar FreeBusy')
    err.statusCode = res.status
    throw err
  }

  const calendarData = data.calendars?.[calendarId]
  if (!calendarData || !Array.isArray(calendarData.busy)) {
    return []
  }

  return calendarData.busy.map((b) => ({
    start: new Date(b.start),
    end: new Date(b.end),
  }))
}

export const fetchCalendarEvents = async ({
  accessToken,
  calendarId = 'primary',
  timeMin,
  timeMax,
  syncToken,
}) => {
  let allItems = []
  let pageToken = null
  let nextSyncToken = null

  do {
    const params = new URLSearchParams({
      singleEvents: 'true',
    })

    if (syncToken) {
      params.set('syncToken', syncToken)
    } else {
      if (timeMin) params.set('timeMin', new Date(timeMin).toISOString())
      if (timeMax) params.set('timeMax', new Date(timeMax).toISOString())
      params.set('maxResults', '2500')
    }

    if (pageToken) {
      params.set('pageToken', pageToken)
    }

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events?${params.toString()}`

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (res.status === 410) {
      const err = new Error('Sync token is invalid or expired')
      err.statusCode = 410
      err.syncTokenInvalid = true
      throw err
    }

    const data = await res.json()

    if (!res.ok) {
      const err = new Error(data.error?.message || 'Failed to fetch Google Calendar events')
      err.statusCode = res.status
      throw err
    }

    if (Array.isArray(data.items)) {
      allItems = allItems.concat(data.items)
    }

    pageToken = data.nextPageToken || null
    nextSyncToken = data.nextSyncToken || null
  } while (pageToken)

  return {
    items: allItems,
    nextSyncToken,
  }
}

export const parseEventToBusySlot = (event) => {
  if (!event || !event.id) {
    return null
  }

  if (event.status === 'cancelled' || event.transparency === 'transparent') {
    return {
      isCancelled: true,
      googleEventId: event.id,
    }
  }

  let startUtc = null
  let endUtc = null

  if (event.start?.dateTime && event.end?.dateTime) {
    startUtc = new Date(event.start.dateTime)
    endUtc = new Date(event.end.dateTime)
  } else if (event.start?.date && event.end?.date) {
    startUtc = new Date(`${event.start.date}T00:00:00.000Z`)
    endUtc = new Date(`${event.end.date}T00:00:00.000Z`)
  }

  if (!startUtc || !endUtc || isNaN(startUtc.getTime()) || isNaN(endUtc.getTime())) {
    return null
  }

  return {
    isCancelled: false,
    googleEventId: event.id,
    startTime: startUtc,
    endTime: endUtc,
  }
}
