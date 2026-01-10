import prisma from '../db/prisma.js'

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

export const getEvents = async (req, res, next) => {
  try {
    const events = await prisma.eventType.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    })
    return res.status(200).json({ events })
  } catch (error) {
    next(error)
  }
}

export const getEventById = async (req, res, next) => {
  try {
    const { id } = req.params
    const event = await prisma.eventType.findFirst({
      where: { id, userId: req.user.id },
    })

    if (!event) {
      return res.status(404).json({ error: 'Event type not found' })
    }

    return res.status(200).json({ event })
  } catch (error) {
    next(error)
  }
}

export const createEvent = async (req, res, next) => {
  try {
    const {
      name,
      slug,
      description,
      durationMin,
      isActive,
      minNoticeMin,
      maxNoticeDays,
      bufferBeforeMin,
      bufferAfterMin,
    } = req.body

    if (!name || !durationMin) {
      return res.status(400).json({ error: 'Name and duration are required' })
    }

    const duration = parseInt(durationMin, 10)
    if (isNaN(duration) || duration <= 0) {
      return res.status(400).json({ error: 'Duration must be a positive number of minutes' })
    }

    const eventSlug = slugify(slug || name)
    if (!eventSlug) {
      return res.status(400).json({ error: 'Invalid slug generated' })
    }

    const existingSlug = await prisma.eventType.findUnique({
      where: {
        userId_slug: {
          userId: req.user.id,
          slug: eventSlug,
        },
      },
    })

    if (existingSlug) {
      return res.status(400).json({ error: 'You already have an event with this URL slug' })
    }

    const parsedMinNotice =
      minNoticeMin !== undefined ? Math.max(0, parseInt(minNoticeMin, 10) || 0) : 0
    const parsedMaxNotice =
      maxNoticeDays !== undefined ? Math.max(1, parseInt(maxNoticeDays, 10) || 60) : 60
    const parsedBufferBefore =
      bufferBeforeMin !== undefined ? Math.max(0, parseInt(bufferBeforeMin, 10) || 0) : 0
    const parsedBufferAfter =
      bufferAfterMin !== undefined ? Math.max(0, parseInt(bufferAfterMin, 10) || 0) : 0

    const event = await prisma.eventType.create({
      data: {
        userId: req.user.id,
        name: name.trim(),
        slug: eventSlug,
        description: description ? description.trim() : null,
        durationMin: duration,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        minNoticeMin: parsedMinNotice,
        maxNoticeDays: parsedMaxNotice,
        bufferBeforeMin: parsedBufferBefore,
        bufferAfterMin: parsedBufferAfter,
      },
    })

    return res.status(201).json({ event })
  } catch (error) {
    next(error)
  }
}

export const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params
    const {
      name,
      slug,
      description,
      durationMin,
      isActive,
      minNoticeMin,
      maxNoticeDays,
      bufferBeforeMin,
      bufferAfterMin,
    } = req.body

    const existingEvent = await prisma.eventType.findFirst({
      where: { id, userId: req.user.id },
    })

    if (!existingEvent) {
      return res.status(404).json({ error: 'Event type not found' })
    }

    let updatedSlug = existingEvent.slug
    if (slug || name) {
      const newSlugCandidate = slugify(slug || name)
      if (newSlugCandidate && newSlugCandidate !== existingEvent.slug) {
        const slugConflict = await prisma.eventType.findUnique({
          where: {
            userId_slug: {
              userId: req.user.id,
              slug: newSlugCandidate,
            },
          },
        })
        if (slugConflict && slugConflict.id !== id) {
          return res.status(400).json({ error: 'You already have an event with this URL slug' })
        }
        updatedSlug = newSlugCandidate
      }
    }

    let duration = existingEvent.durationMin
    if (durationMin !== undefined) {
      const parsedDuration = parseInt(durationMin, 10)
      if (isNaN(parsedDuration) || parsedDuration <= 0) {
        return res.status(400).json({ error: 'Duration must be a positive number of minutes' })
      }
      duration = parsedDuration
    }

    const parsedMinNotice =
      minNoticeMin !== undefined
        ? Math.max(0, parseInt(minNoticeMin, 10) || 0)
        : existingEvent.minNoticeMin
    const parsedMaxNotice =
      maxNoticeDays !== undefined
        ? Math.max(1, parseInt(maxNoticeDays, 10) || 60)
        : existingEvent.maxNoticeDays
    const parsedBufferBefore =
      bufferBeforeMin !== undefined
        ? Math.max(0, parseInt(bufferBeforeMin, 10) || 0)
        : existingEvent.bufferBeforeMin
    const parsedBufferAfter =
      bufferAfterMin !== undefined
        ? Math.max(0, parseInt(bufferAfterMin, 10) || 0)
        : existingEvent.bufferAfterMin

    const event = await prisma.eventType.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existingEvent.name,
        slug: updatedSlug,
        description:
          description !== undefined
            ? description
              ? description.trim()
              : null
            : existingEvent.description,
        durationMin: duration,
        isActive: isActive !== undefined ? Boolean(isActive) : existingEvent.isActive,
        minNoticeMin: parsedMinNotice,
        maxNoticeDays: parsedMaxNotice,
        bufferBeforeMin: parsedBufferBefore,
        bufferAfterMin: parsedBufferAfter,
      },
    })

    return res.status(200).json({ event })
  } catch (error) {
    next(error)
  }
}

export const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params

    const existingEvent = await prisma.eventType.findFirst({
      where: { id, userId: req.user.id },
    })

    if (!existingEvent) {
      return res.status(404).json({ error: 'Event type not found' })
    }

    await prisma.eventType.delete({
      where: { id },
    })

    return res.status(200).json({ message: 'Event type deleted successfully' })
  } catch (error) {
    next(error)
  }
}
