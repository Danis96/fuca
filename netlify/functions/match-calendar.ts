interface MatchCalendarQuery {
  matchId: string;
  date: string;
  time: string;
  location: string;
  notes?: string;
  rsvpUrl: string;
  eventStartIso: string;
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

function getCalendarDescription(query: MatchCalendarQuery) {
  return [
    'Fuca Sunday League fixture.',
    `Kickoff: ${query.date} at ${query.time}`,
    `Venue: ${query.location}`,
    query.notes?.trim() ? `Notes: ${query.notes.trim()}` : '',
    `RSVP: ${query.rsvpUrl}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function buildCalendarInvite(query: MatchCalendarQuery) {
  const start = new Date(query.eventStartIso);
  if (Number.isNaN(start.getTime())) return null;

  const end = new Date(start.getTime() + 90 * 60 * 1000);
  const eventTitle = getCalendarEventTitle();
  const eventDescription = getCalendarDescription(query);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fuca//Match Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:match-${query.matchId}@fuca`,
    `DTSTAMP:${formatCalendarUtc(new Date())}`,
    `DTSTART:${formatCalendarUtc(start)}`,
    `DTEND:${formatCalendarUtc(end)}`,
    `SUMMARY:${escapeCalendarText(eventTitle)}`,
    `LOCATION:${escapeCalendarText(query.location)}`,
    `DESCRIPTION:${escapeCalendarText(eventDescription)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function getQuery(event: { queryStringParameters?: Record<string, string | undefined> | null }) {
  const params = event.queryStringParameters ?? {};

  return {
    matchId: params.matchId ?? '',
    date: params.date ?? '',
    time: params.time ?? '',
    location: params.location ?? '',
    notes: params.notes ?? '',
    rsvpUrl: params.rsvpUrl ?? '',
    eventStartIso: params.eventStartIso ?? '',
  } satisfies MatchCalendarQuery;
}

export const handler = async (event: {
  httpMethod?: string;
  queryStringParameters?: Record<string, string | undefined> | null;
}) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const query = getQuery(event);
  if (!query.matchId || !query.date || !query.time || !query.location || !query.rsvpUrl || !query.eventStartIso) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing calendar details' }),
    };
  }

  const calendarInvite = buildCalendarInvite(query);
  if (!calendarInvite) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid event start time' }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="fuca-sunday-league-match.ics"',
      'Cache-Control': 'no-store',
    },
    body: calendarInvite,
  };
};
