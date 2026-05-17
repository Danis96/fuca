export interface Player {
  id: string;
  name: string;
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

export interface Match {
  id: string;
  date: Date;
  time: string;
  location: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  teamA: TeamAssignment;
  teamB: TeamAssignment;
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
