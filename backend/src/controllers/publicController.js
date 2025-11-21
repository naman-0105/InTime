import prisma from '../db/prisma.js'
import { generateAvailableSlots } from '../services/slotService.js'

export const getPublicEvent = async (req, res, next) => {
  try {
    const { username, eventSlug } = req.params

    if (!username || !eventSlug) {
      return res.status(400).json({ error: 'Username and event slug are required' })
    }

    const host = await prisma.user.findUnique({
      where: { username: username.toLowerCase().trim() },
      select: {
        id: true,
        name: true,
        username: true,
        timezone: true,
      },
    })

    if (!host) {
      return res.status(404).json({ error: 'Host user not found' })
    }

    const event = await prisma.eventType.findUnique({
      where: {
        userId_slug: {
          userId: host.id,
          slug: eventSlug.toLowerCase().trim(),
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        durationMin: true,
        isActive: true,
      },
    })

    if (!event || !event.isActive) {
      return res.status(404).json({ error: 'Event type not found or is currently inactive' })
    }

    return res.status(200).json({
      host: {
        name: host.name,
        username: host.username,
        timezone: host.timezone,
      },
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        description: event.description,
        durationMin: event.durationMin,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getPublicEventSlots = async (req, res, next) => {
  try {
    const { username, eventSlug } = req.params
    const { date } = req.query

    if (!username || !eventSlug || !date) {
      return res.status(400).json({ error: 'Username, eventSlug, and date query parameter are required' })
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/
    if (!datePattern.test(date)) {
      return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' })
    }

    const host = await prisma.user.findUnique({
      where: { username: username.toLowerCase().trim() },
      select: {
        id: true,
        name: true,
        username: true,
        timezone: true,
      },
    })

    if (!host) {
      return res.status(404).json({ error: 'Host user not found' })
    }

    const event = await prisma.eventType.findUnique({
      where: {
        userId_slug: {
          userId: host.id,
          slug: eventSlug.toLowerCase().trim(),
        },
      },
      select: {
        id: true,
        durationMin: true,
        isActive: true,
      },
    })

    if (!event || !event.isActive) {
      return res.status(404).json({ error: 'Event type not found or is inactive' })
    }

    const slots = await generateAvailableSlots({
      hostId: host.id,
      timezone: host.timezone,
      durationMin: event.durationMin,
      dateStr: date,
    })

    return res.status(200).json({
      date,
      timezone: host.timezone,
      slots,
    })
  } catch (error) {
    next(error)
  }
}
