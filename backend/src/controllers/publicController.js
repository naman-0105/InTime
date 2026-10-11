import crypto from 'crypto'
import prisma from '../db/prisma.js'
import { generateAvailableSlots, checkBookingLimits } from '../services/slotService.js'
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
        maxNoticeDays: true,
        location: true,
        isActive: true,
        customQuestions: {
          select: {
            id: true,
            label: true,
            required: true,
            order: true,
          },
          orderBy: { order: 'asc' },
        },
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
        maxNoticeDays: event.maxNoticeDays,
        customQuestions: event.customQuestions,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getPublicEventSlots = async (req, res, next) => {
  try {
    const { username, eventSlug } = req.params
    const { date, rescheduleToken, bookingId } = req.query

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
        slotIntervalMin: true,
        isActive: true,
        minNoticeMin: true,
        maxNoticeDays: true,
        bufferBeforeMin: true,
        bufferAfterMin: true,
      },
    })

    if (!event || !event.isActive) {
      return res.status(404).json({ error: 'Event type not found or is inactive' })
    }

    let excludeBookingId = null
    if (rescheduleToken) {
      const existingBooking = await prisma.booking.findUnique({
        where: { token: String(rescheduleToken) },
        select: { id: true, hostId: true, status: true },
      })
      if (existingBooking && existingBooking.hostId === host.id && existingBooking.status === 'CONFIRMED') {
        excludeBookingId = existingBooking.id
      }
    } else if (bookingId && req.user?.id === host.id) {
      const existingBooking = await prisma.booking.findFirst({
        where: { id: String(bookingId), hostId: host.id, status: 'CONFIRMED' },
        select: { id: true },
      })
      if (existingBooking) {
        excludeBookingId = existingBooking.id
      }
    }

    const slots = await generateAvailableSlots({
      hostId: host.id,
      eventTypeId: event.id,
      timezone: host.timezone,
      durationMin: event.durationMin,
      slotIntervalMin: event.slotIntervalMin,
      dateStr: date,
      minNoticeMin: event.minNoticeMin,
      maxNoticeDays: event.maxNoticeDays,
      bufferBeforeMin: event.bufferBeforeMin,
      bufferAfterMin: event.bufferAfterMin,
      excludeBookingId,
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
    const { guestName, guestEmail, startTime, endTime, answers } = req.body

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
        minNoticeMin: true,
        maxNoticeDays: true,
        bufferBeforeMin: true,
        bufferAfterMin: true,
        customQuestions: {
          select: {
            id: true,
            label: true,
            required: true,
            order: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!event || !event.isActive) {
      return res.status(404).json({ error: 'Event type not found or is inactive' })
    }

    const minNoticeLimit = new Date(now.getTime() + event.minNoticeMin * 60 * 1000)
    if (startUtc < minNoticeLimit) {
      return res.status(400).json({
        error: `Minimum scheduling notice of ${event.minNoticeMin} minutes is required`,
      })
    }

    const maxNoticeLimit = new Date(now.getTime() + event.maxNoticeDays * 24 * 60 * 60 * 1000)
    if (startUtc > maxNoticeLimit) {
      return res.status(400).json({
        error: `Cannot book more than ${event.maxNoticeDays} days in advance`,
      })
    }

    const durationMinutes = Math.round((endUtc.getTime() - startUtc.getTime()) / (1000 * 60))
    if (durationMinutes !== event.durationMin) {
      return res.status(400).json({ error: `Booking duration must be exactly ${event.durationMin} minutes` })
    }

    const preparedAnswers = []
    if (event.customQuestions && event.customQuestions.length > 0) {
      for (const q of event.customQuestions) {
        let answerVal = ''
        if (Array.isArray(answers)) {
          const found = answers.find(
            (a) => a && (a.questionId === q.id || a.label === q.label)
          )
          if (found && typeof found.value === 'string') {
            answerVal = found.value.trim()
          }
        } else if (answers && typeof answers === 'object') {
          const raw = answers[q.id] || answers[q.label]
          if (typeof raw === 'string') {
            answerVal = raw.trim()
          }
        }

        if (q.required && !answerVal) {
          return res.status(400).json({
            error: `Please answer the required question: "${q.label}"`,
          })
        }

        if (answerVal) {
          preparedAnswers.push({
            questionId: q.id,
            label: q.label,
            value: answerVal,
          })
        }
      }
    }

    const bookingEffStart = new Date(startUtc.getTime() - event.bufferBeforeMin * 60 * 1000)
    const bookingEffEnd = new Date(endUtc.getTime() + event.bufferAfterMin * 60 * 1000)

    try {
      const token = crypto.randomBytes(24).toString('hex')

      const booking = await prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT id FROM users WHERE id = ${host.id}::uuid FOR UPDATE`

          const limitsCheck = await checkBookingLimits({
            hostId: host.id,
            eventTypeId: event.id,
            targetDate: startUtc,
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

          const newBooking = await tx.booking.create({
            data: {
              token,
              eventTypeId: event.id,
              hostId: host.id,
              guestName: guestName.trim(),
              guestEmail: guestEmail.toLowerCase().trim(),
              startTime: startUtc,
              endTime: endUtc,
              status: 'CONFIRMED',
              answers: {
                create: preparedAnswers,
              },
            },
            include: {
              eventType: {
                select: {
                  name: true,
                  durationMin: true,
                  location: true,
                },
              },
              host: {
                select: {
                  name: true,
                  email: true,
                  timezone: true,
                },
              },
              answers: {
                select: {
                  label: true,
                  value: true,
                },
              },
            },
          })

          await tx.emailOutbox.createMany({
            data: [
              {
                bookingId: newBooking.id,
                recipient: newBooking.guestEmail,
                type: 'BOOKING_CONFIRMATION_GUEST',
                payload: {
                  booking: newBooking,
                  host,
                  eventType: event,
                },
              },
              {
                bookingId: newBooking.id,
                recipient: host.email,
                type: 'BOOKING_CONFIRMATION_HOST',
                payload: {
                  booking: newBooking,
                  host,
                  eventType: event,
                },
              },
            ],
          })

          return newBooking
        },
        {
          isolationLevel: 'Serializable',
        }
      )

      return res.status(201).json({ booking })
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

export const rescheduleBookingByToken = async (req, res, next) => {
  try {
    const { token } = req.params
    const { startTime, endTime } = req.body

    if (!token) {
      return res.status(400).json({ error: 'Booking token is required' })
    }

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

    const booking = await prisma.booking.findUnique({
      where: { token },
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
            where: { token },
            data: {
              startTime: startUtc,
              endTime: endUtc,
            },
            select: {
              id: true,
              token: true,
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

export const getBookingByToken = async (req, res, next) => {
  try {
    const { token } = req.params

    if (!token) {
      return res.status(400).json({ error: 'Booking token is required' })
    }

    const booking = await prisma.booking.findUnique({
      where: { token },
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
            maxNoticeDays: true,
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

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    return res.status(200).json({ booking })
  } catch (error) {
    next(error)
  }
}

export const cancelBookingByToken = async (req, res, next) => {
  try {
    const { token } = req.params

    if (!token) {
      return res.status(400).json({ error: 'Booking token is required' })
    }

    const booking = await prisma.booking.findUnique({
      where: { token },
    })

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Booking is already cancelled' })
    }

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { token },
        data: {
          status: 'CANCELLED',
        },
        select: {
          id: true,
          token: true,
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
