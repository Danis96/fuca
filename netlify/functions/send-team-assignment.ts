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

export const handler = async (event: { httpMethod?: string; body?: string | null }) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.TEAM_EMAIL_FROM;

  if (!resendApiKey || !fromEmail) {
    return json(500, {
      error: 'Email service is not configured. Set RESEND_API_KEY and TEAM_EMAIL_FROM.',
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

  const requests = validRecipients.map((recipient) => {
    const safeName = escapeHtml(recipient.name);
    const safeTeam = escapeHtml(recipient.teamName);
    const safeDate = escapeHtml(payload.date);
    const safeTime = escapeHtml(payload.time);
    const safeLocation = escapeHtml(payload.location);
    const safeNotes = payload.notes?.trim() ? escapeHtml(payload.notes.trim()) : '';

    return fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipient.email,
        subject: `Your team for the upcoming match: ${recipient.teamName}`,
        text: [
          `Hi ${recipient.name},`,
          '',
          `You have been assigned to ${recipient.teamName}.`,
          `Game date: ${payload.date}`,
          `Time: ${payload.time}`,
          `Location: ${payload.location}`,
          safeNotes ? `Notes: ${payload.notes?.trim()}` : '',
          '',
          'See you at the match.',
        ]
          .filter(Boolean)
          .join('\n'),
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
            <p>Hi ${safeName},</p>
            <p>You have been assigned to <strong>${safeTeam}</strong>.</p>
            <p>
              <strong>Game date:</strong> ${safeDate}<br />
              <strong>Time:</strong> ${safeTime}<br />
              <strong>Location:</strong> ${safeLocation}
            </p>
            ${safeNotes ? `<p><strong>Notes:</strong> ${safeNotes}</p>` : ''}
            <p>See you at the match.</p>
          </div>
        `,
      }),
    });
  });

  const responses = await Promise.all(requests);
  const failed = responses.filter((response) => !response.ok);

  if (failed.length > 0) {
    const details = await failed[0].text();
    return json(502, {
      error: `Email provider rejected ${failed.length} message(s). ${details}`,
    });
  }

  return json(200, {
    sentCount: validRecipients.length,
    skippedCount: (payload.recipients ?? []).length - validRecipients.length,
  });
};
