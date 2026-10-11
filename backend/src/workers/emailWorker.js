import prisma from '../db/prisma.js'
import { sendOutboxEmail } from '../services/emailService.js'

export const POLL_INTERVAL_MS = 15000
export const MAX_ATTEMPTS = 5
export const STALLED_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

let isProcessing = false
let pollIntervalTimer = null

export const recoverStalledEmails = async () => {
  try {
    const threshold = new Date(Date.now() - STALLED_TIMEOUT_MS)
    const result = await prisma.$executeRaw`
      UPDATE email_outbox
      SET status = 'PENDING'::"EmailStatus",
          updated_at = NOW()
      WHERE status = 'PROCESSING'::"EmailStatus"
        AND updated_at < ${threshold}
    `
    if (result > 0) {
      console.log(`[Email Worker] Recovered ${result} stalled email(s) back to PENDING`)
    }
  } catch (error) {
    console.error('[Email Worker] Error recovering stalled emails:', error.message)
  }
}

export const claimEmailBatch = async (batchSize = 10) => {
  return await prisma.$transaction(async (tx) => {
    const now = new Date()

    const rows = await tx.$queryRaw`
      SELECT id, booking_id as "bookingId", recipient, type, payload, attempts
      FROM email_outbox
      WHERE status = 'PENDING'::"EmailStatus"
        AND next_attempt <= ${now}
      ORDER BY next_attempt ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    `

    if (!rows || rows.length === 0) {
      return []
    }

    const ids = rows.map((r) => r.id)
    await tx.$executeRaw`
      UPDATE email_outbox
      SET status = 'PROCESSING'::"EmailStatus",
          updated_at = NOW()
      WHERE id = ANY(${ids}::uuid[])
    `

    return rows
  })
}

const markEmailSent = async (id) => {
  if (prisma.emailOutbox?.update) {
    return await prisma.emailOutbox.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    })
  }

  return await prisma.$executeRaw`
    UPDATE email_outbox
    SET status = 'SENT'::"EmailStatus",
        sent_at = NOW(),
        updated_at = NOW()
    WHERE id = ${id}::uuid
  `
}

const markEmailFailed = async (id, nextAttempts, isPermanentlyFailed, nextAttemptTime, errorMessage) => {
  if (prisma.emailOutbox?.update) {
    return await prisma.emailOutbox.update({
      where: { id },
      data: {
        attempts: nextAttempts,
        status: isPermanentlyFailed ? 'FAILED' : 'PENDING',
        nextAttempt: isPermanentlyFailed ? undefined : nextAttemptTime,
        lastError: errorMessage,
      },
    })
  }

  return await prisma.$executeRaw`
    UPDATE email_outbox
    SET attempts = ${nextAttempts},
        status = ${isPermanentlyFailed ? 'FAILED' : 'PENDING'}::"EmailStatus",
        next_attempt = ${nextAttemptTime},
        last_error = ${errorMessage},
        updated_at = NOW()
    WHERE id = ${id}::uuid
  `
}

export const processOutboxBatch = async (batchSize = 10) => {
  await recoverStalledEmails()

  const batch = await claimEmailBatch(batchSize)
  if (batch.length === 0) {
    return 0
  }

  for (const item of batch) {
    let emailSent = false
    try {
      await sendOutboxEmail({
        type: item.type,
        recipient: item.recipient,
        payload: item.payload,
      })
      emailSent = true

      await markEmailSent(item.id)
      console.log(`[Email Worker] Sent ${item.type} to ${item.recipient} (Outbox ID: ${item.id})`)
    } catch (sendError) {
      if (emailSent) {
        console.error(
          `[Email Worker] Email was delivered to ${item.recipient} but DB status update failed for ${item.id}:`,
          sendError.message
        )
        try {
          await prisma.$executeRaw`
            UPDATE email_outbox
            SET status = 'SENT'::"EmailStatus",
                sent_at = NOW(),
                updated_at = NOW()
            WHERE id = ${item.id}::uuid
          `
        } catch (dbErr) {
          console.error(`[Email Worker] Fallback DB update failed for ${item.id}:`, dbErr.message)
        }
        continue
      }

      const nextAttempts = item.attempts + 1
      const isPermanentlyFailed = nextAttempts >= MAX_ATTEMPTS

      const backoffSeconds = Math.pow(2, nextAttempts) * 15
      const nextAttemptTime = new Date(Date.now() + backoffSeconds * 1000)

      console.error(
        `[Email Worker] Delivery failed for ${item.id} to ${item.recipient} (Attempt ${nextAttempts}/${MAX_ATTEMPTS}): ${sendError.message}`
      )

      try {
        await markEmailFailed(
          item.id,
          nextAttempts,
          isPermanentlyFailed,
          nextAttemptTime,
          sendError.message || 'Unknown email delivery error'
        )
      } catch (updateErr) {
        console.error(`[Email Worker] Failed to update error status for ${item.id}:`, updateErr.message)
      }
    }
  }

  return batch.length
}

export const runWorkerTick = async () => {
  if (isProcessing) {
    return
  }
  isProcessing = true
  try {
    let processedCount = 0
    do {
      processedCount = await processOutboxBatch(10)
    } while (processedCount === 10)
  } catch (error) {
    console.error('[Email Worker] Unhandled error during worker tick:', error.message)
  } finally {
    isProcessing = false
  }
}

export const startEmailWorker = () => {
  if (pollIntervalTimer) {
    return pollIntervalTimer
  }

  console.log(`Started PostgreSQL email outbox worker (Polling every ${POLL_INTERVAL_MS / 1000}s)`)

  runWorkerTick().catch((err) => {
    console.error('Error during startup tick:', err.message)
  })

  pollIntervalTimer = setInterval(() => {
    runWorkerTick().catch((err) => {
      console.error('Error during interval tick:', err.message)
    })
  }, POLL_INTERVAL_MS)

  return pollIntervalTimer
}

if (process.argv[1] && process.argv[1].endsWith('emailWorker.js')) {
  startEmailWorker()
}
