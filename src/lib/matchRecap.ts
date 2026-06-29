import { getPlayerCurrentStreak } from './storyStats';
import { getSavePoints } from './playerStats';
import { Goal, Match, MatchAwardKey, MatchAwards, MatchRecap, MatchRecapAwardWinner, MatchRecapPerson, MatchRecapStreak, MatchRecapTopPerformer, Player, SaveEntry } from '../types';

function getPlayerName(playersById: Map<string, Player>, playerId: string | null | undefined, fallback = 'Unknown player') {
  if (!playerId) return fallback;
  return playersById.get(playerId)?.name ?? fallback;
}

function formatMinute(minute: number | undefined) {
  return typeof minute === 'number' && Number.isFinite(minute) ? ` in the ${minute}'` : '';
}

function formatScoreline(match: Match) {
  return `${match.teamA.name} ${match.teamA.score ?? 0}-${match.teamB.score ?? 0} ${match.teamB.name}`;
}

function buildHeadline(match: Match) {
  const teamAScore = match.teamA.score ?? 0;
  const teamBScore = match.teamB.score ?? 0;

  if (teamAScore === teamBScore) {
    return `${match.teamA.name} and ${match.teamB.name} played out a ${teamAScore}-${teamBScore} draw`;
  }

  const winner = teamAScore > teamBScore ? match.teamA : match.teamB;
  const loser = winner === match.teamA ? match.teamB : match.teamA;
  const winnerScore = Math.max(teamAScore, teamBScore);
  const loserScore = Math.min(teamAScore, teamBScore);
  return `${winner.name} beat ${loser.name} ${winnerScore}-${loserScore}`;
}

function buildSummary(match: Match, mvp: MatchRecapPerson | null) {
  const location = match.location ? ` at ${match.location}` : '';
  if (mvp) {
    return `${mvp.playerName} took MVP honors as ${formatScoreline(match)} wrapped up${location}.`;
  }

  return `${formatScoreline(match)} wrapped up${location} with awards and form lines shifting again.`;
}

function buildTurningPoint(match: Match, goals: Array<Pick<Goal, 'team' | 'scorerId' | 'minute'>>) {
  const sortedGoals = [...goals].sort((a, b) => {
    const minuteDelta = (a.minute ?? Number.MAX_SAFE_INTEGER) - (b.minute ?? Number.MAX_SAFE_INTEGER);
    return minuteDelta !== 0 ? minuteDelta : 0;
  });
  const finalTeamAScore = match.teamA.score ?? 0;
  const finalTeamBScore = match.teamB.score ?? 0;

  if (sortedGoals.length === 0) {
    return finalTeamAScore === finalTeamBScore
      ? 'Neither side found a breakthrough, so the clean sheets became the story.'
      : 'The match was decided without a logged goal timeline, but the final margin held up.'
  }

  if (finalTeamAScore === finalTeamBScore) {
    const equalizer = sortedGoals[sortedGoals.length - 1];
    const teamName = equalizer.team === 'A' ? match.teamA.name : match.teamB.name;
    return `${teamName}'s last reply${formatMinute(equalizer.minute)} locked the draw in place.`;
  }

  const winningTeam = finalTeamAScore > finalTeamBScore ? 'A' : 'B';
  let runningTeamA = 0;
  let runningTeamB = 0;

  for (let index = 0; index < sortedGoals.length; index += 1) {
    const goal = sortedGoals[index];
    if (goal.team === 'A') runningTeamA += 1;
    else runningTeamB += 1;

    const winnerLeadsNow =
      winningTeam === 'A' ? runningTeamA > runningTeamB : runningTeamB > runningTeamA;
    if (!winnerLeadsNow) continue;

    let leadHeld = true;
    let futureTeamA = runningTeamA;
    let futureTeamB = runningTeamB;
    for (let futureIndex = index + 1; futureIndex < sortedGoals.length; futureIndex += 1) {
      if (sortedGoals[futureIndex].team === 'A') futureTeamA += 1;
      else futureTeamB += 1;

      const winnerStillAhead =
        winningTeam === 'A' ? futureTeamA > futureTeamB : futureTeamB > futureTeamA;
      if (!winnerStillAhead) {
        leadHeld = false;
        break;
      }
    }

    if (leadHeld) {
      const teamName = goal.team === 'A' ? match.teamA.name : match.teamB.name;
      return `${teamName} grabbed the decisive lead${formatMinute(goal.minute)}, and it never swung back.`;
    }
  }

  const finalGoal = sortedGoals[sortedGoals.length - 1];
  const teamName = finalGoal.team === 'A' ? match.teamA.name : match.teamB.name;
  return `${teamName}'s final strike${formatMinute(finalGoal.minute)} ended up separating the sides.`;
}

