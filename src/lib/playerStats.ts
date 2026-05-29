import { Goal, Match, Player, PlayerStatsLine, SaveEntry } from '../types';

export const EMPTY_PLAYER_STATS: PlayerStatsLine = {
  totalGoals: 0,
  totalAssists: 0,
  totalSaves: 0,
  matchesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
};

export function getSavePoints(totalSaves: number) {
  return Math.floor(totalSaves / 4);
}

export function getTotalPoints(player: Pick<Player, 'totalGoals' | 'totalAssists' | 'totalSaves' | 'matchesPlayed'>) {
  return player.totalGoals + player.totalAssists + player.matchesPlayed + getSavePoints(player.totalSaves);
}

export function buildPlayerStats(
  players: Array<Pick<Player, 'id'>>,
  matches: Match[],
  goals: Goal[]
): Record<string, PlayerStatsLine> {
  const statsById = Object.fromEntries(
    players.map((player) => [player.id, { ...EMPTY_PLAYER_STATS }])
  ) as Record<string, PlayerStatsLine>;

  const ensureStats = (playerId: string) => {
    if (!statsById[playerId]) {
      statsById[playerId] = { ...EMPTY_PLAYER_STATS };
    }
    return statsById[playerId];
  };

  for (const goal of goals) {
    if (goal.scorerId) {
      ensureStats(goal.scorerId).totalGoals += 1;
    }
    if (goal.assistId) {
      ensureStats(goal.assistId).totalAssists += 1;
    }
  }

  for (const match of matches) {
    if (match.status !== 'completed') continue;

    const teamAScore = match.teamA.score ?? 0;
    const teamBScore = match.teamB.score ?? 0;
    const winner: 'A' | 'B' | 'D' =
      teamAScore > teamBScore ? 'A' : teamBScore > teamAScore ? 'B' : 'D';

    for (const playerId of match.teamA.playerIds) {
      const stats = ensureStats(playerId);
      stats.matchesPlayed += 1;
      if (winner === 'A') stats.wins += 1;
      else if (winner === 'B') stats.losses += 1;
      else stats.draws += 1;
    }

    for (const playerId of match.teamB.playerIds) {
      const stats = ensureStats(playerId);
      stats.matchesPlayed += 1;
      if (winner === 'B') stats.wins += 1;
      else if (winner === 'A') stats.losses += 1;
      else stats.draws += 1;
    }

    for (const saveEntry of match.saves ?? []) {
      if (!saveEntry.playerId || saveEntry.saves <= 0) continue;
      ensureStats(saveEntry.playerId).totalSaves += saveEntry.saves;
    }
  }

  return statsById;
}

interface MatchMvpInput {
  playerIds: string[];
  goals: Array<Pick<Goal, 'scorerId' | 'assistId'>>;
  saves: SaveEntry[];
}

export function getSuggestedMvpId({ playerIds, goals, saves }: MatchMvpInput) {
  const scoreByPlayer: Record<string, number> = {};

  for (const playerId of playerIds) {
    scoreByPlayer[playerId] = 0;
  }

  for (const goal of goals) {
    if (goal.scorerId) {
      scoreByPlayer[goal.scorerId] = (scoreByPlayer[goal.scorerId] ?? 0) + 3;
    }
    if (goal.assistId) {
      scoreByPlayer[goal.assistId] = (scoreByPlayer[goal.assistId] ?? 0) + 2;
    }
  }

  for (const entry of saves) {
    if (!entry.playerId || entry.saves <= 0) continue;
    scoreByPlayer[entry.playerId] =
      (scoreByPlayer[entry.playerId] ?? 0) + getSavePoints(entry.saves);
  }

  const ranked = Object.entries(scoreByPlayer)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });

  if (!ranked.length || ranked[0][1] <= 0) {
    return undefined;
  }

  return ranked[0][0];
}
