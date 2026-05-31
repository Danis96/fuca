import { dispatchMatchReminder } from './_lib/matchReminder';

interface HandlerEvent {
  httpMethod?: string;
  body?: string | null;
}

interface ReminderPreviewPayload {
  email: string;
  playerName: string;
  teamName: string;
  teammateList: string;
  opponentTeamName: string;
  opponentList: string;
  date: string;
  time: string;
  location: string;
  countdownLabel: string;
  notes?: string;
}

interface ReminderManualRecipient {
  email: string;
  playerName: string;
  teamName: string;
  teammateList: string;
  opponentTeamName: string;
  opponentList: string;
}

interface ReminderManualPayload {
  date: string;
  time: string;
  location: string;
  countdownLabel: string;
  notes?: string;
  recipients: ReminderManualRecipient[];
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

async function sendReminderPreview(preview: ReminderPreviewPayload) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.TEAM_EMAIL_FROM;

  if (!brevoApiKey || !fromEmail) {
    throw new Error('Email service is not configured. Set BREVO_API_KEY and TEAM_EMAIL_FROM.');
  }

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
      to: [
        {
          email: preview.email,
          name: preview.playerName,
        },
      ],
      subject: `${preview.playerName}, kickoff in ${preview.countdownLabel} with ${preview.teamName}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <p>Hi ${escapeHtml(preview.playerName)},</p>
          <p>Your match starts in <strong>${escapeHtml(preview.countdownLabel)}</strong>.</p>
          <p>
            <strong>You are playing for:</strong> ${escapeHtml(preview.teamName)}<br />
            <strong>Date:</strong> ${escapeHtml(preview.date)}<br />
            <strong>Time:</strong> ${escapeHtml(preview.time)}<br />
            <strong>Location:</strong> ${escapeHtml(preview.location)}
          </p>
          <p><strong>Your teammates:</strong> ${escapeHtml(preview.teammateList)}</p>
          <p><strong>Opposition (${escapeHtml(preview.opponentTeamName)}):</strong> ${escapeHtml(preview.opponentList)}</p>
          ${preview.notes?.trim() ? `<p><strong>Notes:</strong> ${escapeHtml(preview.notes.trim())}</p>` : ''}
          <p>See you on the pitch.</p>
        </div>
      `,
      textContent: [
        `Hi ${preview.playerName},`,
        '',
        `Your match starts in ${preview.countdownLabel}.`,
        `You are playing for: ${preview.teamName}`,
        `Date: ${preview.date}`,
        `Time: ${preview.time}`,
        `Location: ${preview.location}`,
        `Your teammates: ${preview.teammateList}`,
        `Opposition (${preview.opponentTeamName}): ${preview.opponentList}`,
        preview.notes?.trim() ? `Notes: ${preview.notes.trim()}` : '',
        '',
        'See you on the pitch.',
      ]
        .filter(Boolean)
        .join('\n'),
    }),
  });

  if (!response.ok) {
    const details = await getProviderErrorDetails(response);
    throw new Error(`Email provider rejected request. ${details}`);
  }

  return {
    sentCount: 1,
    skippedCount: 0,
    mode: 'preview',
  };
}

