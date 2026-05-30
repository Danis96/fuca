interface MatchScheduleRecipient {
  name: string;
  email: string;
}

interface MatchScheduleRequestBody {
  matchId: string;
  date: string;
  time: string;
  location: string;
  notes?: string;
  rsvpUrl: string;
  eventStartIso?: string;
  eventTimeZone?: string;
  recipients: MatchScheduleRecipient[];
}

interface HandlerEvent {
  httpMethod?: string;
  body?: string | null;
  headers?: Record<string, string | undefined>;
}

function json(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeCalendarText(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\r\n', '\\n')
    .replaceAll('\n', '\\n')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,');
}

function formatCalendarUtc(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function getCalendarEventTitle() {
  return 'Fuca Sunday League Match';
}

function getCalendarDescription(payload: MatchScheduleRequestBody) {
  return [
    'Fuca Sunday League fixture.',
    `Kickoff: ${payload.date} at ${payload.time}`,
    `Venue: ${payload.location}`,
    payload.notes?.trim() ? `Notes: ${payload.notes.trim()}` : '',
    `RSVP: ${payload.rsvpUrl}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function getRequestOrigin(event: HandlerEvent) {
  const proto = event.headers?.['x-forwarded-proto'] ?? 'https';
  const host = event.headers?.['x-forwarded-host'] ?? event.headers?.host;
  return host ? `${proto}://${host}` : process.env.URL ?? null;
}

function buildCalendarDownloadUrl(payload: MatchScheduleRequestBody, origin: string | null) {
  if (!origin || !payload.eventStartIso) return null;

  const params = new URLSearchParams({
    matchId: payload.matchId,
    date: payload.date,
    time: payload.time,
    location: payload.location,
    rsvpUrl: payload.rsvpUrl,
    eventStartIso: payload.eventStartIso,
  });

  if (payload.notes?.trim()) {
    params.set('notes', payload.notes.trim());
  }

  if (payload.eventTimeZone?.trim()) {
    params.set('eventTimeZone', payload.eventTimeZone.trim());
  }

  return `${origin}/api/match-calendar.ics?${params.toString()}`;
}

function buildCalendarInvite(payload: MatchScheduleRequestBody) {
  if (!payload.eventStartIso) return null;

  const start = new Date(payload.eventStartIso);
  if (Number.isNaN(start.getTime())) return null;

  const end = new Date(start.getTime() + 90 * 60 * 1000);
  const eventTitle = getCalendarEventTitle();
  const eventDescription = getCalendarDescription(payload);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fuca//Match Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:match-${payload.matchId}@fuca`,
    `DTSTAMP:${formatCalendarUtc(new Date())}`,
    `DTSTART:${formatCalendarUtc(start)}`,
    `DTEND:${formatCalendarUtc(end)}`,
    `SUMMARY:${escapeCalendarText(eventTitle)}`,
    `LOCATION:${escapeCalendarText(payload.location)}`,
    `DESCRIPTION:${escapeCalendarText(eventDescription)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

async function getProviderErrorDetails(response: Response) {
  const raw = await response.text();
  if (!raw) return 'Unknown provider error';

  try {
    const parsed = JSON.parse(raw) as {
      code?: string;
      message?: string;
      error?: string;
      errors?: Record<string, unknown> | Array<unknown>;
    };
    return [parsed.code, parsed.message, parsed.error].filter(Boolean).join(': ') || raw;
  } catch {
    return raw;
  }
}

export const handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const brevoApiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.TEAM_EMAIL_FROM;

  if (!brevoApiKey || !fromEmail) {
    return json(500, {
      error: 'Email service is not configured. Set BREVO_API_KEY and TEAM_EMAIL_FROM.',
    });
  }

  let payload: MatchScheduleRequestBody;
  try {
    payload = JSON.parse(event.body ?? '{}') as MatchScheduleRequestBody;
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  if (!payload.matchId || !payload.date || !payload.time || !payload.location || !payload.rsvpUrl) {
    return json(400, { error: 'Missing match details or RSVP link' });
  }

  const validRecipients = (payload.recipients ?? []).filter(
    (recipient) => recipient.email?.trim() && recipient.name?.trim()
  );

  if (validRecipients.length === 0) {
    return json(200, { sentCount: 0, skippedCount: (payload.recipients ?? []).length });
  }

  const safeDate = escapeHtml(payload.date);
  const safeTime = escapeHtml(payload.time);
  const safeLocation = escapeHtml(payload.location);
  const safeRsvpUrl = escapeHtml(payload.rsvpUrl);
  const safeNotes = payload.notes?.trim() ? escapeHtml(payload.notes.trim()) : '';
  const calendarDownloadUrl = buildCalendarDownloadUrl(payload, getRequestOrigin(event));
  const safeCalendarDownloadUrl = calendarDownloadUrl ? escapeHtml(calendarDownloadUrl) : '';
  const calendarInvite = buildCalendarInvite(payload);
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': brevoApiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        email: fromEmail,
        name: 'Fuca',
      },
      subject: `New match scheduled: ${payload.date} at ${payload.time}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <p>Hi {{params.playerName}},</p>
          <p>A new match has been scheduled.</p>
          <p>
            <strong>Date:</strong> ${safeDate}<br />
            <strong>Time:</strong> ${safeTime}<br />
            <strong>Location:</strong> ${safeLocation}
          </p>
          ${safeNotes ? `<p><strong>Notes:</strong> ${safeNotes}</p>` : ''}
          <p>
            <a
              href="${safeRsvpUrl}"
              style="display: inline-block; padding: 12px 18px; border-radius: 999px; background: #059669; color: #ffffff; text-decoration: none; font-weight: 700;"
            >
              RSVP for this match
            </a>
          </p>
          ${safeCalendarDownloadUrl ? `
          <p>
            <a
              href="${safeCalendarDownloadUrl}"
              style="display: inline-block; padding: 12px 18px; border-radius: 999px; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700;"
            >
              Add to calendar
            </a>
          </p>
          <p>This opens a universal .ics invite for Apple Calendar, Outlook, Google Calendar, and others.</p>
          ` : ''}
          <p>If the button does not work, open this link:</p>
          <p><a href="${safeRsvpUrl}">${safeRsvpUrl}</a></p>
          ${safeCalendarDownloadUrl ? `<p>Calendar file: <a href="${safeCalendarDownloadUrl}">${safeCalendarDownloadUrl}</a></p>` : ''}
          <p>Sign in with your player account to respond.</p>
        </div>
      `,
      textContent: [
        'Hi {{params.playerName}},',
        '',
        'A new match has been scheduled.',
        `Date: ${payload.date}`,
        `Time: ${payload.time}`,
        `Location: ${payload.location}`,
        payload.notes?.trim() ? `Notes: ${payload.notes.trim()}` : '',
        '',
        `RSVP here: ${payload.rsvpUrl}`,
        calendarDownloadUrl ? `Add to calendar: ${calendarDownloadUrl}` : '',
        calendarInvite ? 'An .ics calendar invite is attached for Apple Calendar and Outlook.' : '',
        '',
        'Sign in with your player account to respond.',
      ]
        .filter(Boolean)
        .join('\n'),
      ...(calendarInvite
        ? {
            attachment: [
              {
                content: Buffer.from(calendarInvite, 'utf8').toString('base64'),
                name: 'fuca-sunday-league-match.ics',
              },
            ],
          }
        : {}),
      messageVersions: validRecipients.map((recipient) => ({
        to: [
          {
            email: recipient.email,
            name: recipient.name,
          },
        ],
        params: {
          playerName: recipient.name,
        },
      })),
    }),
  });

  if (!response.ok) {
    const details = await getProviderErrorDetails(response);
    return json(502, {
      error: `Email provider rejected request. ${details}`,
    });
  }

  return json(200, {
    sentCount: validRecipients.length,
    skippedCount: (payload.recipients ?? []).length - validRecipients.length,
  });
};
