import prisma from '../db/prisma.js'

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
