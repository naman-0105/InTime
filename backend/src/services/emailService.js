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

export const generateGoogleCalendarUrl = ({
  title,
  startTime,
  endTime,
  description,
  guestName,
  guestEmail,
  hostName,
  hostEmail,
  location = 'InTime Meeting',
  manageUrl,
  answers = [],
}) => {
  const startStr = new Date(startTime).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const endStr = new Date(endTime).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  let details = ''
  if (description) {
    details += `${description}\n\n`
  }
  details += `Host: ${hostName} (${hostEmail})\n`
  details += `Guest: ${guestName} (${guestEmail})\n`

  if (answers && answers.length > 0) {
    details += `\nCustom Question Responses:\n`
    for (const ans of answers) {
      details += `- ${ans.label}: ${ans.value}\n`
    }
  }

  if (manageUrl) {
    details += `\nManage or Reschedule Meeting:\n${manageUrl}\n`
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startStr}/${endStr}`,
    details,
  })

  if (location) {
    params.set('location', location)
  }

  if (guestEmail) {
    params.set('add', guestEmail)
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export const sendBookingConfirmationEmails = async ({ booking, host, eventType }) => {
  try {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
    const { dateStr, timeStr } = formatTimeRange(
      booking.startTime,
      booking.endTime,
      host.timezone || 'UTC'
    )

    const googleCalendarUrl = generateGoogleCalendarUrl({
      title: `${eventType.name} with ${host.name}`,
      startTime: booking.startTime,
      endTime: booking.endTime,
      description: eventType.description,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      hostName: host.name,
      hostEmail: host.email,
      location: 'InTime Meeting',
      manageUrl: `${clientUrl}/booked/${booking.token}`,
      answers: booking.answers,
    })

    let answersHtml = ''
    if (booking.answers && booking.answers.length > 0) {
      answersHtml = `
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e5e7eb;">
          <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #374151;">Custom Question Responses:</p>
          ${booking.answers
            .map(
              (a) =>
                `<p style="margin: 0 0 4px 0; font-size: 13px;"><strong>${a.label}:</strong> ${a.value}</p>`
            )
            .join('')}
        </div>
      `
    }

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
          ${answersHtml}
        </div>
        <div style="margin: 20px 0;">
          <a href="${googleCalendarUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #111827; color: #ffffff; padding: 10px 18px; border-radius: 6px; font-weight: 500; font-size: 13px; text-decoration: none;">
            📅 Add to Google Calendar
          </a>
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
          ${answersHtml}
        </div>
        <div style="margin: 20px 0;">
          <a href="${googleCalendarUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #111827; color: #ffffff; padding: 10px 18px; border-radius: 6px; font-weight: 500; font-size: 13px; text-decoration: none;">
            📅 Add to Google Calendar
          </a>
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

export const sendBookingRescheduledEmails = async ({
  booking,
  host,
  eventType,
  previousStartTime,
  previousEndTime,
}) => {
  try {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
    const { dateStr: newDateStr, timeStr: newTimeStr } = formatTimeRange(
      booking.startTime,
      booking.endTime,
      host.timezone || 'UTC'
    )
    const { dateStr: prevDateStr, timeStr: prevTimeStr } = formatTimeRange(
      previousStartTime,
      previousEndTime,
      host.timezone || 'UTC'
    )

    const googleCalendarUrl = generateGoogleCalendarUrl({
      title: `${eventType.name} with ${host.name}`,
      startTime: booking.startTime,
      endTime: booking.endTime,
      description: eventType.description,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      hostName: host.name,
      hostEmail: host.email,
      location: 'InTime Meeting',
      manageUrl: `${clientUrl}/booked/${booking.token}`,
      answers: booking.answers,
    })

    const guestSubject = `Rescheduled: ${eventType.name} with ${host.name}`
    const guestHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; color: #1f2937;">
        <h2 style="color: #111827; margin-top: 0;">Meeting Rescheduled</h2>
        <p>Your meeting with <strong>${host.name}</strong> has been successfully rescheduled.</p>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Event:</strong> ${eventType.name}</p>
          <p style="margin: 0 0 8px 0;"><strong>New Date:</strong> ${newDateStr}</p>
          <p style="margin: 0 0 8px 0;"><strong>New Time:</strong> ${newTimeStr}</p>
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;"><strong>Previous Time:</strong> ${prevDateStr} at ${prevTimeStr}</p>
          <p style="margin: 0 0 8px 0;"><strong>Host:</strong> ${host.name} (${host.email})</p>
          <p style="margin: 0;"><strong>Guest:</strong> ${booking.guestName} (${booking.guestEmail})</p>
        </div>
        <div style="margin: 20px 0;">
          <a href="${googleCalendarUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #111827; color: #ffffff; padding: 10px 18px; border-radius: 6px; font-weight: 500; font-size: 13px; text-decoration: none;">
            Update on Google Calendar
          </a>
        </div>
        <p style="font-size: 14px; color: #6b7280;">Need to manage or cancel this booking? <a href="${clientUrl}/booked/${booking.token}" style="color: #2563eb; text-decoration: underline;">Click here to view booking</a>.</p>
      </div>
    `

    const hostSubject = `Rescheduled: ${eventType.name} with ${booking.guestName}`
    const hostHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; color: #1f2937;">
        <h2 style="color: #111827; margin-top: 0;">Meeting Rescheduled</h2>
        <p><strong>${booking.guestName}</strong> rescheduled their meeting with you.</p>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Event:</strong> ${eventType.name}</p>
          <p style="margin: 0 0 8px 0;"><strong>New Date:</strong> ${newDateStr}</p>
          <p style="margin: 0 0 8px 0;"><strong>New Time:</strong> ${newTimeStr}</p>
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;"><strong>Previous Time:</strong> ${prevDateStr} at ${prevTimeStr}</p>
          <p style="margin: 0;"><strong>Guest Details:</strong> ${booking.guestName} (${booking.guestEmail})</p>
        </div>
        <div style="margin: 20px 0;">
          <a href="${googleCalendarUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #111827; color: #ffffff; padding: 10px 18px; border-radius: 6px; font-weight: 500; font-size: 13px; text-decoration: none;">
            Update on Google Calendar
          </a>
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
    console.error('Failed to send booking reschedule emails:', error)
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
