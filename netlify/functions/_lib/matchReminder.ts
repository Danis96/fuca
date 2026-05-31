import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from './firebaseAdmin';

interface ReminderDispatchOptions {
  matchId: string;
  force?: boolean;
  source: 'manual' | 'scheduled';
}

interface ReminderDispatchResult {
  sentCount: number;
  skippedCount: number;
  skippedReason?: string;
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

function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function getTimeZoneParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number.parseInt(part.value, 10)])
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getTimeZoneParts(date, timeZone);
  const zonedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return zonedAsUtc - date.getTime();
}

function makeDateInTimeZone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
) {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = getTimeZoneOffsetMs(guess, timeZone);
  const adjusted = new Date(guess.getTime() - offset);
  const adjustedOffset = getTimeZoneOffsetMs(adjusted, timeZone);
  return adjustedOffset === offset
    ? adjusted
    : new Date(guess.getTime() - adjustedOffset);
}

function formatMatchDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatCountdown(minutesUntilKickoff: number) {
  if (minutesUntilKickoff <= 1) return 'less than a minute';
  const roundedMinutes = Math.max(1, Math.round(minutesUntilKickoff));
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  if (hours === 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }

  if (minutes === 0) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }

  return `${hours} hour${hours === 1 ? '' : 's'} ${minutes} minute${minutes === 1 ? '' : 's'}`;
}

function getKickoffDate(matchData: any) {
  const timeZone = matchData.eventTimeZone?.trim() || 'Europe/Sarajevo';
  const storedKickoff = typeof matchData.kickoffAtIso === 'string' ? new Date(matchData.kickoffAtIso) : null;
  if (storedKickoff && !Number.isNaN(storedKickoff.getTime())) {
    return { kickoffAt: storedKickoff, timeZone };
  }

  const matchDate = toDate(matchData.date);
  const timeText = typeof matchData.time === 'string' ? matchData.time : '';
  const [hourText = '0', minuteText = '0'] = timeText.split(':');
  const hour = Number.parseInt(hourText, 10);
  const minute = Number.parseInt(minuteText, 10);

  if (!matchDate || Number.isNaN(hour) || Number.isNaN(minute)) {
    return { kickoffAt: null, timeZone };
  }

  const parts = getTimeZoneParts(matchDate, timeZone);
  return {
    kickoffAt: makeDateInTimeZone(parts.year, parts.month, parts.day, hour, minute, timeZone),
    timeZone,
  };
}

function buildNameList(names: string[], emptyLabel: string) {
  if (names.length === 0) return emptyLabel;
  return names.join(', ');
}

