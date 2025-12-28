import { Resend } from 'resend'

const resendClient = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const sendEmail = async ({ to, subject, html }) => {
  const from = process.env.EMAIL_FROM || 'InTime <onboarding@resend.dev>'

  if (resendClient) {
    return await resendClient.emails.send({
      from,
      to,
      subject,
      html,
    })
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Resend Simulation]', {
      from,
      to,
      subject,
    })
  }

  return { id: 'simulated-resend-id' }
}

const formatTimeRange = (startTime, endTime, timezone = 'UTC') => {
  try {
    const start = new Date(startTime)
    const end = new Date(endTime)

    const dateStr = start.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: timezone,
    })

    const startTimeStr = start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    })

    const endTimeStr = end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    })

    return {
      dateStr,
      timeStr: `${startTimeStr} - ${endTimeStr} (${timezone})`,
    }
  } catch {
    return {
      dateStr: new Date(startTime).toDateString(),
      timeStr: `${new Date(startTime).toTimeString()} - ${new Date(endTime).toTimeString()}`,
    }
  }
}

export const sendBookingConfirmationEmails = async ({ booking, host, eventType }) => {
  try {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
    const { dateStr, timeStr } = formatTimeRange(
      booking.startTime,
      booking.endTime,
      host.timezone || 'UTC'
    )

    const guestSubject = `Confirmed: ${eventType.name} with ${host.name}`
    const guestHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; color: #1f2937;">
        <h2 style="color: #111827; margin-top: 0;">Meeting Confirmed</h2>
        <p>Your meeting with <strong>${host.name}</strong> has been successfully booked.</p>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Event:</strong> ${eventType.name}</p>
          <p style="margin: 0 0 8px 0;"><strong>Date:</strong> ${dateStr}</p>
          <p style="margin: 0 0 8px 0;"><strong>Time:</strong> ${timeStr}</p>
          <p style="margin: 0 0 8px 0;"><strong>Host:</strong> ${host.name} (${host.email})</p>
          <p style="margin: 0;"><strong>Guest:</strong> ${booking.guestName} (${booking.guestEmail})</p>
        </div>
        <p style="font-size: 14px; color: #6b7280;">Need to manage or cancel this booking? <a href="${clientUrl}/booked/${booking.token}" style="color: #2563eb; text-decoration: underline;">Click here to view booking</a>.</p>
      </div>
    `

    const hostSubject = `New Booking: ${eventType.name} with ${booking.guestName}`
    const hostHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; color: #1f2937;">
        <h2 style="color: #111827; margin-top: 0;">New Meeting Scheduled</h2>
        <p><strong>${booking.guestName}</strong> scheduled a meeting with you.</p>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Event:</strong> ${eventType.name}</p>
          <p style="margin: 0 0 8px 0;"><strong>Date:</strong> ${dateStr}</p>
          <p style="margin: 0 0 8px 0;"><strong>Time:</strong> ${timeStr}</p>
          <p style="margin: 0;"><strong>Guest Details:</strong> ${booking.guestName} (${booking.guestEmail})</p>
        </div>
        <p style="font-size: 14px; color: #6b7280;">View this meeting on your <a href="${clientUrl}/dashboard" style="color: #2563eb; text-decoration: underline;">InTime Dashboard</a>.</p>
      </div>
    `

    await Promise.allSettled([
      sendEmail({
        to: booking.guestEmail,
        subject: guestSubject,
        html: guestHtml,
      }),
      sendEmail({
        to: host.email,
        subject: hostSubject,
        html: hostHtml,
      }),
    ])
  } catch (error) {
    console.error('Failed to send booking confirmation emails:', error)
  }
}

export const sendBookingCancellationEmails = async ({ booking, host, eventType }) => {
  try {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
    const { dateStr, timeStr } = formatTimeRange(
      booking.startTime,
      booking.endTime,
      host.timezone || 'UTC'
    )

    const guestSubject = `Cancelled: ${eventType.name} with ${host.name}`
    const guestHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; color: #1f2937;">
        <h2 style="color: #dc2626; margin-top: 0;">Meeting Cancelled</h2>
        <p>The following scheduled meeting has been cancelled:</p>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Event:</strong> ${eventType.name}</p>
          <p style="margin: 0 0 8px 0;"><strong>Date:</strong> ${dateStr}</p>
          <p style="margin: 0 0 8px 0;"><strong>Time:</strong> ${timeStr}</p>
          <p style="margin: 0;"><strong>Host:</strong> ${host.name}</p>
        </div>
        <p style="font-size: 14px; color: #6b7280;">If you wish to reschedule, visit <a href="${clientUrl}" style="color: #2563eb; text-decoration: underline;">InTime</a>.</p>
      </div>
    `

    const hostSubject = `Cancelled: ${eventType.name} with ${booking.guestName}`
    const hostHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; color: #1f2937;">
        <h2 style="color: #dc2626; margin-top: 0;">Meeting Cancelled</h2>
        <p>The following scheduled meeting has been cancelled:</p>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Event:</strong> ${eventType.name}</p>
          <p style="margin: 0 0 8px 0;"><strong>Date:</strong> ${dateStr}</p>
          <p style="margin: 0 0 8px 0;"><strong>Time:</strong> ${timeStr}</p>
          <p style="margin: 0;"><strong>Guest:</strong> ${booking.guestName} (${booking.guestEmail})</p>
        </div>
        <p style="font-size: 14px; color: #6b7280;">View all bookings on your <a href="${clientUrl}/dashboard" style="color: #2563eb; text-decoration: underline;">Dashboard</a>.</p>
      </div>
    `

    await Promise.allSettled([
      sendEmail({
        to: booking.guestEmail,
        subject: guestSubject,
        html: guestHtml,
      }),
      sendEmail({
        to: host.email,
        subject: hostSubject,
        html: hostHtml,
      }),
    ])
  } catch (error) {
    console.error('Failed to send booking cancellation emails:', error)
  }
}
