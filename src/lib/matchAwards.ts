import { Goal, Match, MatchAwards, MatchAwardKey, Player, SaveEntry } from '../types';

export const DEFAULT_MATCH_AWARDS: MatchAwards = {
  scorer: { title: 'Week Top Scorer' },
  assist: { title: 'Assist Wizard' },
  goalkeeper: { title: 'Week Top Goalkeeper' },
  mvp: { title: 'Player of the Week' },
};

const LEGACY_AWARD_TITLES: Partial<Record<keyof MatchAwards, string[]>> = {
  scorer: ['Baller of the Week'],
  goalkeeper: ['Brick Wall'],
  mvp: ['Certified Menace'],
};

function resolveAwardTitle(key: keyof MatchAwards, title: string | undefined) {
  const trimmed = title?.trim();
  if (!trimmed) return DEFAULT_MATCH_AWARDS[key].title;

  if (LEGACY_AWARD_TITLES[key]?.includes(trimmed)) {
    return DEFAULT_MATCH_AWARDS[key].title;
  }

  return trimmed;
}

function rankEntries<T extends string>(
  totals: Record<T, number>,
  playersById?: Map<string, Pick<Player, 'id' | 'name'>>
) {
  return Object.entries(totals).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];

    const aName = playersById?.get(a[0])?.name ?? a[0];
    const bName = playersById?.get(b[0])?.name ?? b[0];
    return aName.localeCompare(bName);
  });
}

export function getResolvedMatchAwards(
  input: Partial<MatchAwards> | undefined
): MatchAwards {
  return {
    scorer: {
      title: resolveAwardTitle('scorer', input?.scorer?.title),
      winnerId: input?.scorer?.winnerId,
    },
    assist: {
      title: resolveAwardTitle('assist', input?.assist?.title),
      winnerId: input?.assist?.winnerId,
    },
    goalkeeper: {
      title: resolveAwardTitle('goalkeeper', input?.goalkeeper?.title),
      winnerId: input?.goalkeeper?.winnerId,
    },
    mvp: {
      title: resolveAwardTitle('mvp', input?.mvp?.title),
      winnerId: input?.mvp?.winnerId,
    },
  };
}

export function toFirestoreMatchAwards(awards: MatchAwards) {
  return {
    scorer: {
      title: awards.scorer.title,
      ...(awards.scorer.winnerId ? { winnerId: awards.scorer.winnerId } : {}),
    },
    assist: {
      title: awards.assist.title,
      ...(awards.assist.winnerId ? { winnerId: awards.assist.winnerId } : {}),
    },
    goalkeeper: {
      title: awards.goalkeeper.title,
      ...(awards.goalkeeper.winnerId ? { winnerId: awards.goalkeeper.winnerId } : {}),
    },
    mvp: {
      title: awards.mvp.title,
      ...(awards.mvp.winnerId ? { winnerId: awards.mvp.winnerId } : {}),
    },
  };
}

export function getAwardWinners({
  awards,
  goals,
  saves,
  suggestedMvpId,
  players,
}: {
  awards?: Partial<MatchAwards>;
  goals: Array<Pick<Goal, 'scorerId' | 'assistId'>>;
  saves: SaveEntry[];
  suggestedMvpId?: string;
  players?: Array<Pick<Player, 'id' | 'name'>>;
}) {
  const goalCount: Record<string, number> = {};
  const assistCount: Record<string, number> = {};
  const saveCount: Record<string, number> = {};
  const playersById = new Map(players?.map((player) => [player.id, player]) ?? []);

  for (const goal of goals) {
    if (goal.scorerId) {
      goalCount[goal.scorerId] = (goalCount[goal.scorerId] ?? 0) + 1;
    }
    if (goal.assistId) {
      assistCount[goal.assistId] = (assistCount[goal.assistId] ?? 0) + 1;
    }
  }

  for (const saveEntry of saves) {
    if (!saveEntry.playerId || saveEntry.saves <= 0) continue;
    saveCount[saveEntry.playerId] = (saveCount[saveEntry.playerId] ?? 0) + saveEntry.saves;
  }

  const topScorer = rankEntries(goalCount, playersById)[0];
  const topAssister = rankEntries(assistCount, playersById)[0];
  const topGoalkeeper = rankEntries(saveCount, playersById)[0];
  const resolved = getResolvedMatchAwards(awards);

  return {
    scorer: {
      ...resolved.scorer,
      winnerId: topScorer && topScorer[1] > 0 ? topScorer[0] : undefined,
    },
    assist: {
      ...resolved.assist,
      winnerId: topAssister && topAssister[1] > 0 ? topAssister[0] : undefined,
    },
    goalkeeper: {
      ...resolved.goalkeeper,
      winnerId: topGoalkeeper && topGoalkeeper[1] > 0 ? topGoalkeeper[0] : undefined,
    },
    mvp: {
      ...resolved.mvp,
      winnerId: suggestedMvpId,
    },
  } satisfies MatchAwards;
}

export function getPlayerAwardCounts(matches: Match[], playerId: string) {
  const counts: Record<MatchAwardKey, number> = {
    scorer: 0,
    assist: 0,
    goalkeeper: 0,
    mvp: 0,
  };

  for (const match of matches) {
    if (match.status !== 'completed' || !match.awards) continue;

    for (const key of Object.keys(counts) as MatchAwardKey[]) {
      if (match.awards[key].winnerId === playerId) {
        counts[key] += 1;
      }
    }
  }

  return counts;
}
