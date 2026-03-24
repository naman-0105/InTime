import jwt from 'jsonwebtoken'
import prisma from '../db/prisma.js'
import {
  performInitialCalendarSync,
  syncUserCalendar,
  registerCalendarWatch,
  stopCalendarWatch,
} from '../services/googleCalendarService.js'
import { enqueueCalendarSync } from '../queues/calendarSyncQueue.js'

export const initiateGoogleCalendarAuth = (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'

  if (!clientId) {
    return res.redirect(`${clientUrl}/dashboard?error=google_config_missing`)
  }

  const redirectUri =
    process.env.GOOGLE_CALENDAR_CALLBACK_URL ||
    `${req.protocol}://${req.get('host')}/api/calendar/google/callback`

  const state = jwt.sign(
    { userId: req.user.id, purpose: 'calendar_connect' },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '15m' }
  )

  const scope = encodeURIComponent(
    'openid email profile https://www.googleapis.com/auth/calendar.events.readonly'
  )

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${encodeURIComponent(
    state
  )}`

  return res.redirect(googleAuthUrl)
}

export const handleGoogleCalendarCallback = async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'

  try {
    const { code, state, error } = req.query

    if (error || !code || !state) {
      return res.redirect(`${clientUrl}/dashboard?error=google_calendar_failed`)
    }

    let decoded
    try {
      decoded = jwt.verify(String(state), process.env.JWT_SECRET || 'secret')
    } catch {
      return res.redirect(`${clientUrl}/dashboard?error=invalid_state`)
    }

    if (!decoded || decoded.purpose !== 'calendar_connect' || !decoded.userId) {
      return res.redirect(`${clientUrl}/dashboard?error=invalid_state`)
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri =
      process.env.GOOGLE_CALENDAR_CALLBACK_URL ||
      `${req.protocol}://${req.get('host')}/api/calendar/google/callback`

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId || '',
        client_secret: clientSecret || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) {
      return res.redirect(`${clientUrl}/dashboard?error=google_calendar_token_failed`)
    }

    const tokenExpiry = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : new Date(Date.now() + 3600 * 1000)

    await prisma.googleCalendarConnection.upsert({
      where: { userId: decoded.userId },
      update: {
        accessToken: tokenData.access_token,
        ...(tokenData.refresh_token ? { refreshToken: tokenData.refresh_token } : {}),
        tokenExpiry,
        calendarId: 'primary',
      },
      create: {
        userId: decoded.userId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        tokenExpiry,
        calendarId: 'primary',
      },
    })

    try {
      await performInitialCalendarSync(decoded.userId)
    } catch (syncErr) {
      console.error('Initial Google Calendar sync failed:', syncErr?.message)
    }

    registerCalendarWatch(decoded.userId).catch(() => {})

    return res.redirect(`${clientUrl}/dashboard?calendar=connected`)
  } catch {
    return res.redirect(`${clientUrl}/dashboard?error=google_calendar_server_error`)
  }
}

export const getGoogleCalendarStatus = async (req, res, next) => {
  try {
    const connection = await prisma.googleCalendarConnection.findUnique({
      where: { userId: req.user.id },
      select: {
        id: true,
        calendarId: true,
        lastSyncedAt: true,
        watchExpiration: true,
        createdAt: true,
      },
    })

    const busySlotsCount = connection
      ? await prisma.externalBusySlot.count({
          where: { userId: req.user.id },
        })
      : 0

    return res.status(200).json({
      connected: Boolean(connection),
      calendarId: connection?.calendarId || null,
      lastSyncedAt: connection?.lastSyncedAt || null,
      watchExpiration: connection?.watchExpiration || null,
      busySlotsCount,
    })
  } catch (error) {
    next(error)
  }
}

export const syncGoogleCalendar = async (req, res, next) => {
  try {
    const result = await syncUserCalendar(req.user.id)
    return res.status(200).json({
      message: 'Google Calendar synchronized successfully',
      result,
    })
  } catch (error) {
    next(error)
  }
}

export const disconnectGoogleCalendar = async (req, res, next) => {
  try {
    await stopCalendarWatch(req.user.id).catch(() => {})

    await prisma.$transaction([
      prisma.googleCalendarConnection.deleteMany({
        where: { userId: req.user.id },
      }),
      prisma.externalBusySlot.deleteMany({
        where: { userId: req.user.id },
      }),
    ])

    return res.status(200).json({
      message: 'Google Calendar disconnected successfully',
    })
  } catch (error) {
    next(error)
  }
}

export const handleGoogleCalendarWebhook = async (req, res) => {
  const channelId = req.headers['x-goog-channel-id']
  const resourceState = req.headers['x-goog-resource-state']
  const channelToken = req.headers['x-goog-channel-token']

  res.status(200).send('OK')

  if (resourceState === 'sync' || !channelId) {
    return
  }

  try {
    let connection = await prisma.googleCalendarConnection.findFirst({
      where: { watchChannelId: channelId },
    })

    if (!connection && channelToken && channelToken.startsWith('userId=')) {
      const tokenUserId = channelToken.split('=')[1]
      connection = await prisma.googleCalendarConnection.findUnique({
        where: { userId: tokenUserId },
      })
    }

    if (connection) {
      await enqueueCalendarSync(connection.userId)
    }
  } catch {
  }
}

export const renewGoogleCalendarWatch = async (req, res, next) => {
  try {
    const result = await registerCalendarWatch(req.user.id)
    return res.status(200).json({
      message: 'Watch registration updated',
      result,
    })
  } catch (error) {
    next(error)
  }
}