export async function dispatchMatchReminder({
  matchId,
  force = false,
  source,
}: ReminderDispatchOptions): Promise<ReminderDispatchResult> {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.TEAM_EMAIL_FROM;

  if (!brevoApiKey || !fromEmail) {
    throw new Error('Email service is not configured. Set BREVO_API_KEY and TEAM_EMAIL_FROM.');
  }

  const db = getAdminDb();
  const matchRef = db.collection('matches').doc(matchId);
  const matchSnap = await matchRef.get();
  if (!matchSnap.exists) {
    return { sentCount: 0, skippedCount: 0, skippedReason: 'match_not_found' };
  }

  const matchData = matchSnap.data() ?? {};
  if (matchData.status !== 'scheduled') {
    return { sentCount: 0, skippedCount: 0, skippedReason: 'match_not_scheduled' };
  }

  const { kickoffAt, timeZone } = getKickoffDate(matchData);
  if (!kickoffAt) {
    return { sentCount: 0, skippedCount: 0, skippedReason: 'missing_kickoff' };
  }

  const minutesUntilKickoff = (kickoffAt.getTime() - Date.now()) / 60000;
  const reminderMeta = matchData.reminders?.personalized;
  const alreadySentForKickoff =
    reminderMeta?.kickoffAtIso === kickoffAt.toISOString() && reminderMeta?.sentAt;

  if (!force) {
    if (minutesUntilKickoff <= 0) {
      return { sentCount: 0, skippedCount: 0, skippedReason: 'match_started' };
    }
    if (minutesUntilKickoff > 60) {
      return { sentCount: 0, skippedCount: 0, skippedReason: 'outside_reminder_window' };
    }
    if (alreadySentForKickoff) {
      return { sentCount: 0, skippedCount: 0, skippedReason: 'already_sent' };
    }
  }

  const teamAPlayerIds = Array.isArray(matchData.teamA?.playerIds) ? matchData.teamA.playerIds : [];
  const teamBPlayerIds = Array.isArray(matchData.teamB?.playerIds) ? matchData.teamB.playerIds : [];
  const allPlayerIds = Array.from(new Set([...teamAPlayerIds, ...teamBPlayerIds])).filter(Boolean);
  const rsvpStatusByPlayer = new Map(
    Array.isArray(matchData.rsvps)
      ? matchData.rsvps
          .filter((entry: any) => entry?.playerId)
          .map((entry: any) => [entry.playerId, entry.status])
      : []
  );

  if (allPlayerIds.length === 0) {
    return { sentCount: 0, skippedCount: 0, skippedReason: 'no_assigned_players' };
  }

  const playerRefs = allPlayerIds.map((playerId) => db.collection('players').doc(playerId));
  const playerSnaps = await db.getAll(...playerRefs);
  const playersById = new Map(
    playerSnaps
      .filter((snap) => snap.exists)
      .map((snap) => [snap.id, snap.data() ?? {}])
  );

  const matchDateLabel = formatMatchDate(kickoffAt, timeZone);
  const countdownLabel = formatCountdown(minutesUntilKickoff);
  const timeLabel = typeof matchData.time === 'string' ? matchData.time : '';
  const location = typeof matchData.location === 'string' ? matchData.location : '';
  const safeDate = escapeHtml(matchDateLabel);
  const safeTime = escapeHtml(timeLabel);
  const safeLocation = escapeHtml(location);
  const safeNotes = matchData.notes?.trim() ? escapeHtml(matchData.notes.trim()) : '';

  const recipientConfigs = [
    ...teamAPlayerIds.map((playerId: string) => ({
      playerId,
      teamName: matchData.teamA?.name || 'Team A',
      teammateIds: teamAPlayerIds.filter((id: string) => id !== playerId),
      opponentIds: teamBPlayerIds,
      opponentTeamName: matchData.teamB?.name || 'Team B',
    })),
    ...teamBPlayerIds.map((playerId: string) => ({
      playerId,
      teamName: matchData.teamB?.name || 'Team B',
      teammateIds: teamBPlayerIds.filter((id: string) => id !== playerId),
      opponentIds: teamAPlayerIds,
      opponentTeamName: matchData.teamA?.name || 'Team A',
    })),
  ];

  const validRecipients = recipientConfigs
    .map((config) => {
      const player = playersById.get(config.playerId);
      const playerName = typeof player?.name === 'string' ? player.name.trim() : '';
      const playerEmail = typeof player?.email === 'string' ? player.email.trim() : '';
      const playerStatus = typeof player?.status === 'string' ? player.status : 'active';
      const rsvpStatus = rsvpStatusByPlayer.get(config.playerId);
      if (!playerName || !playerEmail) return null;
      if (playerStatus !== 'active') return null;
      if (rsvpStatus === 'out') return null;

      const teammateNames = config.teammateIds
        .map((id) => ({ id, player: playersById.get(id) }))
        .filter(({ id, player }) => {
          const teammateStatus = typeof player?.status === 'string' ? player.status : 'active';
          const teammateRsvp = rsvpStatusByPlayer.get(id);
          return teammateStatus === 'active' && teammateRsvp !== 'out';
        })
        .map(({ player }) => (typeof player?.name === 'string' ? player.name.trim() : ''))
        .filter(Boolean);
      const opponentNames = config.opponentIds
        .map((id) => ({ id, player: playersById.get(id) }))
        .filter(({ id, player }) => {
          const opponentStatus = typeof player?.status === 'string' ? player.status : 'active';
          const opponentRsvp = rsvpStatusByPlayer.get(id);
          return opponentStatus === 'active' && opponentRsvp !== 'out';
        })
        .map(({ player }) => (typeof player?.name === 'string' ? player.name.trim() : ''))
        .filter(Boolean);

      return {
        email: playerEmail,
        name: playerName,
        teamName: config.teamName,
        teammateList: buildNameList(teammateNames, 'No teammates assigned yet'),
        opponentList: buildNameList(opponentNames, 'No opposition assigned yet'),
        opponentTeamName: config.opponentTeamName,
      };
    })
    .filter(Boolean) as Array<{
      email: string;
      name: string;
      teamName: string;
      teammateList: string;
      opponentList: string;
      opponentTeamName: string;
    }>;

  if (validRecipients.length === 0) {
    return { sentCount: 0, skippedCount: recipientConfigs.length, skippedReason: 'no_playing_recipients' };
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
      subject: `Match reminder: ${matchDateLabel} at ${timeLabel}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <p>Hi {{params.playerName}},</p>
          <p>Your match starts in <strong>${escapeHtml(countdownLabel)}</strong>.</p>
          <p>
            <strong>You are playing for:</strong> {{params.teamName}}<br />
            <strong>Date:</strong> ${safeDate}<br />
            <strong>Time:</strong> ${safeTime}<br />
            <strong>Location:</strong> ${safeLocation}
          </p>
          <p><strong>Your teammates:</strong> {{params.teammateList}}</p>
          <p><strong>Opposition (${escapeHtml('{{params.opponentTeamName}}')}):</strong> {{params.opponentList}}</p>
          ${safeNotes ? `<p><strong>Notes:</strong> ${safeNotes}</p>` : ''}
          <p>See you on the pitch.</p>
        </div>
      `,
      textContent: [
        'Hi {{params.playerName}},',
        '',
        `Your match starts in ${countdownLabel}.`,
        'You are playing for: {{params.teamName}}',
        `Date: ${matchDateLabel}`,
        `Time: ${timeLabel}`,
        `Location: ${location}`,
        'Your teammates: {{params.teammateList}}',
        'Opposition ({{params.opponentTeamName}}): {{params.opponentList}}',
        matchData.notes?.trim() ? `Notes: ${matchData.notes.trim()}` : '',
        '',
        'See you on the pitch.',
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
          teammateList: recipient.teammateList,
          opponentList: recipient.opponentList,
          opponentTeamName: recipient.opponentTeamName,
        },
        subject: `${recipient.name}, kickoff in ${countdownLabel} with ${recipient.teamName}`,
      })),
    }),
  });

  if (!response.ok) {
    const details = await getProviderErrorDetails(response);
    throw new Error(`Email provider rejected request. ${details}`);
  }

  await matchRef.set(
    {
      kickoffAtIso: kickoffAt.toISOString(),
      eventTimeZone: timeZone,
      reminders: {
        personalized: {
          sentAt: FieldValue.serverTimestamp(),
          kickoffAtIso: kickoffAt.toISOString(),
          source,
          recipientCount: validRecipients.length,
        },
      },
    },
    { merge: true }
  );

  return {
    sentCount: validRecipients.length,
    skippedCount: recipientConfigs.length - validRecipients.length,
  };
}
