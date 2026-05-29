interface TeamEmailRecipient {
  name: string;
  email: string;
  teamName: string;
}

interface TeamAssignmentRequestBody {
  matchId: string;
  date: string;
  time: string;
  location: string;
  notes?: string;
  recipients: TeamEmailRecipient[];
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

  let payload: TeamAssignmentRequestBody;
  try {
    payload = JSON.parse(event.body ?? '{}') as TeamAssignmentRequestBody;
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const validRecipients = (payload.recipients ?? []).filter(
    (recipient) => recipient.email?.trim() && recipient.name?.trim() && recipient.teamName?.trim()
  );

  if (!payload.matchId || !payload.date || !payload.time || !payload.location) {
    return json(400, { error: 'Missing match details' });
  }

  if (validRecipients.length === 0) {
    return json(200, { sentCount: 0, skippedCount: (payload.recipients ?? []).length });
  }

  const safeDate = escapeHtml(payload.date);
  const safeTime = escapeHtml(payload.time);
  const safeLocation = escapeHtml(payload.location);
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
      subject: 'Your team for the upcoming match: {{params.teamName}}',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <p>Hi {{params.playerName}},</p>
          <p>You have been assigned to <strong>{{params.teamName}}</strong>.</p>
          <p>
            <strong>Game date:</strong> ${safeDate}<br />
            <strong>Time:</strong> ${safeTime}<br />
            <strong>Location:</strong> ${safeLocation}
          </p>
          ${safeNotes ? `<p><strong>Notes:</strong> ${safeNotes}</p>` : ''}
          <p>See you at the match.</p>
        </div>
      `,
      textContent: [
        'Hi {{params.playerName}},',
        '',
        'You have been assigned to {{params.teamName}}.',
        `Game date: ${payload.date}`,
        `Time: ${payload.time}`,
        `Location: ${payload.location}`,
        payload.notes?.trim() ? `Notes: ${payload.notes.trim()}` : '',
        '',
        'See you at the match.',
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
          teamName: recipient.teamName,
        },
        subject: `Your team for the upcoming match: ${recipient.teamName}`,
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
