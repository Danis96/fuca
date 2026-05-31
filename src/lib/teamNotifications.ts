import { format } from 'date-fns';

export interface TeamEmailRecipient {
  name: string;
  email: string;
  teamName: string;
}

export interface TeamAssignmentEmailPayload {
  matchId: string;
  date: string;
  time: string;
  location: string;
  notes?: string;
  recipients: TeamEmailRecipient[];
}

export interface TeamAssignmentEmailResult {
  sentCount: number;
  skippedCount: number;
}

export interface MatchScheduleEmailRecipient {
  name: string;
  email: string;
}

export interface MatchScheduleEmailPayload {
  matchId: string;
  date: string;
  time: string;
  location: string;
  notes?: string;
  rsvpUrl: string;
  eventStartIso?: string;
  eventTimeZone?: string;
  recipients: MatchScheduleEmailRecipient[];
}

export interface MatchScheduleEmailResult {
  sentCount: number;
  skippedCount: number;
}

export interface MatchReminderEmailPayload {
  matchId: string;
  force?: boolean;
}

export interface MatchReminderEmailResult {
  sentCount: number;
  skippedCount: number;
  skippedReason?: string;
}

async function getErrorMessage(response: Response, fallback: string) {
  const errorText = await response.text();

  if (!errorText) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(errorText) as { error?: string };
    return parsed.error || fallback;
  } catch {
    return errorText;
  }
}

export async function sendTeamAssignmentEmails(payload: TeamAssignmentEmailPayload): Promise<TeamAssignmentEmailResult> {
  const response = await fetch('/api/send-team-assignment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to send team assignment emails'));
  }

  return (await response.json()) as TeamAssignmentEmailResult;
}

export async function sendMatchScheduleEmails(payload: MatchScheduleEmailPayload): Promise<MatchScheduleEmailResult> {
  const response = await fetch('/api/send-match-schedule', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to send match schedule emails'));
  }

  return (await response.json()) as MatchScheduleEmailResult;
}

export async function sendMatchReminderEmails(payload: MatchReminderEmailPayload): Promise<MatchReminderEmailResult> {
  const response = await fetch('/api/send-match-reminder', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to send match reminder emails'));
  }

  return (await response.json()) as MatchReminderEmailResult;
}

export function formatMatchEmailDate(date: Date): string {
  return format(date, 'EEEE, MMMM dd, yyyy');
}
