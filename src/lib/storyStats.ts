import { Goal, Match, Player } from '../types';
import { getSavePoints } from './playerStats';

type ResultCode = 'W' | 'D' | 'L';
type StoryFeedItem = {
  id: string;
  headline: string;
  subline: string;
};

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

export function getBestPartnership(players: Player[], matches: Match[], goals: Goal[]) {
  return getBestPartnerships(players, matches, goals, 1)[0] ?? null;
}

export function getBestPartnerships(players: Player[], matches: Match[], goals: Goal[], limit = 2) {
  const completedMatches = getCompletedMatches(matches);
  const pairStats: Record<string, {
    pair: [string, string];
    wins: number;
    matches: number;
    linkedGoals: number;
    directionCounts: Record<string, number>;
  }> = {};

  for (const match of completedMatches) {
    const teams = [match.teamA.playerIds, match.teamB.playerIds];
    for (const team of teams) {
      for (let i = 0; i < team.length; i += 1) {
        for (let j = i + 1; j < team.length; j += 1) {
          const pair: [string, string] = [team[i], team[j]].sort() as [string, string];
          const key = pair.join(':');
          if (!pairStats[key]) {
            pairStats[key] = { pair, wins: 0, matches: 0, linkedGoals: 0, directionCounts: {} };
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

  for (const goal of goals) {
    if (!goal.assistId || !goal.scorerId) continue;

    const match = completedMatches.find((entry) => entry.id === goal.matchId);
    if (!match) continue;

    const teamPlayers = goal.team === 'A' ? match.teamA.playerIds : match.teamB.playerIds;
    const sameTeam =
      teamPlayers.includes(goal.scorerId) && teamPlayers.includes(goal.assistId);
    if (!sameTeam) continue;

    const pair: [string, string] = [goal.scorerId, goal.assistId].sort() as [string, string];
    const key = pair.join(':');
    if (!pairStats[key]) continue;

    pairStats[key].linkedGoals += 1;
    const directionKey = `${goal.assistId}->${goal.scorerId}`;
    pairStats[key].directionCounts[directionKey] = (pairStats[key].directionCounts[directionKey] ?? 0) + 1;
  }

  return Object.values(pairStats)
    .filter((entry) => entry.linkedGoals > 0)
    .sort((a, b) => {
      const scoreA = a.linkedGoals * 5 + a.wins * 2 + a.matches;
      const scoreB = b.linkedGoals * 5 + b.wins * 2 + b.matches;
      if (scoreB !== scoreA) return scoreB - scoreA;
      if (b.linkedGoals !== a.linkedGoals) return b.linkedGoals - a.linkedGoals;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.matches - a.matches;
    })
    .slice(0, limit)
    .map((entry) => {
      const topDirection = Object.entries(entry.directionCounts).sort((a, b) => b[1] - a[1])[0];
      const reverseDirections = Object.keys(entry.directionCounts);

      return {
        players: entry.pair.map((id) => players.find((player) => player.id === id) ?? null),
        wins: entry.wins,
        matches: entry.matches,
        linkedGoals: entry.linkedGoals,
        topDirection: topDirection
          ? {
              assistId: topDirection[0].split('->')[0],
              scorerId: topDirection[0].split('->')[1],
              count: topDirection[1],
            }
          : null,
        isTwoWay: reverseDirections.length > 1,
        chemistryScore: entry.linkedGoals * 5 + entry.wins * 2 + entry.matches,
      };
    });
}

export function getPlayerMvpCount(matches: Match[], playerId: string) {
  return matches.filter((match) => match.status === 'completed' && match.mvpId === playerId).length;
}

export function getLatestWeeklyAwardWinners(players: Player[], matches: Match[]) {
  const latestMatch = [...getCompletedMatches(matches)].reverse().find((match) => match.awards);
  if (!latestMatch?.awards) return null;

  const items = ([
    { key: 'scorer', fallback: 'Week Top Scorer' },
    { key: 'assist', fallback: 'Assist Wizard' },
    { key: 'goalkeeper', fallback: 'Week Top Goalkeeper' },
    { key: 'mvp', fallback: 'Player of the Week' },
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

export function getDailyStoryFeed(
  players: Player[],
  matches: Match[],
  goals: Goal[],
  now = new Date(),
  limit = 4,
) {
  const completedMatches = getCompletedMatches(matches);
  const recentMatches = completedMatches.slice(-3);
  const upcomingMatch = matches
    .filter((match) => match.status === 'scheduled')
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null;
  const topScorer = [...players].sort((a, b) => b.totalGoals - a.totalGoals)[0] ?? null;
  const topAssister = [...players].sort((a, b) => b.totalAssists - a.totalAssists)[0] ?? null;
  const topFormPlayer = getTopFormPlayer(players, matches, goals);
  const biggestWin = getBiggestWin(matches);
  const bestPartnership = getBestPartnership(players, matches, goals);
  const latestAwards = getLatestWeeklyAwardWinners(players, matches);
  const activePlayers = players.filter((player) => player.status === 'active');
  const latestMatch = completedMatches[completedMatches.length - 1] ?? null;
  const streakLeaders = players
    .map((player) => ({
      player,
      streak: getPlayerCurrentStreak(matches, player.id),
    }))
    .filter((entry) => entry.streak.count > 0 && entry.streak.type !== 'none')
    .sort((a, b) => b.streak.count - a.streak.count);
  const winStreakLeader = streakLeaders.find((entry) => entry.streak.type === 'W') ?? null;
  const drawStreakLeader = streakLeaders.find((entry) => entry.streak.type === 'D') ?? null;
  const makeItem = (id: string, headline: string, subline: string): StoryFeedItem => ({
    id,
    headline,
    subline,
  });

  const candidates: StoryFeedItem[] = [];

  if (topScorer && topScorer.totalGoals > 0) {
    candidates.push(
      makeItem(
        'top-scorer',
        `${topScorer.name} cannot stop scoring`,
        `${topScorer.totalGoals} goals have pushed them to the top of the scoring chart.`,
      ),
      makeItem(
        'golden-boot',
        `${topScorer.name} sets the pace in the golden boot race`,
        `The league-leading total stands at ${topScorer.totalGoals} goals.`,
      ),
    );
  }

  if (topAssister && topAssister.totalAssists > 0) {
    candidates.push(
      makeItem(
        'top-assister',
        `${topAssister.name} has taken over the assist race`,
        `${topAssister.totalAssists} assists have turned them into the league's chief creator.`,
      ),
      makeItem(
        'playmaker-watch',
        `${topAssister.name} keeps picking defenses apart`,
        `No one has matched their ${topAssister.totalAssists} assists so far.`,
      ),
    );
  }

  if (topFormPlayer?.player) {
    candidates.push(
      makeItem(
        'form-king',
        `${topFormPlayer.player.name} is the hottest player in the league`,
        `${topFormPlayer.score} form points across the last ${topFormPlayer.windowSize} matches says it all.`,
      ),
      makeItem(
        'heat-check',
        `${topFormPlayer.player.name} is putting together a real hot streak`,
        `Recent production has made them the name everyone is chasing right now.`,
      ),
    );
  }

  if (bestPartnership?.players[0] && bestPartnership?.players[1]) {
    candidates.push(
      makeItem(
        'best-partnership',
        `${bestPartnership.players[0].name} and ${bestPartnership.players[1].name} are becoming the league's favorite link-up`,
        `${bestPartnership.linkedGoals} combined scoring connections already stand out.`,
      ),
    );
  }

  if (bestPartnership?.topDirection) {
    const assister = players.find((player) => player.id === bestPartnership.topDirection?.assistId);
    const scorer = players.find((player) => player.id === bestPartnership.topDirection?.scorerId);
    if (assister && scorer) {
      candidates.push(
        makeItem(
          'combo-route',
          `${assister.name} to ${scorer.name} is turning into a signature move`,
          `That connection has already delivered ${bestPartnership.topDirection.count} goals.`,
        ),
      );
    }
  }

  if (biggestWin && biggestWin.margin > 0) {
    candidates.push(
      makeItem(
        'biggest-win',
        `${biggestWin.margin}-goal margin sends a message to the rest of the league`,
        `The loudest result of the season came at ${biggestWin.match.location}.`,
      ),
    );
  }

  if (latestAwards?.items.find((item) => item.key === 'mvp')?.winner) {
    const mvpWinner = latestAwards.items.find((item) => item.key === 'mvp')?.winner;
    if (mvpWinner) {
      candidates.push(
        makeItem(
          'latest-mvp',
          `${mvpWinner.name} walks away with the latest MVP honors`,
          `That award came out of the most recent completed match at ${latestAwards.match.location}.`,
        ),
      );
    }
  }

  if (latestAwards?.items.find((item) => item.key === 'scorer')?.winner) {
    const scorerWinner = latestAwards.items.find((item) => item.key === 'scorer')?.winner;
    const scorerTitle = latestAwards.items.find((item) => item.key === 'scorer')?.title;
    if (scorerWinner && scorerTitle) {
      candidates.push(
        makeItem(
          'award-scorer',
          `${scorerWinner.name} claims this week's scoring honors`,
          `${scorerTitle} belongs to them right now.`,
        ),
      );
    }
  }

  if (latestAwards?.items.find((item) => item.key === 'assist')?.winner) {
    const assistWinner = latestAwards.items.find((item) => item.key === 'assist')?.winner;
    const assistTitle = latestAwards.items.find((item) => item.key === 'assist')?.title;
    if (assistWinner && assistTitle) {
      candidates.push(
        makeItem(
          'award-assist',
          `${assistWinner.name} earns the latest playmaker honors`,
          `${assistTitle} is theirs after the latest round of matches.`,
        ),
      );
    }
  }

  if (winStreakLeader && winStreakLeader.streak.count >= 2) {
    candidates.push(
      makeItem(
        'win-streak',
        `${winStreakLeader.player.name} is building a win streak worth watching`,
        `${winStreakLeader.streak.count} straight wins have them carrying real momentum.`,
      ),
    );
  }

  if (drawStreakLeader && drawStreakLeader.streak.count >= 2) {
    candidates.push(
      makeItem(
        'draw-streak',
        `${drawStreakLeader.player.name} keeps getting dragged into tight finishes`,
        `${drawStreakLeader.streak.count} straight draws tell the story.`,
      ),
    );
  }

  if (latestMatch) {
    candidates.push(
      makeItem(
        'latest-result',
        `${latestMatch.location} just produced a ${latestMatch.teamA.score ?? 0}-${latestMatch.teamB.score ?? 0} final`,
        `The latest matchday has already shifted the league conversation.`,
      ),
    );
  }

  if (upcomingMatch) {
    candidates.push(
      makeItem(
        'next-match',
        `${upcomingMatch.location} is next on the calendar`,
        `The next league night lands on ${upcomingMatch.date.toLocaleDateString()}.`,
      ),
    );
  }

  if (completedMatches.length >= 3) {
    candidates.push(
      makeItem(
        'season-volume',
        `${completedMatches.length} matches in and the race is starting to take shape`,
        `The sample is finally big enough for the leaderboard battles to feel real.`,
      ),
    );
  }

  if (activePlayers.length >= 8) {
    candidates.push(
      makeItem(
        'active-squad',
        `${activePlayers.length} active players are feeding a crowded title race`,
        `Depth across the league is making every leaderboard harder to predict.`,
      ),
    );
  }

  if (players.length >= 10) {
    candidates.push(
      makeItem(
        'player-pool',
        `${players.length} players are now part of the season picture`,
        `There are enough names in the mix for new storylines every week.`,
      ),
    );
  }

  if (recentMatches.length >= 2) {
    candidates.push(
      makeItem(
        'recent-run',
        `Recent matchdays are generating new storylines fast`,
        `${recentMatches.length} completed matches in the latest window have shaken up the board.`,
      ),
    );
  }

  if (!candidates.length) {
    candidates.push(
      makeItem(
        'season-waiting',
        'The league is waiting for its first real headline',
        'A few completed matches will turn this feed into something worth watching.',
      ),
    );
  }

  const dayIndex = Math.floor(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000,
  );
  const rotationStart = candidates.length ? dayIndex % candidates.length : 0;

  return Array.from({ length: Math.min(limit, candidates.length) }, (_, index) => {
    return candidates[(rotationStart + index) % candidates.length];
  });
}
