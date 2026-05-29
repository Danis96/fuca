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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runInBatches<T>(tasks: Array<() => Promise<T>>, batchSize: number, delayMs: number) {
  const results: T[] = [];

  for (let start = 0; start < tasks.length; start += batchSize) {
    const batch = tasks.slice(start, start + batchSize);
    results.push(...(await Promise.all(batch.map((task) => task()))));

    if (start + batchSize < tasks.length) {
      await sleep(delayMs);
    }
  }

  return results;
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

  const requests = validRecipients.map((recipient) => {
    const safeName = escapeHtml(recipient.name);

    return () =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: recipient.email,
          subject: `New match scheduled: ${payload.date} at ${payload.time}`,
          text: [
            `Hi ${recipient.name},`,
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
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
              <p>Hi ${safeName},</p>
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
        }),
      });
  });

  const responses = await runInBatches(requests, 4, 1000);
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