async function sendManualReminder(payload: ReminderManualPayload) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.TEAM_EMAIL_FROM;

  if (!brevoApiKey || !fromEmail) {
    throw new Error('Email service is not configured. Set BREVO_API_KEY and TEAM_EMAIL_FROM.');
  }

  const validRecipients = (payload.recipients ?? []).filter(
    (recipient) =>
      recipient.email?.trim()
      && recipient.playerName?.trim()
      && recipient.teamName?.trim()
      && recipient.teammateList?.trim()
      && recipient.opponentTeamName?.trim()
      && recipient.opponentList?.trim()
  );

  if (validRecipients.length === 0) {
    return {
      sentCount: 0,
      skippedCount: (payload.recipients ?? []).length,
      skippedReason: 'no_playing_recipients',
    };
  }

  const safeDate = escapeHtml(payload.date);
  const safeTime = escapeHtml(payload.time);
  const safeLocation = escapeHtml(payload.location);
  const safeCountdown = escapeHtml(payload.countdownLabel);
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
      subject: `Match reminder: ${payload.date} at ${payload.time}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <p>Hi {{params.playerName}},</p>
          <p>Your match starts in <strong>${safeCountdown}</strong>.</p>
          <p>
            <strong>You are playing for:</strong> {{params.teamName}}<br />
            <strong>Date:</strong> ${safeDate}<br />
            <strong>Time:</strong> ${safeTime}<br />
            <strong>Location:</strong> ${safeLocation}
          </p>
          <p><strong>Your teammates:</strong> {{params.teammateList}}</p>
          <p><strong>Opposition ({{params.opponentTeamName}}):</strong> {{params.opponentList}}</p>
          ${safeNotes ? `<p><strong>Notes:</strong> ${safeNotes}</p>` : ''}
          <p>See you on the pitch.</p>
        </div>
      `,
      textContent: [
        'Hi {{params.playerName}},',
        '',
        `Your match starts in ${payload.countdownLabel}.`,
        'You are playing for: {{params.teamName}}',
        `Date: ${payload.date}`,
        `Time: ${payload.time}`,
        `Location: ${payload.location}`,
        'Your teammates: {{params.teammateList}}',
        'Opposition ({{params.opponentTeamName}}): {{params.opponentList}}',
        payload.notes?.trim() ? `Notes: ${payload.notes.trim()}` : '',
        '',
        'See you on the pitch.',
      ]
        .filter(Boolean)
        .join('\n'),
      messageVersions: validRecipients.map((recipient) => ({
        to: [
          {
            email: recipient.email,
            name: recipient.playerName,
          },
        ],
        params: {
          playerName: recipient.playerName,
          teamName: recipient.teamName,
          teammateList: recipient.teammateList,
          opponentList: recipient.opponentList,
          opponentTeamName: recipient.opponentTeamName,
        },
        subject: `${recipient.playerName}, kickoff in ${payload.countdownLabel} with ${recipient.teamName}`,
      })),
    }),
  });

  if (!response.ok) {
    const details = await getProviderErrorDetails(response);
    throw new Error(`Email provider rejected request. ${details}`);
  }

  return {
    sentCount: validRecipients.length,
    skippedCount: (payload.recipients ?? []).length - validRecipients.length,
    mode: 'manual',
  };
}

export const handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  let payload: {
    matchId?: string;
    force?: boolean;
    preview?: ReminderPreviewPayload;
    manual?: ReminderManualPayload;
  };
  try {
    payload = JSON.parse(event.body ?? '{}') as {
      matchId?: string;
      force?: boolean;
      preview?: ReminderPreviewPayload;
      manual?: ReminderManualPayload;
    };
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  if (payload.preview) {
    const preview = payload.preview;
    if (
      !preview.email?.trim()
      || !preview.playerName?.trim()
      || !preview.teamName?.trim()
      || !preview.teammateList?.trim()
      || !preview.opponentTeamName?.trim()
      || !preview.opponentList?.trim()
      || !preview.date?.trim()
      || !preview.time?.trim()
      || !preview.location?.trim()
      || !preview.countdownLabel?.trim()
    ) {
      return json(400, { error: 'Missing preview reminder fields' });
    }

    try {
      const result = await sendReminderPreview(preview);
      return json(200, result);
    } catch (error) {
      return json(500, {
        error: error instanceof Error ? error.message : 'Failed to send preview reminder',
      });
    }
  }

  if (payload.manual) {
    const manual = payload.manual;
    if (
      !manual.date?.trim()
      || !manual.time?.trim()
      || !manual.location?.trim()
      || !manual.countdownLabel?.trim()
      || !Array.isArray(manual.recipients)
    ) {
      return json(400, { error: 'Missing manual reminder fields' });
    }

    try {
      const result = await sendManualReminder(manual);
      return json(200, result);
    } catch (error) {
      return json(500, {
        error: error instanceof Error ? error.message : 'Failed to send manual reminder',
      });
    }
  }

  if (!payload.matchId) {
    return json(400, { error: 'Missing matchId' });
  }

  try {
    const result = await dispatchMatchReminder({
      matchId: payload.matchId,
      force: payload.force ?? false,
      source: 'manual',
    });
    return json(200, result);
  } catch (error) {
    return json(500, {
      error: error instanceof Error ? error.message : 'Failed to send reminder',
    });
  }
};
