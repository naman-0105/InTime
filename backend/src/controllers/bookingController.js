import prisma from '../db/prisma.js'
import { enqueueEmail } from '../queues/emailQueue.js'
import { validateGoogleAvailability } from '../services/googleCalendarService.js'

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

    const updatedBooking = await prisma.booking.update({
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

    await enqueueEmail({
      type: 'booking-cancellation',
      bookingId: updatedBooking.id,
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

    const isGoogleAvailable = await validateGoogleAvailability(host.id, bookingEffStart, bookingEffEnd)
    if (!isGoogleAvailable) {
      return res.status(409).json({
        error: 'This time slot is no longer available. Please select another slot.',
      })
    }

    try {
      const updatedBooking = await prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT id FROM users WHERE id = ${host.id}::uuid FOR UPDATE`

          const searchRangeStart = new Date(startUtc.getTime() - 24 * 60 * 60 * 1000)
          const searchRangeEnd = new Date(endUtc.getTime() + 24 * 60 * 60 * 1000)

          const [confirmedBookings, externalBusySlots] = await Promise.all([
            tx.booking.findMany({
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
            }),
            tx.externalBusySlot.findMany({
              where: {
                userId: host.id,
                startTime: { lt: searchRangeEnd },
                endTime: { gt: searchRangeStart },
              },
            }),
          ])

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

          const hasExternalConflict = externalBusySlots.some((slot) => {
            return bookingEffStart < slot.endTime && bookingEffEnd > slot.startTime
          })

          if (hasExternalConflict) {
            const err = new Error('This time slot is no longer available. Please select another slot.')
            err.statusCode = 409
            throw err
          }

          return await tx.booking.update({
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
        },
        {
          isolationLevel: 'Serializable',
        }
      )

      await enqueueEmail({
        type: 'booking-rescheduled',
        bookingId: updatedBooking.id,
        previousStartTime,
        previousEndTime,
      })

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
