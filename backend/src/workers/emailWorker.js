import { Worker } from 'bullmq'
import prisma from '../db/prisma.js'
import { redisConnection } from '../queues/emailQueue.js'
import {
  sendBookingConfirmationEmails,
  sendBookingRescheduledEmails,
  sendBookingCancellationEmails,
} from '../services/emailService.js'

export const processEmailJob = async (data) => {
  const { type, bookingId, previousStartTime, previousEndTime } = data
  if (!bookingId) return

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
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
      answers: {
        select: {
          id: true,
          label: true,
          value: true,
        },
      },
    },
  })

  if (!booking || !booking.host || !booking.eventType) {
    return
  }

  if (type === 'booking-confirmation') {
    await sendBookingConfirmationEmails({
      booking,
      host: booking.host,
      eventType: booking.eventType,
    })
  } else if (type === 'booking-cancellation') {
    await sendBookingCancellationEmails({
      booking,
      host: booking.host,
      eventType: booking.eventType,
    })
  } else if (type === 'booking-rescheduled') {
    await sendBookingRescheduledEmails({
      booking,
      host: booking.host,
      eventType: booking.eventType,
      previousStartTime,
      previousEndTime,
    })
  }
}

let emailWorker = null

export const startEmailWorker = () => {
  if (emailWorker) {
    return emailWorker
  }

  emailWorker = new Worker(
    'email',
    async (job) => {
      await processEmailJob(job.data)
    },
    {
      connection: redisConnection,
      concurrency: 5,
      drainDelay: 60,
      stalledInterval: 300000,
    }
  )

  emailWorker.on('failed', (job, err) => {
    console.error(`Email job ${job?.id} (${job?.name}) failed:`, err?.message)
  })

  return emailWorker
}

export const closeEmailWorker = async () => {
  if (emailWorker) {
    await emailWorker.close()
    emailWorker = null
  }
}
