import prisma from '../db/prisma.js'
import { checkBookingLimits } from '../services/slotService.js'

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
      select: {
        id: true,
        token: true,
        guestName: true,
        guestEmail: true,
        startTime: true,
        endTime: true,
        status: true,
        createdAt: true,
        eventType: {
          select: {
            id: true,
            name: true,
            slug: true,
            durationMin: true,
            location: true,
          },
        },
        answers: {
          select: {
            id: true,
            label: true,
            value: true,
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
      select: {
        id: true,
        guestName: true,
        guestEmail: true,
        startTime: true,
        endTime: true,
        status: true,
        createdAt: true,
        eventType: {
          select: {
            id: true,
            name: true,
            slug: true,
            durationMin: true,
            description: true,
            location: true,
          },
        },
        answers: {
          select: {
            id: true,
            label: true,
            value: true,
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

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
        },
        select: {
          id: true,
          guestName: true,
          guestEmail: true,
          startTime: true,
          endTime: true,
          status: true,
          eventType: {
            select: {
              name: true,
              durationMin: true,
              description: true,
              location: true,
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
          answers: {
            select: {
              id: true,
              label: true,
              value: true,
            },
          },
        },
      })

      await tx.emailOutbox.createMany({
        data: [
          {
            bookingId: b.id,
            recipient: b.guestEmail,
            type: 'BOOKING_CANCELLED_GUEST',
            payload: {
              booking: b,
              host: b.host,
              eventType: b.eventType,
            },
          },
          {
            bookingId: b.id,
            recipient: b.host.email,
            type: 'BOOKING_CANCELLED_HOST',
            payload: {
              booking: b,
              host: b.host,
              eventType: b.eventType,
            },
          },
        ],
      })

      return b
    })

    return res.status(200).json({
      booking: updatedBooking,
      message: 'Booking cancelled successfully',
    })
  } catch (error) {
    next(error)
  }
}

export const rescheduleBooking = async (req, res, next) => {
  try {
    const { id } = req.params
    const { startTime, endTime } = req.body

    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'Start time and end time are required' })
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
      return res.status(400).json({ error: 'Cannot reschedule to a slot in the past' })
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id,
        hostId: req.user.id,
      },
      include: {
        eventType: true,
        host: {
          select: {
            id: true,
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

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Cannot reschedule a cancelled booking' })
    }

    const { eventType, host } = booking

    const minNoticeLimit = new Date(now.getTime() + eventType.minNoticeMin * 60 * 1000)
    if (startUtc < minNoticeLimit) {
      return res.status(400).json({
        error: `Minimum scheduling notice of ${eventType.minNoticeMin} minutes is required`,
      })
    }

    const maxNoticeLimit = new Date(now.getTime() + eventType.maxNoticeDays * 24 * 60 * 60 * 1000)
    if (startUtc > maxNoticeLimit) {
      return res.status(400).json({
        error: `Cannot book more than ${eventType.maxNoticeDays} days in advance`,
      })
    }

    const durationMinutes = Math.round((endUtc.getTime() - startUtc.getTime()) / (1000 * 60))
    if (durationMinutes !== eventType.durationMin) {
      return res.status(400).json({
        error: `Booking duration must be exactly ${eventType.durationMin} minutes`,
      })
    }

    const previousStartTime = booking.startTime
    const previousEndTime = booking.endTime

    const bookingEffStart = new Date(startUtc.getTime() - eventType.bufferBeforeMin * 60 * 1000)
    const bookingEffEnd = new Date(endUtc.getTime() + eventType.bufferAfterMin * 60 * 1000)

    try {
      const updatedBooking = await prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT id FROM users WHERE id = ${host.id}::uuid FOR UPDATE`

          const limitsCheck = await checkBookingLimits({
            hostId: host.id,
            eventTypeId: eventType.id,
            targetDate: startUtc,
            excludeBookingId: booking.id,
            tx,
          })

          if (!limitsCheck.isAllowed) {
            const err = new Error(limitsCheck.reason || 'This time slot is no longer available. Please select another slot.')
            err.statusCode = 409
            throw err
          }

          const searchRangeStart = new Date(startUtc.getTime() - 24 * 60 * 60 * 1000)
          const searchRangeEnd = new Date(endUtc.getTime() + 24 * 60 * 60 * 1000)

          const confirmedBookings = await tx.booking.findMany({
            where: {
              hostId: host.id,
              status: 'CONFIRMED',
              id: { not: booking.id },
              startTime: { lt: searchRangeEnd },
              endTime: { gt: searchRangeStart },
            },
            include: {
              eventType: {
                select: {
                  bufferBeforeMin: true,
                  bufferAfterMin: true,
                },
              },
            },
          })

          const hasBookingConflict = confirmedBookings.some((b) => {
            const bBufferBefore = (b.eventType?.bufferBeforeMin || 0) * 60 * 1000
            const bBufferAfter = (b.eventType?.bufferAfterMin || 0) * 60 * 1000
            const bEffStart = new Date(b.startTime.getTime() - bBufferBefore)
            const bEffEnd = new Date(b.endTime.getTime() + bBufferAfter)

            return bookingEffStart < bEffEnd && bookingEffEnd > bEffStart
          })

          if (hasBookingConflict) {
            const err = new Error('This time slot is no longer available. Please select another slot.')
            err.statusCode = 409
            throw err
          }

          const updated = await tx.booking.update({
            where: { id },
            data: {
              startTime: startUtc,
              endTime: endUtc,
            },
            select: {
              id: true,
              guestName: true,
              guestEmail: true,
              startTime: true,
              endTime: true,
              status: true,
              eventType: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  durationMin: true,
                  description: true,
                  location: true,
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
              answers: {
                select: {
                  id: true,
                  label: true,
                  value: true,
                },
              },
            },
          })

          await tx.emailOutbox.createMany({
            data: [
              {
                bookingId: updated.id,
                recipient: updated.guestEmail,
                type: 'BOOKING_RESCHEDULED_GUEST',
                payload: {
                  booking: updated,
                  host: updated.host,
                  eventType: updated.eventType,
                  previousStartTime,
                  previousEndTime,
                },
              },
              {
                bookingId: updated.id,
                recipient: updated.host.email,
                type: 'BOOKING_RESCHEDULED_HOST',
                payload: {
                  booking: updated,
                  host: updated.host,
                  eventType: updated.eventType,
                  previousStartTime,
                  previousEndTime,
                },
              },
            ],
          })

          return updated
        },
        {
          isolationLevel: 'Serializable',
        }
      )

      return res.status(200).json({
        booking: updatedBooking,
        message: 'Booking rescheduled successfully',
      })
    } catch (txError) {
      if (txError.statusCode === 409 || txError.code === 'P2034') {
        return res.status(409).json({
          error: 'This time slot is no longer available. Please select another slot.',
        })
      }
      throw txError
    }
  } catch (error) {
    next(error)
  }
}
