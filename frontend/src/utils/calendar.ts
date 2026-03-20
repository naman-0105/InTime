interface GoogleCalendarUrlParams {
  title: string
  startTime: string
  endTime: string
  description?: string | null
  guestName: string
  guestEmail: string
  hostName: string
  hostEmail?: string
  location?: string | null
  manageUrl?: string
  answers?: Array<{ label: string; value: string }>
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
  location,
  manageUrl,
  answers = [],
}: GoogleCalendarUrlParams): string => {
  const startStr = new Date(startTime).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const endStr = new Date(endTime).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  let details = ''
  if (description) {
    details += `${description}\n\n`
  }
  details += `Host: ${hostName}${hostEmail ? ` (${hostEmail})` : ''}\n`
  details += `Guest: ${guestName} (${guestEmail})\n`

  if (answers && answers.length > 0) {
    details += `\nCustom Responses:\n`
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
