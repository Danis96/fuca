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
  recipients: MatchScheduleRecipient[];
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

export const handler = async (event: { httpMethod?: string; body?: string | null }) => {
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
          <p>If the button does not work, open this link:</p>
          <p><a href="${safeRsvpUrl}">${safeRsvpUrl}</a></p>
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
        '',
        'Sign in with your player account to respond.',
      ]
        .filter(Boolean)
        .join('\n'),
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