function buildTopPerformers({
  match,
  playersById,
  goals,
  saves,
  mvpId,
}: {
  match: Match;
  playersById: Map<string, Player>;
  goals: Array<Pick<Goal, 'scorerId' | 'assistId'>>;
  saves: SaveEntry[];
  mvpId?: string;
}) {
  const statsByPlayer = new Map<string, { goals: number; assists: number; saves: number; score: number }>();

  const ensurePlayer = (playerId: string) => {
    if (!statsByPlayer.has(playerId)) {
      statsByPlayer.set(playerId, { goals: 0, assists: 0, saves: 0, score: 0 });
    }

    return statsByPlayer.get(playerId)!;
  };

  for (const playerId of [...match.teamA.playerIds, ...match.teamB.playerIds]) {
    ensurePlayer(playerId);
  }

  for (const goal of goals) {
    if (goal.scorerId) {
      const scorer = ensurePlayer(goal.scorerId);
      scorer.goals += 1;
      scorer.score += 3;
    }

    if (goal.assistId) {
      const assister = ensurePlayer(goal.assistId);
      assister.assists += 1;
      assister.score += 2;
    }
  }

  for (const saveEntry of saves) {
    if (!saveEntry.playerId || saveEntry.saves <= 0) continue;
    const keeper = ensurePlayer(saveEntry.playerId);
    keeper.saves += saveEntry.saves;
    keeper.score += getSavePoints(saveEntry.saves);
  }

  if (mvpId) {
    ensurePlayer(mvpId).score += 2;
  }

  return [...statsByPlayer.entries()]
    .filter(([, stats]) => stats.score > 0 || stats.goals > 0 || stats.assists > 0 || stats.saves > 0)
    .sort((a, b) => {
      if (b[1].score !== a[1].score) return b[1].score - a[1].score;
      if (b[1].goals !== a[1].goals) return b[1].goals - a[1].goals;
      if (b[1].assists !== a[1].assists) return b[1].assists - a[1].assists;
      return b[1].saves - a[1].saves;
    })
    .slice(0, 3)
    .map(([playerId, stats]) => {
      const parts: string[] = [];
      if (stats.goals > 0) parts.push(`${stats.goals} goal${stats.goals === 1 ? '' : 's'}`);
      if (stats.assists > 0) parts.push(`${stats.assists} assist${stats.assists === 1 ? '' : 's'}`);
      if (stats.saves > 0) parts.push(`${stats.saves} save${stats.saves === 1 ? '' : 's'}`);

      return {
        playerId,
        playerName: getPlayerName(playersById, playerId),
        statLine: parts.join(' · ') || 'MVP impact',
        impactScore: stats.score,
      } satisfies MatchRecapTopPerformer;
    });
}

function buildAwardWinners(awards: MatchAwards, playersById: Map<string, Player>) {
  const orderedKeys: MatchAwardKey[] = ['scorer', 'assist', 'goalkeeper', 'mvp'];

  return orderedKeys.map((key) => {
    const winnerId = awards[key].winnerId ?? null;

    return {
      key,
      title: awards[key].title,
      winnerId,
      winnerName: winnerId ? getPlayerName(playersById, winnerId) : 'No winner assigned',
    } satisfies MatchRecapAwardWinner;
  });
}

function buildStandoutStreaks(match: Match, matches: Match[], playersById: Map<string, Player>) {
  const participantIds = [...match.teamA.playerIds, ...match.teamB.playerIds];

  const streaks = participantIds
    .map((playerId) => {
      const streak = getPlayerCurrentStreak(matches, playerId);
      return { playerId, streak };
    })
    .filter((entry) => entry.streak.count >= 2 && entry.streak.type !== 'none')
    .sort((a, b) => b.streak.count - a.streak.count)
    .slice(0, 3)
    .map((entry) => {
      const label =
        entry.streak.type === 'W' ? 'Win streak' : entry.streak.type === 'L' ? 'Losing streak' : 'Draw streak';
      const resultWord =
        entry.streak.type === 'W' ? 'wins' : entry.streak.type === 'L' ? 'losses' : 'draws';

      return {
        playerId: entry.playerId,
        playerName: getPlayerName(playersById, entry.playerId),
        label,
        text: `${getPlayerName(playersById, entry.playerId)} is now on ${entry.streak.count} straight ${resultWord}.`,
      } satisfies MatchRecapStreak;
    });

  return streaks;
}

export function buildMatchRecap({
  match,
  players,
  matches,
  goals,
  awards,
  saves,
  mvpId,
}: {
  match: Match;
  players: Player[];
  matches: Match[];
  goals: Array<Pick<Goal, 'team' | 'scorerId' | 'assistId' | 'minute'>>;
  awards: MatchAwards;
  saves: SaveEntry[];
  mvpId?: string;
}) {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const mvp = mvpId
    ? {
        playerId: mvpId,
        playerName: getPlayerName(playersById, mvpId),
      }
    : null;

  return {
    headline: buildHeadline(match),
    summary: buildSummary(match, mvp),
    scoreline: formatScoreline(match),
    turningPoint: buildTurningPoint(match, goals),
    mvp,
    topPerformers: buildTopPerformers({ match, playersById, goals, saves, mvpId }),
    awardWinners: buildAwardWinners(awards, playersById),
    standoutStreaks: buildStandoutStreaks(match, matches, playersById),
    generatedAtIso: new Date().toISOString(),
  } satisfies MatchRecap;
}
