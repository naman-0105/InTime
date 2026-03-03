import { Worker } from 'bullmq'
import { syncUserCalendar } from '../services/googleCalendarService.js'
import { redisConnection } from '../queues/calendarSyncQueue.js'

let calendarWorker = null

export const startCalendarWorker = () => {
  if (calendarWorker) {
    return calendarWorker
  }

  calendarWorker = new Worker(
    'google-calendar-sync',
    async (job) => {
      const { userId } = job.data
      if (!userId) return
      await syncUserCalendar(userId)
    },
    {
      connection: redisConnection,
      concurrency: 5,
    }
  )

  calendarWorker.on('failed', (job, err) => {
    console.error(`Calendar sync job ${job?.id} failed:`, err?.message)
  })

  return calendarWorker
}

export const closeCalendarWorker = async () => {
  if (calendarWorker) {
    await calendarWorker.close()
    calendarWorker = null
  }
}
