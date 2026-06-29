import { MatchRecap } from '../../src/types';

interface MatchRecapRecipient {
  name: string;
  email: string;
}

interface MatchRecapRequestBody {
  matchId: string;
  date: string;
  time: string;
  location: string;
  recap: MatchRecap;
  recipients: MatchRecapRecipient[];
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

function renderRecapHtml(payload: MatchRecapRequestBody) {
  const topPerformers = payload.recap.topPerformers.length
    ? payload.recap.topPerformers
        .map(
          (performer) =>
            `<li><strong>${escapeHtml(performer.playerName)}</strong> <span style="color:#6b7280;">${escapeHtml(performer.statLine)}</span></li>`
        )
        .join('')
    : '<li>No standout individual stat line was logged.</li>';

  const awardWinners = payload.recap.awardWinners
    .map(
      (award) =>
        `<li><strong>${escapeHtml(award.title)}</strong>: ${escapeHtml(award.winnerName)}</li>`
    )
    .join('');

  const streaks = payload.recap.standoutStreaks.length
    ? payload.recap.standoutStreaks
        .map((streak) => `<li>${escapeHtml(streak.text)}</li>`)
        .join('')
    : '<li>No major streak shifted after this result.</li>';

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <p>Hi {{params.playerName}},</p>
      <p>The post-match recap is in.</p>
      <p>
        <strong>${escapeHtml(payload.recap.headline)}</strong><br />
        ${escapeHtml(payload.recap.summary)}
      </p>
      <p>
        <strong>Match:</strong> ${escapeHtml(payload.recap.scoreline)}<br />
        <strong>Date:</strong> ${escapeHtml(payload.date)}<br />
        <strong>Time:</strong> ${escapeHtml(payload.time)}<br />
        <strong>Location:</strong> ${escapeHtml(payload.location)}
      </p>
      <p><strong>Turning point:</strong> ${escapeHtml(payload.recap.turningPoint)}</p>
      <p><strong>MVP:</strong> ${escapeHtml(payload.recap.mvp?.playerName ?? 'Not assigned')}</p>
      <p><strong>Top performers</strong></p>
      <ul>${topPerformers}</ul>
      <p><strong>Award winners</strong></p>
      <ul>${awardWinners}</ul>
      <p><strong>Standout streaks</strong></p>
      <ul>${streaks}</ul>
    </div>
  `;
}

function renderRecapText(payload: MatchRecapRequestBody) {
  return [
    'Hi {{params.playerName}},',
    '',
    'The post-match recap is in.',
    payload.recap.headline,
    payload.recap.summary,
    '',
    `Match: ${payload.recap.scoreline}`,
    `Date: ${payload.date}`,
    `Time: ${payload.time}`,
    `Location: ${payload.location}`,
    '',
    `Turning point: ${payload.recap.turningPoint}`,
    `MVP: ${payload.recap.mvp?.playerName ?? 'Not assigned'}`,
    '',
    'Top performers:',
    ...(payload.recap.topPerformers.length
      ? payload.recap.topPerformers.map((performer) => `- ${performer.playerName}: ${performer.statLine}`)
      : ['- No standout individual stat line was logged.']),
    '',
    'Award winners:',
    ...payload.recap.awardWinners.map((award) => `- ${award.title}: ${award.winnerName}`),
    '',
    'Standout streaks:',
    ...(payload.recap.standoutStreaks.length
      ? payload.recap.standoutStreaks.map((streak) => `- ${streak.text}`)
      : ['- No major streak shifted after this result.']),
  ].join('\n');
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

  let payload: MatchRecapRequestBody;
  try {
    payload = JSON.parse(event.body ?? '{}') as MatchRecapRequestBody;
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  if (!payload.matchId || !payload.date || !payload.time || !payload.location || !payload.recap?.headline) {
    return json(400, { error: 'Missing recap details' });
  }

  const validRecipients = (payload.recipients ?? []).filter(
    (recipient) => recipient.email?.trim() && recipient.name?.trim()
  );

  if (validRecipients.length === 0) {
    return json(200, { sentCount: 0, skippedCount: (payload.recipients ?? []).length });
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
      subject: `Post-match recap: ${payload.recap.scoreline}`,
      htmlContent: renderRecapHtml(payload),
      textContent: renderRecapText(payload),
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
