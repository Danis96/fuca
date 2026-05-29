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

export async function sendTeamAssignmentEmails(payload: TeamAssignmentEmailPayload): Promise<TeamAssignmentEmailResult> {
  const response = await fetch('/api/send-team-assignment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const parsed = JSON.parse(errorText) as { error?: string };
      throw new Error(parsed.error || 'Failed to send team assignment emails');
    } catch {
      throw new Error(errorText || 'Failed to send team assignment emails');
    }
  }

  return (await response.json()) as TeamAssignmentEmailResult;
}

export function formatMatchEmailDate(date: Date): string {
  return format(date, 'EEEE, MMMM dd, yyyy');
}
