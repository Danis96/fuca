import { Goal, Match, Player } from '../types';
import { getSavePoints } from './playerStats';

type ResultCode = 'W' | 'D' | 'L';

function getCompletedMatches(matches: Match[]) {
  return matches
    .filter((match) => match.status === 'completed')
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

function getPlayerResult(match: Match, playerId: string): ResultCode | null {
  const onTeamA = match.teamA.playerIds.includes(playerId);
  const onTeamB = match.teamB.playerIds.includes(playerId);
  if (!onTeamA && !onTeamB) return null;

  const teamAScore = match.teamA.score ?? 0;
  const teamBScore = match.teamB.score ?? 0;

  if (teamAScore === teamBScore) return 'D';
  if ((onTeamA && teamAScore > teamBScore) || (onTeamB && teamBScore > teamAScore)) return 'W';
  return 'L';
}

export function getPlayerRecentForm(matches: Match[], playerId: string, limit = 5) {
  return getCompletedMatches(matches)
    .filter((match) => match.teamA.playerIds.includes(playerId) || match.teamB.playerIds.includes(playerId))
    .slice(-limit)
    .reverse()
    .map((match) => ({
      match,
      result: getPlayerResult(match, playerId) ?? 'D',
    }));
}

export function getPlayerCurrentStreak(matches: Match[], playerId: string) {
  const recent = getCompletedMatches(matches)
    .filter((match) => match.teamA.playerIds.includes(playerId) || match.teamB.playerIds.includes(playerId))
    .reverse();

  if (!recent.length) {
    return { type: 'none' as const, count: 0 };
  }

  const first = getPlayerResult(recent[0], playerId);
  if (!first) {
    return { type: 'none' as const, count: 0 };
  }

  let count = 0;
  for (const match of recent) {
    if (getPlayerResult(match, playerId) !== first) break;
    count += 1;
  }

  return { type: first, count };
}

export function getTopFormPlayer(players: Player[], matches: Match[], goals: Goal[]) {
  return getTopFormPlayers(players, matches, goals, 1)[0] ?? null;
}

export function getTopFormPlayers(players: Player[], matches: Match[], goals: Goal[], limit = 2) {
  const recentMatches = getCompletedMatches(matches).slice(-3);
  if (!recentMatches.length) return [];

  const recentMatchIds = new Set(recentMatches.map((match) => match.id));
  const scoreByPlayer: Record<string, number> = {};

  for (const goal of goals) {
    if (!recentMatchIds.has(goal.matchId)) continue;
    scoreByPlayer[goal.scorerId] = (scoreByPlayer[goal.scorerId] ?? 0) + 3;
    if (goal.assistId) {
      scoreByPlayer[goal.assistId] = (scoreByPlayer[goal.assistId] ?? 0) + 2;
    }
  }

  for (const match of recentMatches) {
    for (const saveEntry of match.saves ?? []) {
      scoreByPlayer[saveEntry.playerId] =
        (scoreByPlayer[saveEntry.playerId] ?? 0) + getSavePoints(saveEntry.saves);
    }
    if (match.mvpId) {
      scoreByPlayer[match.mvpId] = (scoreByPlayer[match.mvpId] ?? 0) + 2;
    }
  }

  return Object.entries(scoreByPlayer)
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score > 0)
    .slice(0, limit)
    .map(([playerId, score]) => ({
      player: players.find((player) => player.id === playerId) ?? null,
      score,
      windowSize: recentMatches.length,
    }));
}

export function getBiggestWin(matches: Match[]) {
  const best = getCompletedMatches(matches)
    .map((match) => ({
      match,
      margin: Math.abs((match.teamA.score ?? 0) - (match.teamB.score ?? 0)),
    }))
    .sort((a, b) => b.margin - a.margin)[0];

  if (!best) return null;
  return best;
}

export function getBestPartnership(players: Player[], matches: Match[]) {
  return getBestPartnerships(players, matches, 1)[0] ?? null;
}

export function getBestPartnerships(players: Player[], matches: Match[], limit = 2) {
  const pairStats: Record<string, { pair: [string, string]; wins: number; matches: number }> = {};

  for (const match of getCompletedMatches(matches)) {
    const teams = [match.teamA.playerIds, match.teamB.playerIds];
    for (const team of teams) {
      for (let i = 0; i < team.length; i += 1) {
        for (let j = i + 1; j < team.length; j += 1) {
          const pair: [string, string] = [team[i], team[j]].sort() as [string, string];
          const key = pair.join(':');
          if (!pairStats[key]) {
            pairStats[key] = { pair, wins: 0, matches: 0 };
          }
          pairStats[key].matches += 1;

          const aScore = match.teamA.score ?? 0;
          const bScore = match.teamB.score ?? 0;
          const isTeamA = match.teamA.playerIds.includes(pair[0]);
          const won = (isTeamA && aScore > bScore) || (!isTeamA && bScore > aScore);
          if (won) pairStats[key].wins += 1;
        }
      }
    }
  }

  return Object.values(pairStats)
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.matches - a.matches;
    })
    .slice(0, limit)
    .map((entry) => ({
      players: entry.pair.map((id) => players.find((player) => player.id === id) ?? null),
      wins: entry.wins,
      matches: entry.matches,
    }));
}

export function getPlayerMvpCount(matches: Match[], playerId: string) {
  return matches.filter((match) => match.status === 'completed' && match.mvpId === playerId).length;
}

export function getLatestWeeklyAwardWinners(players: Player[], matches: Match[]) {
  const latestMatch = [...getCompletedMatches(matches)].reverse().find((match) => match.awards);
  if (!latestMatch?.awards) return null;

  const items = ([
    { key: 'scorer', fallback: 'Baller of the Week' },
    { key: 'assist', fallback: 'Assist Wizard' },
    { key: 'goalkeeper', fallback: 'Brick Wall' },
    { key: 'mvp', fallback: 'Certified Menace' },
  ] as const).map(({ key, fallback }) => ({
    key,
    title: latestMatch.awards?.[key].title || fallback,
    winner:
      latestMatch.awards?.[key].winnerId
        ? players.find((player) => player.id === latestMatch.awards?.[key].winnerId) ?? null
        : null,
  }));

  return {
    match: latestMatch,
    items,
  };
}
