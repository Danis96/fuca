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
  manualStatsAdjustment?: PlayerStatsLine;
  createdAt: Date;
}

export type MatchAwardKey = 'scorer' | 'assist' | 'goalkeeper' | 'mvp';

export interface MatchRecapPerson {
  playerId: string | null;
  playerName: string;
}

export interface MatchRecapTopPerformer extends MatchRecapPerson {
  statLine: string;
  impactScore: number;
}

export interface MatchRecapAwardWinner {
  key: MatchAwardKey;
  title: string;
  winnerId: string | null;
  winnerName: string;
}

export interface MatchRecapStreak extends MatchRecapPerson {
  label: string;
  text: string;
}

export interface MatchRecap {
  headline: string;
  summary: string;
  scoreline: string;
  turningPoint: string;
  mvp: MatchRecapPerson | null;
  topPerformers: MatchRecapTopPerformer[];
  awardWinners: MatchRecapAwardWinner[];
  standoutStreaks: MatchRecapStreak[];
  generatedAtIso: string;
}

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
  kickoffAtIso?: string;
  eventTimeZone?: string;
  teamA: TeamAssignment;
  teamB: TeamAssignment;
  rsvps?: MatchRsvp[];
  saves?: SaveEntry[];
  mvpId?: string;
  awards?: MatchAwards;
  recap?: MatchRecap;
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
  scorerId?: string;
  assistId?: string;
  team: 'A' | 'B';
  ownGoal?: boolean;
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
