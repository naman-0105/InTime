import { Queue } from 'bullmq'
import { redisConnection } from './calendarSyncQueue.js'

export const emailQueue = new Queue('email', {
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

export const enqueueEmail = async (data) => {
  if (!data || !data.type) return

  return await emailQueue.add(data.type, data)
}

export const closeEmailQueue = async () => {
  await emailQueue.close()
}
