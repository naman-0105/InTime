import prisma from '../db/prisma.js'

const isValidTimeFormat = (timeStr) => {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr)
}

const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

const validateAndSortIntervals = (intervals) => {
  for (const item of intervals) {
    if (typeof item.dayOfWeek !== 'number' || item.dayOfWeek < 0 || item.dayOfWeek > 6) {
      throw new Error('Day of week must be between 0 (Sunday) and 6 (Saturday)')
    }
    if (!isValidTimeFormat(item.startTime) || !isValidTimeFormat(item.endTime)) {
      throw new Error('Times must be in HH:mm 24-hour format')
    }
    if (timeToMinutes(item.startTime) >= timeToMinutes(item.endTime)) {
      throw new Error(`Start time (${item.startTime}) must be before end time (${item.endTime})`)
    }
  }

  const byDay = {}
  for (const item of intervals) {
    if (!byDay[item.dayOfWeek]) {
      byDay[item.dayOfWeek] = []
    }
    byDay[item.dayOfWeek].push(item)
  }

  for (const day in byDay) {
    const dayIntervals = byDay[day].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    )
    for (let i = 0; i < dayIntervals.length - 1; i++) {
      if (timeToMinutes(dayIntervals[i].endTime) > timeToMinutes(dayIntervals[i + 1].startTime)) {
        throw new Error(
          `Overlapping availability intervals detected on day ${day}: ${dayIntervals[i].startTime}-${dayIntervals[i].endTime} and ${dayIntervals[i + 1].startTime}-${dayIntervals[i + 1].endTime}`
        )
      }
    }
  }
}

export const getAvailability = async (req, res, next) => {
  try {
    const rules = await prisma.availabilityRule.findMany({
      where: { userId: req.user.id },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })
    return res.status(200).json({ rules })
  } catch (error) {
    next(error)
  }
}

export const setAvailability = async (req, res, next) => {
  try {
    const { rules } = req.body

    if (!Array.isArray(rules)) {
      return res.status(400).json({ error: 'Rules array is required' })
    }

    try {
      validateAndSortIntervals(rules)
    } catch (validationErr) {
      return res.status(400).json({ error: validationErr.message })
    }

    const createdRules = await prisma.$transaction(async (tx) => {
      await tx.availabilityRule.deleteMany({
        where: { userId: req.user.id },
      })

      if (rules.length === 0) {
        return []
      }

      return await Promise.all(
        rules.map((r) =>
          tx.availabilityRule.create({
            data: {
              userId: req.user.id,
              dayOfWeek: r.dayOfWeek,
              startTime: r.startTime,
              endTime: r.endTime,
            },
          })
        )
      )
    })

    return res.status(200).json({ rules: createdRules })
  } catch (error) {
    next(error)
  }
}

export const deleteAvailabilityRule = async (req, res, next) => {
  try {
    const { id } = req.params

    const rule = await prisma.availabilityRule.findFirst({
      where: { id, userId: req.user.id },
    })

    if (!rule) {
      return res.status(404).json({ error: 'Availability rule not found' })
    }

    await prisma.availabilityRule.delete({
      where: { id },
    })

    return res.status(200).json({ message: 'Availability rule deleted successfully' })
  } catch (error) {
    next(error)
  }
}

export const getOverrides = async (req, res, next) => {
  try {
    const overrides = await prisma.availabilityOverride.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'asc' },
    })
    return res.status(200).json({ overrides })
  } catch (error) {
    next(error)
  }
}

export const setOverride = async (req, res, next) => {
  try {
    const { date, isAvailable, startTime, endTime } = req.body

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Date (YYYY-MM-DD) is required' })
    }

    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim())
    if (!dateOnlyMatch) {
      return res.status(400).json({ error: 'Date must be formatted as YYYY-MM-DD' })
    }

    const parsedDate = new Date(`${date.trim()}T00:00:00.000Z`)
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' })
    }

    const available = Boolean(isAvailable)
    let validStartTime = null
    let validEndTime = null

    if (available) {
      if (!startTime || !endTime) {
        return res.status(400).json({ error: 'Start time and end time are required when available' })
      }
      if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
        return res.status(400).json({ error: 'Times must be in HH:mm 24-hour format' })
      }
      if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
        return res.status(400).json({
          error: `Start time (${startTime}) must be before end time (${endTime})`,
        })
      }
      validStartTime = startTime
      validEndTime = endTime
    }

    const override = await prisma.availabilityOverride.upsert({
      where: {
        userId_date: {
          userId: req.user.id,
          date: parsedDate,
        },
      },
      create: {
        userId: req.user.id,
        date: parsedDate,
        isAvailable: available,
        startTime: validStartTime,
        endTime: validEndTime,
      },
      update: {
        isAvailable: available,
        startTime: validStartTime,
        endTime: validEndTime,
      },
    })

    return res.status(200).json({ override })
  } catch (error) {
    next(error)
  }
}

export const deleteOverride = async (req, res, next) => {
  try {
    const { id } = req.params

    const override = await prisma.availabilityOverride.findFirst({
      where: { id, userId: req.user.id },
    })

    if (!override) {
      return res.status(404).json({ error: 'Override not found' })
    }

    await prisma.availabilityOverride.delete({
      where: { id },
    })

    return res.status(200).json({ message: 'Override deleted successfully' })
  } catch (error) {
    next(error)
  }
}
