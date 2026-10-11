import { Queue } from 'bullmq'

export const redisConnection = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    }

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

  try {
    return await emailQueue.add(data.type, data)
  } catch (err) {
    console.warn(`Falling back to direct email processing: ${err?.message}`)
    import('../workers/emailWorker.js')
      .then(({ processEmailJob }) => {
        processEmailJob(data).catch((directErr) => {
          console.error(`Direct Email Fallback Error: ${directErr?.message}`)
        })
      })
      .catch((importErr) => {
        console.error(`Email Worker Import Error: ${importErr?.message}`)
      })
  }
}

export const closeEmailQueue = async () => {
  await emailQueue.close()
}
