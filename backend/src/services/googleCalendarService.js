import prisma from '../db/prisma.js'
import { localToUTC } from './slotService.js'

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

export const validateGoogleAvailability = async (userId, startTime, endTime) => {
  try {
    const { accessToken, calendarId } = await getValidAccessToken(userId)
    const busySlots = await queryFreeBusy({
      accessToken,
      timeMin: startTime,
      timeMax: endTime,
      calendarId,
    })

    const start = new Date(startTime)
    const end = new Date(endTime)

    const hasConflict = busySlots.some((slot) => start < slot.end && end > slot.start)

    return !hasConflict
  } catch {
    return true
  }
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
    const params = new URLSearchParams()

    if (syncToken) {
      params.set('syncToken', syncToken)
    } else {
      params.set('singleEvents', 'true')
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

export const parseEventToBusySlot = (event, timezone = 'UTC') => {
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
    startUtc = localToUTC(event.start.date, '00:00', timezone)
    endUtc = localToUTC(event.end.date, '00:00', timezone)
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

export const performInitialCalendarSync = async (userId) => {
  const { accessToken, calendarId } = await getValidAccessToken(userId)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  })
  const timezone = user?.timezone || 'UTC'

  const { items, nextSyncToken } = await fetchCalendarEvents({
    accessToken,
    calendarId,
  })

  const now = new Date()
  const minKeepTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const busySlotsMap = new Map()

  for (const item of items) {
    const parsed = parseEventToBusySlot(item, timezone)
    if (!parsed) continue

    if (parsed.isCancelled) {
      busySlotsMap.delete(parsed.googleEventId)
    } else {
      if (parsed.endTime >= minKeepTime) {
        busySlotsMap.set(parsed.googleEventId, {
          userId,
          calendarId,
          googleEventId: parsed.googleEventId,
          startTime: parsed.startTime,
          endTime: parsed.endTime,
        })
      }
    }
  }

  const busySlotsToCreate = Array.from(busySlotsMap.values())

  await prisma.$transaction([
    prisma.externalBusySlot.deleteMany({
      where: { userId, calendarId },
    }),
    prisma.externalBusySlot.createMany({
      data: busySlotsToCreate,
    }),
    prisma.googleCalendarConnection.update({
      where: { userId },
      data: {
        syncToken: nextSyncToken || null,
        lastSyncedAt: new Date(),
      },
    }),
  ])

  return {
    count: busySlotsToCreate.length,
    syncToken: nextSyncToken,
  }
}

export const syncUserCalendar = async (userId) => {
  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { userId },
  })

  if (!connection) {
    const err = new Error('Google Calendar is not connected')
    err.statusCode = 404
    throw err
  }

  if (!connection.syncToken) {
    return await performInitialCalendarSync(userId)
  }

  try {
    const { accessToken, calendarId } = await getValidAccessToken(userId)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    })
    const timezone = user?.timezone || 'UTC'

    const { items, nextSyncToken } = await fetchCalendarEvents({
      accessToken,
      calendarId,
      syncToken: connection.syncToken,
    })

    for (const item of items) {
      const parsed = parseEventToBusySlot(item, timezone)
      if (!parsed) continue

      if (parsed.isCancelled) {
        await prisma.externalBusySlot.deleteMany({
          where: {
            userId,
            calendarId,
            googleEventId: parsed.googleEventId,
          },
        })
      } else {
        await prisma.externalBusySlot.upsert({
          where: {
            userId_calendarId_googleEventId: {
              userId,
              calendarId,
              googleEventId: parsed.googleEventId,
            },
          },
          update: {
            startTime: parsed.startTime,
            endTime: parsed.endTime,
          },
          create: {
            userId,
            calendarId,
            googleEventId: parsed.googleEventId,
            startTime: parsed.startTime,
            endTime: parsed.endTime,
          },
        })
      }
    }

    await prisma.googleCalendarConnection.update({
      where: { userId },
      data: {
        syncToken: nextSyncToken || connection.syncToken,
        lastSyncedAt: new Date(),
      },
    })

    return {
      synced: true,
      itemsCount: items.length,
      syncToken: nextSyncToken,
    }
  } catch (err) {
    if (err.syncTokenInvalid || err.statusCode === 410) {
      return await performInitialCalendarSync(userId)
    }
    throw err
  }
}

export const registerCalendarWatch = async (userId) => {
  const webhookUrl = process.env.GOOGLE_CALENDAR_WEBHOOK_URL
  if (!webhookUrl) {
    return { registered: false, reason: 'GOOGLE_CALENDAR_WEBHOOK_URL not configured' }
  }

  const { accessToken, calendarId, connection } = await getValidAccessToken(userId)

  if (connection.watchChannelId && connection.watchResourceId) {
    await stopCalendarWatch(userId).catch(() => {})
  }

  const channelId = `intime-watch-${userId}-${Date.now()}`

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/watch`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        token: `userId=${userId}`,
      }),
    }
  )

  const data = await res.json()

  if (!res.ok) {
    const err = new Error(data.error?.message || 'Failed to register Google Calendar watch channel')
    err.statusCode = res.status
    throw err
  }

  const expirationDate = data.expiration ? new Date(Number(data.expiration)) : null

  await prisma.googleCalendarConnection.update({
    where: { userId },
    data: {
      watchChannelId: data.id,
      watchResourceId: data.resourceId,
      watchExpiration: expirationDate,
    },
  })

  return {
    registered: true,
    channelId: data.id,
    resourceId: data.resourceId,
    expiration: expirationDate,
  }
}

export const stopCalendarWatch = async (userId) => {
  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { userId },
  })

  if (!connection || !connection.watchChannelId || !connection.watchResourceId) {
    return { stopped: true }
  }

  try {
    const { accessToken } = await getValidAccessToken(userId)

    await fetch('https://www.googleapis.com/calendar/v3/channels/stop', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: connection.watchChannelId,
        resourceId: connection.watchResourceId,
      }),
    })
  } catch {
  }

  await prisma.googleCalendarConnection.update({
    where: { userId },
    data: {
      watchChannelId: null,
      watchResourceId: null,
      watchExpiration: null,
    },
  })

  return { stopped: true }
}

export const renewExpiringGoogleCalendarWatches = async () => {
  const now = new Date()
  const renewalThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const expiringConnections = await prisma.googleCalendarConnection.findMany({
    where: {
      watchExpiration: {
        not: null,
        lte: renewalThreshold,
      },
    },
    select: {
      id: true,
      userId: true,
      watchChannelId: true,
      watchExpiration: true,
    },
  })

  const results = []

  for (const connection of expiringConnections) {
    try {
      const renewalResult = await registerCalendarWatch(connection.userId)
      results.push({ userId: connection.userId, success: true, result: renewalResult })
    } catch (error) {
      console.error(`Failed to renew watch for user ${connection.userId}:`, error?.message)
      results.push({ userId: connection.userId, success: false, error: error?.message })
    }
  }

  return results
}

let renewalIntervalTimer = null

export const startWatchRenewalInterval = (intervalMs = 4 * 60 * 60 * 1000) => {
  if (renewalIntervalTimer) {
    return renewalIntervalTimer
  }

  renewalIntervalTimer = setInterval(() => {
    renewExpiringGoogleCalendarWatches().catch((err) => {
      console.error('Error running renewExpiringGoogleCalendarWatches:', err?.message)
    })
  }, intervalMs)

  return renewalIntervalTimer
}

export const stopWatchRenewalInterval = () => {
  if (renewalIntervalTimer) {
    clearInterval(renewalIntervalTimer)
    renewalIntervalTimer = null
  }
}


