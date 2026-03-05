import prisma from '../db/prisma.js'

export const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

export const minutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export const localToUTC = (dateStr, timeStr, timeZone) => {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)
  const baseUtc = Date.UTC(year, month - 1, day, hour, minute)

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  })

  const d = new Date(baseUtc)
  const parts = formatter.formatToParts(d)
  const map = {}
  for (const p of parts) map[p.type] = p.value
  const inTzUtc = Date.UTC(
    map.year,
    map.month - 1,
    map.day,
    map.hour % 24,
    map.minute,
    map.second
  )
  const offset = inTzUtc - d.getTime()

  return new Date(baseUtc - offset)
}

export const generateAvailableSlots = async ({
  hostId,
  timezone,
  durationMin,
  dateStr,
  minNoticeMin = 0,
  maxNoticeDays = 60,
  bufferBeforeMin = 0,
  bufferAfterMin = 0,
}) => {
  const parsedDate = new Date(`${dateStr}T00:00:00.000Z`)
  if (isNaN(parsedDate.getTime())) {
    throw new Error('Invalid date format')
  }

  const now = new Date()
  const maxNoticeLimit = new Date(now.getTime() + maxNoticeDays * 24 * 60 * 60 * 1000)
  if (parsedDate.getTime() > maxNoticeLimit.getTime()) {
    return []
  }

  const override = await prisma.availabilityOverride.findUnique({
    where: {
      userId_date: {
        userId: hostId,
        date: parsedDate,
      },
    },
  })

  let intervals = []

  if (override) {
    if (!override.isAvailable) {
      return []
    }
    if (override.startTime && override.endTime) {
      intervals = [{ startTime: override.startTime, endTime: override.endTime }]
    }
  } else {
    const dayOfWeek = parsedDate.getUTCDay()
    const rules = await prisma.availabilityRule.findMany({
      where: {
        userId: hostId,
        dayOfWeek,
      },
      orderBy: { startTime: 'asc' },
    })

    if (rules.length === 0) {
      return []
    }

    intervals = rules.map((r) => ({ startTime: r.startTime, endTime: r.endTime }))
  }

  const candidateSlots = []

  for (const interval of intervals) {
    const startMin = timeToMinutes(interval.startTime)
    const endMin = timeToMinutes(interval.endTime)

    for (let m = startMin; m + durationMin <= endMin; m += durationMin) {
      const slotStartTimeStr = minutesToTime(m)
      const slotEndTimeStr = minutesToTime(m + durationMin)

      const startUtc = localToUTC(dateStr, slotStartTimeStr, timezone)
      const endUtc = localToUTC(dateStr, slotEndTimeStr, timezone)

      candidateSlots.push({
        time: slotStartTimeStr,
        startTime: startUtc,
        endTime: endUtc,
      })
    }
  }

  if (candidateSlots.length === 0) {
    return []
  }

  const dayStartUtc = candidateSlots[0].startTime
  const dayEndUtc = candidateSlots[candidateSlots.length - 1].endTime

  const searchStartUtc = new Date(dayStartUtc.getTime() - 24 * 60 * 60 * 1000)
  const searchEndUtc = new Date(dayEndUtc.getTime() + 24 * 60 * 60 * 1000)

  const [confirmedBookings, externalBusySlots] = await Promise.all([
    prisma.booking.findMany({
      where: {
        hostId,
        status: 'CONFIRMED',
        startTime: { lt: searchEndUtc },
        endTime: { gt: searchStartUtc },
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
    prisma.externalBusySlot.findMany({
      where: {
        userId: hostId,
        startTime: { lt: searchEndUtc },
        endTime: { gt: searchStartUtc },
      },
    }),
  ])

  const minNoticeLimit = new Date(now.getTime() + minNoticeMin * 60 * 1000)

  const availableSlots = candidateSlots.filter((slot) => {
    if (slot.startTime < minNoticeLimit) {
      return false
    }

    const slotEffStart = new Date(slot.startTime.getTime() - bufferBeforeMin * 60 * 1000)
    const slotEffEnd = new Date(slot.endTime.getTime() + bufferAfterMin * 60 * 1000)

    const hasBookingConflict = confirmedBookings.some((booking) => {
      const bBufferBefore = (booking.eventType?.bufferBeforeMin || 0) * 60 * 1000
      const bBufferAfter = (booking.eventType?.bufferAfterMin || 0) * 60 * 1000
      const bEffStart = new Date(booking.startTime.getTime() - bBufferBefore)
      const bEffEnd = new Date(booking.endTime.getTime() + bBufferAfter)

      return slotEffStart < bEffEnd && slotEffEnd > bEffStart
    })

    if (hasBookingConflict) {
      return false
    }

    const hasExternalConflict = externalBusySlots.some((busySlot) => {
      return slotEffStart < busySlot.endTime && slotEffEnd > busySlot.startTime
    })

    return !hasExternalConflict
  })

  return availableSlots
}
