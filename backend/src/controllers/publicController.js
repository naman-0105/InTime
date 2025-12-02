import prisma from '../db/prisma.js'
import { generateAvailableSlots } from '../services/slotService.js'
import { isValidEmail } from '../utils/validation.js'

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

export const createBooking = async (req, res, next) => {
  try {
    const { username, eventSlug } = req.params
    const { guestName, guestEmail, startTime, endTime } = req.body

    if (!guestName || !guestEmail || !startTime || !endTime) {
      return res.status(400).json({ error: 'Guest name, email, start time, and end time are required' })
    }

    if (!isValidEmail(guestEmail)) {
      return res.status(400).json({ error: 'Invalid guest email address' })
    }

    const startUtc = new Date(startTime)
    const endUtc = new Date(endTime)

    if (isNaN(startUtc.getTime()) || isNaN(endUtc.getTime())) {
      return res.status(400).json({ error: 'Invalid start time or end time format' })
    }

    if (startUtc >= endUtc) {
      return res.status(400).json({ error: 'Start time must be before end time' })
    }

    const now = new Date()
    if (startUtc <= now) {
      return res.status(400).json({ error: 'Cannot book a slot in the past' })
    }

    const host = await prisma.user.findUnique({
      where: { username: username.toLowerCase().trim() },
      select: {
        id: true,
        name: true,
        email: true,
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
        durationMin: true,
        isActive: true,
      },
    })

    if (!event || !event.isActive) {
      return res.status(404).json({ error: 'Event type not found or is inactive' })
    }

    const durationMinutes = Math.round((endUtc.getTime() - startUtc.getTime()) / (1000 * 60))
    if (durationMinutes !== event.durationMin) {
      return res.status(400).json({ error: `Booking duration must be exactly ${event.durationMin} minutes` })
    }

    const existingBooking = await prisma.booking.findFirst({
      where: {
        hostId: host.id,
        status: 'CONFIRMED',
        startTime: { lt: endUtc },
        endTime: { gt: startUtc },
      },
    })

    if (existingBooking) {
      return res.status(409).json({ error: 'This time slot is no longer available. Please select another slot.' })
    }

    const booking = await prisma.booking.create({
      data: {
        eventTypeId: event.id,
        hostId: host.id,
        guestName: guestName.trim(),
        guestEmail: guestEmail.toLowerCase().trim(),
        startTime: startUtc,
        endTime: endUtc,
        status: 'CONFIRMED',
      },
      include: {
        eventType: {
          select: {
            name: true,
            durationMin: true,
          },
        },
        host: {
          select: {
            name: true,
            email: true,
            timezone: true,
          },
        },
      },
    })

    return res.status(201).json({ booking })
  } catch (error) {
    next(error)
  }
}

export const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        eventType: {
          select: {
            name: true,
            durationMin: true,
            description: true,
          },
        },
        host: {
          select: {
            name: true,
            email: true,
            username: true,
            timezone: true,
          },
        },
      },
    })

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    return res.status(200).json({ booking })
  } catch (error) {
    next(error)
  }
}
