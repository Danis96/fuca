export interface Player {
  id: string;
  name: string;
  email: string;
  nickname?: string;
  avatar?: string;
  position?: string;
  status: 'active' | 'inactive';
  totalGoals: number;
  totalAssists: number;
  totalSaves: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: Date;
}

export type MatchAwardKey = 'scorer' | 'assist' | 'goalkeeper' | 'mvp';

export interface MatchAward {
  title: string;
  winnerId?: string;
}

export interface MatchAwards {
  scorer: MatchAward;
  assist: MatchAward;
  goalkeeper: MatchAward;
  mvp: MatchAward;
}

export interface Match {
  id: string;
  date: Date;
  time: string;
  location: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  teamA: TeamAssignment;
  teamB: TeamAssignment;
  rsvps?: MatchRsvp[];
  saves?: SaveEntry[];
  mvpId?: string;
  awards?: MatchAwards;
  createdAt: Date;
}

export interface TeamAssignment {
  name: string;
  playerIds: string[];
  score?: number;
}

export interface Goal {
  id: string;
  matchId: string;
  scorerId: string;
  assistId?: string;
  team: 'A' | 'B';
  minute?: number;
  createdAt: Date;
}

export interface MatchResult {
  matchId: string;
  teamAScore: number;
  teamBScore: number;
  goals: Goal[];
  saves?: SaveEntry[];
  mvpId?: string;
}

export interface SaveEntry {
  playerId: string;
  saves: number;
}

export type MatchRsvpStatus = 'in' | 'maybe' | 'out';

export interface MatchRsvp {
  playerId: string;
  status: MatchRsvpStatus;
  respondedAt?: Date;
}

export interface PlayerStatsLine {
  totalGoals: number;
  totalAssists: number;
  totalSaves: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}
