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

export const getPeriodBounds = (dateInput, period = 'DAY', timezone = 'UTC') => {
  let dateObj
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const [y, m, d] = dateInput.trim().split('-').map(Number)
    dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  } else {
    dateObj = new Date(dateInput)
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hourCycle: 'h23',
  })
  const parts = formatter.formatToParts(dateObj)
  const map = {}
  for (const p of parts) map[p.type] = p.value

  const year = parseInt(map.year, 10)
  const month = parseInt(map.month, 10)
  const day = parseInt(map.day, 10)

  const yStr = String(year)
  const mStr = String(month).padStart(2, '0')
  const dStr = String(day).padStart(2, '0')
  const startUtc = localToUTC(`${yStr}-${mStr}-${dStr}`, '00:00', timezone)

  const nextDayDate = new Date(Date.UTC(year, month - 1, day + 1, 12, 0, 0))
  const nextParts = formatter.formatToParts(nextDayDate)
  const nextMap = {}
  for (const p of nextParts) nextMap[p.type] = p.value
  const nextY = nextMap.year
  const nextM = String(nextMap.month).padStart(2, '0')
  const nextD = String(nextMap.day).padStart(2, '0')
  const endUtc = localToUTC(`${nextY}-${nextM}-${nextD}`, '00:00', timezone)

  return { startUtc, endUtc }
}

export const checkBookingLimits = async ({
  hostId,
  eventTypeId,
  targetDate,
  excludeBookingId = null,
  tx = prisma,
}) => {
  const [host, eventType] = await Promise.all([
    tx.user.findUnique({
      where: { id: hostId },
      select: { id: true, timezone: true, maxBookingsCount: true, maxBookingsPeriod: true },
    }),
    eventTypeId
      ? tx.eventType.findUnique({
          where: { id: eventTypeId },
          select: { id: true, name: true, maxBookingsCount: true, maxBookingsPeriod: true },
        })
      : null,
  ])

  if (!host) {
    return { isAllowed: true }
  }

  const timezone = host.timezone || 'UTC'

  if (eventType && eventType.maxBookingsCount && eventType.maxBookingsCount > 0) {
    const bounds = getPeriodBounds(targetDate, 'DAY', timezone)
    if (bounds) {
      const eventWhere = {
        eventTypeId: eventType.id,
        status: 'CONFIRMED',
        startTime: {
          gte: bounds.startUtc,
          lt: bounds.endUtc,
        },
      }
      if (excludeBookingId) {
        eventWhere.id = { not: excludeBookingId }
      }

      const count = await tx.booking.count({ where: eventWhere })
      if (count >= eventType.maxBookingsCount) {
        return {
          isAllowed: false,
          reason: `Maximum daily booking limit of ${eventType.maxBookingsCount} reached for this event type.`,
          period: 'DAY',
          scope: 'event',
        }
      }
    }
  }

  if (host.maxBookingsCount && host.maxBookingsCount > 0) {
    const bounds = getPeriodBounds(targetDate, 'DAY', timezone)
    if (bounds) {
      const hostWhere = {
        hostId: host.id,
        status: 'CONFIRMED',
        startTime: {
          gte: bounds.startUtc,
          lt: bounds.endUtc,
        },
      }
      if (excludeBookingId) {
        hostWhere.id = { not: excludeBookingId }
      }

      const count = await tx.booking.count({ where: hostWhere })
      if (count >= host.maxBookingsCount) {
        return {
          isAllowed: false,
          reason: `Host has reached their daily booking limit of ${host.maxBookingsCount} across all event types.`,
          period: 'DAY',
          scope: 'host',
        }
      }
    }
  }

  return { isAllowed: true }
}

export const generateAvailableSlots = async ({
  hostId,
  eventTypeId,
  timezone,
  durationMin,
  slotIntervalMin,
  dateStr,
  minNoticeMin = 0,
  maxNoticeDays = 60,
  bufferBeforeMin = 0,
  bufferAfterMin = 0,
  excludeBookingId = null,
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

  const limitsCheck = await checkBookingLimits({
    hostId,
    eventTypeId,
    targetDate: dateStr,
    excludeBookingId,
  })
  if (!limitsCheck.isAllowed) {
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

  const intervalMin =
    slotIntervalMin && Number(slotIntervalMin) > 0 ? Number(slotIntervalMin) : durationMin

  const candidateSlots = []

  for (const interval of intervals) {
    const startMin = timeToMinutes(interval.startTime)
    const endMin = timeToMinutes(interval.endTime)

    for (let m = startMin; m + durationMin <= endMin; m += intervalMin) {
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

  const bookingWhere = {
    hostId,
    status: 'CONFIRMED',
    startTime: { lt: searchEndUtc },
    endTime: { gt: searchStartUtc },
  }
  if (excludeBookingId) {
    bookingWhere.id = { not: excludeBookingId }
  }

  const confirmedBookings = await prisma.booking.findMany({
    where: bookingWhere,
    include: {
      eventType: {
        select: {
          bufferBeforeMin: true,
          bufferAfterMin: true,
        },
      },
    },
  })

  const minNoticeLimit = new Date(now.getTime() + minNoticeMin * 60 * 1000)

  const availableSlots = candidateSlots.filter((slot) => {
    if (slot.startTime < minNoticeLimit) {
      return false
    }

    const candidateBlockedStart = new Date(
      slot.startTime.getTime() - bufferBeforeMin * 60 * 1000
    )
    const candidateBlockedEnd = new Date(
      slot.endTime.getTime() + bufferAfterMin * 60 * 1000
    )

    const hasConflict = confirmedBookings.some((booking) => {
      const bBufferBefore = (booking.eventType?.bufferBeforeMin || 0) * 60 * 1000
      const bBufferAfter = (booking.eventType?.bufferAfterMin || 0) * 60 * 1000
      const existingBlockedStart = new Date(booking.startTime.getTime() - bBufferBefore)
      const existingBlockedEnd = new Date(booking.endTime.getTime() + bBufferAfter)

      return candidateBlockedStart < existingBlockedEnd && candidateBlockedEnd > existingBlockedStart
    })

    return !hasConflict
  })

  return availableSlots
}

