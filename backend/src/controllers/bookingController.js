import prisma from '../db/prisma.js'

export const getBookings = async (req, res, next) => {
  try {
    const { status, type } = req.query
    const now = new Date()

    const where = {
      hostId: req.user.id,
    }

    if (status) {
      where.status = status
    }

    if (type === 'upcoming') {
      where.startTime = { gte: now }
      where.status = where.status || 'CONFIRMED'
    } else if (type === 'past') {
      where.endTime = { lt: now }
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        eventType: {
          select: {
            id: true,
            name: true,
            slug: true,
            durationMin: true,
          },
        },
      },
      orderBy: {
        startTime: type === 'past' ? 'desc' : 'asc',
      },
    })

    return res.status(200).json({ bookings })
  } catch (error) {
    next(error)
  }
}

export const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params

    const booking = await prisma.booking.findFirst({
      where: {
        id,
        hostId: req.user.id,
      },
      include: {
        eventType: {
          select: {
            id: true,
            name: true,
            slug: true,
            durationMin: true,
            description: true,
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

export const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params

    const booking = await prisma.booking.findFirst({
      where: {
        id,
        hostId: req.user.id,
      },
    })

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Booking is already cancelled' })
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
      include: {
        eventType: {
          select: {
            id: true,
            name: true,
            slug: true,
            durationMin: true,
          },
        },
      },
    })

    return res.status(200).json({
      booking: updatedBooking,
      message: 'Booking cancelled successfully',
    })
  } catch (error) {
    next(error)
  }
}
