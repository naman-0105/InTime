import { Queue } from 'bullmq'

export const redisConnection = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    }

export const calendarSyncQueue = new Queue('google-calendar-sync', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
})

export const enqueueCalendarSync = async (userId) => {
  if (!userId) return

  return await calendarSyncQueue.add(
    'sync-calendar',
    { userId },
    {
      jobId: `sync-${userId}`,
      delay: 1000,
    }
  )
}

export const closeCalendarSyncQueue = async () => {
  await calendarSyncQueue.close()
}
