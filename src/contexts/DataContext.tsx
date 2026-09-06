import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MatchRecap, Player, Match, Goal, PlayerStatsLine, SaveEntry, Season, SeasonAwards } from '../types';
import { getAwardWinners, getResolvedMatchAwards, toFirestoreMatchAwards } from '../lib/matchAwards';
import { buildMatchRecap } from '../lib/matchRecap';
import { buildPlayerStats, getTotalPoints, mergePlayerStats, normalizePlayerStats } from '../lib/playerStats';

interface RecordResultOutcome {
  recap: MatchRecap;
}

interface DataContextType {
  seasons: Season[];
  activeSeason: Season;
  allMatches: Match[];
  allGoals: Goal[];
  players: Player[];
  matches: Match[];
  goals: Goal[];
  loading: boolean;

  getPlayersForSeason: (seasonId: string) => Player[];
  startNewSeason: (name: string) => Promise<string>;
  updateSeasonAwards: (seasonId: string, awards: SeasonAwards) => Promise<void>;

  addPlayer: (data: Omit<Player, 'id' | 'createdAt'>) => Promise<string>;
  updatePlayer: (id: string, data: Partial<Player>) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;

  addMatch: (data: Omit<Match, 'id' | 'seasonId' | 'createdAt'>) => Promise<string>;
  updateMatch: (id: string, data: Partial<Match>) => Promise<void>;
  deleteMatch: (id: string) => Promise<void>;

  addGoal: (data: Omit<Goal, 'id' | 'createdAt'>) => Promise<string>;
  deleteGoal: (id: string) => Promise<void>;

  recordResult: (
    matchId: string,
    teamAScore: number,
    teamBScore: number,
    goals: Array<Omit<Goal, 'id' | 'matchId' | 'createdAt'>>,
    saves: SaveEntry[],
    mvpId?: string
  ) => Promise<RecordResultOutcome>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const LEGACY_SEASON_ID = 'season-25-26';

const LEGACY_SEASON: Season = {
  id: LEGACY_SEASON_ID,
  name: '25/26',
  startYear: 2025,
  endYear: 2026,
  status: 'active',
  awards: { teamOfTheSeasonPlayerIds: [] },
  createdAt: new Date('2025-07-01T00:00:00.000Z'),
};

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

function toDate(value: any): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return new Date();
}

function toPlayerStatsLine(value: any): PlayerStatsLine {
  return normalizePlayerStats(value);
}

function getSeasonAdjustment(player: Player, seasonId: string) {
  const seasonAdjustment = player.seasonStatsAdjustments?.[seasonId];
  if (seasonAdjustment) return toPlayerStatsLine(seasonAdjustment);
  if (seasonId === LEGACY_SEASON_ID) return toPlayerStatsLine(player.manualStatsAdjustment);
  return toPlayerStatsLine(undefined);
}

function parseSeasonName(name: string) {
  const normalized = name.trim().replace(/^sezona\s+/i, '');
  const match = normalized.match(/^(\d{2})\/(\d{2})$/);
  if (!match) {
    throw new Error('Naziv sezone mora biti u formatu 26/27.');
  }

  const startYear = 2000 + Number(match[1]);
  const endYear = 2000 + Number(match[2]);
  if (endYear !== startYear + 1) {
    throw new Error('Sezona mora obuhvatati dvije uzastopne godine.');
  }

  return { name: normalized, startYear, endYear, id: `season-${match[1]}-${match[2]}` };
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [rawPlayers, setRawPlayers] = useState<Player[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [storedSeasons, setStoredSeasons] = useState<Season[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [loadingSeasons, setLoadingSeasons] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'players'), (snap) => {
      const list: Player[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: data.name ?? '',
          email: data.email ?? '',
          nickname: data.nickname ?? '',
          avatar: data.avatar ?? undefined,
          position: data.position ?? '',
          status: data.status ?? 'active',
          totalGoals: data.totalGoals ?? 0,
          totalAssists: data.totalAssists ?? 0,
          totalSaves: data.totalSaves ?? 0,
          cancellations: data.cancellations ?? 0,
          matchesPlayed: data.matchesPlayed ?? 0,
          wins: data.wins ?? 0,
          losses: data.losses ?? 0,
          draws: data.draws ?? 0,
          manualStatsAdjustment: toPlayerStatsLine(data.manualStatsAdjustment),
          seasonStatsAdjustments: Object.fromEntries(
            Object.entries(data.seasonStatsAdjustments ?? {}).map(([seasonId, stats]) => [
              seasonId,
              toPlayerStatsLine(stats),
            ])
          ),
          createdAt: toDate(data.createdAt),
        };
      });
      setRawPlayers(list);
      setLoadingPlayers(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'seasons'),
      (snap) => {
        const list: Season[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            name: data.name ?? d.id,
            startYear: data.startYear ?? 0,
            endYear: data.endYear ?? 0,
            status: data.status === 'completed' ? 'completed' : 'active',
            awards: {
              playerOfTheSeasonId: data.awards?.playerOfTheSeasonId ?? undefined,
              teamOfTheSeasonPlayerIds: Array.isArray(data.awards?.teamOfTheSeasonPlayerIds)
                ? data.awards.teamOfTheSeasonPlayerIds
                : [],
            },
            createdAt: toDate(data.createdAt),
            completedAt: data.completedAt ? toDate(data.completedAt) : undefined,
          };
        });
        setStoredSeasons(list);
        setLoadingSeasons(false);
      },
      (error) => {
        console.error('Failed to load seasons', error);
        setLoadingSeasons(false);
      }
    );
    return unsub;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'matches'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: Match[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          seasonId: data.seasonId ?? LEGACY_SEASON_ID,
          date: toDate(data.date),
          time: data.time ?? '',
          location: data.location ?? '',
          notes: data.notes ?? '',
          status: data.status ?? 'scheduled',
          kickoffAtIso: data.kickoffAtIso ?? undefined,
          eventTimeZone: data.eventTimeZone ?? undefined,
          teamA: {
            name: data.teamA?.name ?? 'Team A',
            playerIds: data.teamA?.playerIds ?? [],
            score: data.teamA?.score,
          },
          teamB: {
            name: data.teamB?.name ?? 'Team B',
            playerIds: data.teamB?.playerIds ?? [],
            score: data.teamB?.score,
          },
          rsvps: Array.isArray(data.rsvps)
            ? data.rsvps
                .map((entry: any) => ({
                  playerId: entry?.playerId ?? '',
                  status: entry?.status ?? 'maybe',
                  respondedAt: entry?.respondedAt ? toDate(entry.respondedAt) : undefined,
                }))
                .filter((entry) => entry.playerId)
            : [],
          saves: Array.isArray(data.saves)
            ? data.saves
                .map((entry: any) => ({
                  playerId: entry?.playerId ?? '',
                  saves: typeof entry?.saves === 'number' ? entry.saves : 0,
                }))
                .filter((entry) => entry.playerId)
            : [],
          mvpId: data.mvpId ?? undefined,
          awards: getResolvedMatchAwards(data.awards),
          recap: data.recap ?? undefined,
          createdAt: toDate(data.createdAt),
        };
      });
      setAllMatches(list);
      setLoadingMatches(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'goals'), (snap) => {
      const list: Goal[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          matchId: data.matchId,
          scorerId: data.scorerId,
          assistId: data.assistId,
          team: data.team,
          ownGoal: data.ownGoal === true,
          minute: data.minute,
          createdAt: toDate(data.createdAt),
        };
      });
      setAllGoals(list);
      setLoadingGoals(false);
    });
    return unsub;
  }, []);

  const seasons = useMemo(() => {
    const hasLegacySeason = storedSeasons.some((season) => season.id === LEGACY_SEASON_ID);
    const list = hasLegacySeason ? storedSeasons : [...storedSeasons, LEGACY_SEASON];
    return [...list].sort((a, b) => b.startYear - a.startYear);
  }, [storedSeasons]);

  const activeSeason = useMemo(
    () => seasons.find((season) => season.status === 'active') ?? seasons[0] ?? LEGACY_SEASON,
    [seasons]
  );

  const matches = useMemo(
    () => allMatches.filter((match) => match.seasonId === activeSeason.id),
    [activeSeason.id, allMatches]
  );
  const activeMatchIds = useMemo(() => new Set(matches.map((match) => match.id)), [matches]);
  const goals = useMemo(
    () => allGoals.filter((goal) => activeMatchIds.has(goal.matchId)),
    [activeMatchIds, allGoals]
  );

  const buildPlayersForSeason = useCallback((seasonId: string) => {
    const seasonMatches = allMatches.filter((match) => match.seasonId === seasonId);
    const matchIds = new Set(seasonMatches.map((match) => match.id));
    const seasonGoals = allGoals.filter((goal) => matchIds.has(goal.matchId));
    const derivedStatsByPlayerId = buildPlayerStats(rawPlayers, seasonMatches, seasonGoals);

    return rawPlayers.map((player) => ({
      ...player,
      ...mergePlayerStats(derivedStatsByPlayerId[player.id], getSeasonAdjustment(player, seasonId)),
      manualStatsAdjustment: getSeasonAdjustment(player, seasonId),
    }));
  }, [allGoals, allMatches, rawPlayers]);

  const players = useMemo(
    () => buildPlayersForSeason(activeSeason.id),
    [activeSeason.id, buildPlayersForSeason]
  );

  const addPlayer: DataContextType['addPlayer'] = async (data) => {
    const activeAdjustment = toPlayerStatsLine(data.manualStatsAdjustment);
    const ref = await addDoc(collection(db, 'players'), {
      ...data,
      manualStatsAdjustment: toPlayerStatsLine(undefined),
      seasonStatsAdjustments: { [activeSeason.id]: activeAdjustment },
      createdAt: serverTimestamp(),
    });
    return ref.id;
  };

  const updatePlayer: DataContextType['updatePlayer'] = async (id, data) => {
    const { id: _omit, createdAt: _c, ...rest } = data as any;
    if (rest.manualStatsAdjustment) {
      rest[`seasonStatsAdjustments.${activeSeason.id}`] = toPlayerStatsLine(rest.manualStatsAdjustment);
      delete rest.manualStatsAdjustment;
    }
    await updateDoc(doc(db, 'players', id), rest);
  };

  const deletePlayer: DataContextType['deletePlayer'] = async (id) => {
    const hasMatchHistory = allMatches.some(
      (match) => match.teamA.playerIds.includes(id) || match.teamB.playerIds.includes(id)
    );
    if (hasMatchHistory) {
      throw new Error('This player has season history. Mark the player inactive instead of deleting them.');
    }
    const batch = writeBatch(db);
    batch.delete(doc(db, 'players', id));
    batch.delete(doc(db, 'users', id));
    await batch.commit();
  };

  const addMatch: DataContextType['addMatch'] = async (data) => {
    const awards = getResolvedMatchAwards(data.awards);
    const ref = await addDoc(collection(db, 'matches'), {
      ...data,
      seasonId: activeSeason.id,
      awards: toFirestoreMatchAwards(awards),
      date: data.date,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  };

  const updateMatch: DataContextType['updateMatch'] = async (id, data) => {
    const { id: _omit, createdAt: _c, ...rest } = data as any;
    if (rest.awards) {
      rest.awards = toFirestoreMatchAwards(getResolvedMatchAwards(rest.awards));
    }
    await updateDoc(doc(db, 'matches', id), rest);
  };

  const deleteMatch: DataContextType['deleteMatch'] = async (id) => {
    await deleteDoc(doc(db, 'matches', id));
  };

  const addGoal: DataContextType['addGoal'] = async (data) => {
    const payload: Record<string, unknown> = {
      matchId: data.matchId,
      team: data.team,
      createdAt: serverTimestamp(),
    };
    if (data.scorerId !== undefined) payload.scorerId = data.scorerId;
    if (data.ownGoal === true) payload.ownGoal = true;
    if (data.ownGoal !== true && data.assistId !== undefined) payload.assistId = data.assistId;
    if (data.minute !== undefined) payload.minute = data.minute;

    const ref = await addDoc(collection(db, 'goals'), payload);
    return ref.id;
  };

  const deleteGoal: DataContextType['deleteGoal'] = async (id) => {
    await deleteDoc(doc(db, 'goals', id));
  };

  const recordResult: DataContextType['recordResult'] = async (
    matchId,
    teamAScore,
    teamBScore,
    newGoals,
    saves,
    mvpId
  ) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) throw new Error('Match not found');

    const batch = writeBatch(db);
    const existingGoals = goals.filter((goal) => goal.matchId === matchId);
    const goalTotals = newGoals.reduce(
      (totals, goal) => {
        if (goal.team === 'A') {
          totals.teamA += 1;
        } else {
          totals.teamB += 1;
        }
        return totals;
      },
      { teamA: 0, teamB: 0 }
    );

    if (teamAScore !== goalTotals.teamA || teamBScore !== goalTotals.teamB) {
      throw new Error('Final score must match the logged goals.');
    }

    const awards = getAwardWinners({
      awards: match.awards,
      goals: newGoals,
      saves,
      suggestedMvpId: mvpId,
      players,
    });
    const completedMatch: Match = {
      ...match,
      status: 'completed',
      teamA: {
        ...match.teamA,
        score: teamAScore,
      },
      teamB: {
        ...match.teamB,
        score: teamBScore,
      },
      saves,
      mvpId,
      awards,
    };
    const updatedMatches = [...matches.filter((entry) => entry.id !== matchId), completedMatch];
    const recap = buildMatchRecap({
      match: completedMatch,
      players,
      matches: updatedMatches,
      goals: newGoals,
      awards,
      saves,
      mvpId,
    });

    batch.update(doc(db, 'matches', matchId), {
      status: 'completed',
      'teamA.score': teamAScore,
      'teamB.score': teamBScore,
      saves,
      mvpId: mvpId ?? null,
      awards: toFirestoreMatchAwards(awards),
      recap,
    });

    for (const existingGoal of existingGoals) {
      batch.delete(doc(db, 'goals', existingGoal.id));
    }

    for (const g of newGoals) {
      const ref = doc(collection(db, 'goals'));
      const payload: Record<string, unknown> = {
        team: g.team,
        matchId,
        createdAt: serverTimestamp(),
      };
      if (g.scorerId !== undefined) payload.scorerId = g.scorerId;
      if (g.ownGoal === true) payload.ownGoal = true;
      if (g.ownGoal !== true && g.assistId !== undefined) payload.assistId = g.assistId;
      if (g.minute !== undefined) payload.minute = g.minute;
      batch.set(ref, payload);
    }

    await batch.commit();
    return { recap };
  };

  const startNewSeason: DataContextType['startNewSeason'] = async (requestedName) => {
    const parsed = parseSeasonName(requestedName);
    if (seasons.some((season) => season.id === parsed.id)) {
      throw new Error(`Sezona ${parsed.name} već postoji.`);
    }
    if (matches.some((match) => match.status === 'scheduled')) {
      throw new Error('Finish, cancel or delete scheduled matches before starting a new season.');
    }

    const pointsLeader = [...players]
      .filter((player) => player.matchesPlayed > 0 || getTotalPoints(player) !== 0)
      .sort((a, b) =>
        getTotalPoints(b) - getTotalPoints(a) ||
        b.totalGoals - a.totalGoals ||
        b.totalAssists - a.totalAssists ||
        b.wins - a.wins ||
        a.name.localeCompare(b.name)
      )[0];
    const finalAwards: SeasonAwards = {
      ...activeSeason.awards,
      playerOfTheSeasonId: activeSeason.awards.playerOfTheSeasonId ?? pointsLeader?.id,
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'seasons', activeSeason.id), {
      name: activeSeason.name,
      startYear: activeSeason.startYear,
      endYear: activeSeason.endYear,
      status: 'completed',
      awards: finalAwards,
      createdAt: activeSeason.createdAt,
      completedAt: serverTimestamp(),
    }, { merge: true });
    batch.set(doc(db, 'seasons', parsed.id), {
      name: parsed.name,
      startYear: parsed.startYear,
      endYear: parsed.endYear,
      status: 'active',
      awards: { teamOfTheSeasonPlayerIds: [] },
      createdAt: serverTimestamp(),
    });
    await batch.commit();
    return parsed.id;
  };

  const updateSeasonAwards: DataContextType['updateSeasonAwards'] = async (seasonId, awards) => {
    const season = seasons.find((entry) => entry.id === seasonId);
    if (!season) throw new Error('Season not found');
    await setDoc(doc(db, 'seasons', seasonId), {
      name: season.name,
      startYear: season.startYear,
      endYear: season.endYear,
      status: season.status,
      awards: {
        playerOfTheSeasonId: awards.playerOfTheSeasonId ?? null,
        teamOfTheSeasonPlayerIds: awards.teamOfTheSeasonPlayerIds,
      },
      createdAt: season.createdAt,
      ...(season.completedAt ? { completedAt: season.completedAt } : {}),
    }, { merge: true });
  };

  const loading = loadingPlayers || loadingMatches || loadingGoals || loadingSeasons;

  return (
    <DataContext.Provider
      value={{
        seasons,
        activeSeason,
        allMatches,
        allGoals,
        players,
        matches,
        goals,
        loading,
        getPlayersForSeason: buildPlayersForSeason,
        startNewSeason,
        updateSeasonAwards,
        addPlayer,
        updatePlayer,
        deletePlayer,
        addMatch,
        updateMatch,
        deleteMatch,
        addGoal,
        deleteGoal,
        recordResult,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
