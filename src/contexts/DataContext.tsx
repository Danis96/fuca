import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MatchRecap, Player, Match, Goal, PlayerStatsLine, SaveEntry } from '../types';
import { getAwardWinners, getResolvedMatchAwards, toFirestoreMatchAwards } from '../lib/matchAwards';
import { buildMatchRecap } from '../lib/matchRecap';
import { buildPlayerStats, mergePlayerStats, normalizePlayerStats } from '../lib/playerStats';

interface RecordResultOutcome {
  recap: MatchRecap;
}

interface DataContextType {
  players: Player[];
  matches: Match[];
  goals: Goal[];
  loading: boolean;

  addPlayer: (data: Omit<Player, 'id' | 'createdAt'>) => Promise<string>;
  updatePlayer: (id: string, data: Partial<Player>) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;

  addMatch: (data: Omit<Match, 'id' | 'createdAt'>) => Promise<string>;
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

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [rawPlayers, setRawPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingGoals, setLoadingGoals] = useState(true);

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
          matchesPlayed: data.matchesPlayed ?? 0,
          wins: data.wins ?? 0,
          losses: data.losses ?? 0,
          draws: data.draws ?? 0,
          manualStatsAdjustment: toPlayerStatsLine(data.manualStatsAdjustment),
          createdAt: toDate(data.createdAt),
        };
      });
      setRawPlayers(list);
      setLoadingPlayers(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'matches'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: Match[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
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
      setMatches(list);
      setLoadingMatches(false);
    });
    return unsub;
  }, []);

  const players = useMemo(() => {
    const derivedStatsByPlayerId = buildPlayerStats(rawPlayers, matches, goals);

    return rawPlayers.map((player) => ({
      ...player,
      ...mergePlayerStats(derivedStatsByPlayerId[player.id], player.manualStatsAdjustment),
      manualStatsAdjustment: toPlayerStatsLine(player.manualStatsAdjustment),
    }));
  }, [rawPlayers, matches, goals]);

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
      setGoals(list);
      setLoadingGoals(false);
    });
    return unsub;
  }, []);

  const addPlayer: DataContextType['addPlayer'] = async (data) => {
    const ref = await addDoc(collection(db, 'players'), {
      ...data,
      manualStatsAdjustment: toPlayerStatsLine(data.manualStatsAdjustment),
      createdAt: serverTimestamp(),
    });
    return ref.id;
  };

  const updatePlayer: DataContextType['updatePlayer'] = async (id, data) => {
    const { id: _omit, createdAt: _c, ...rest } = data as any;
    if (rest.manualStatsAdjustment) {
      rest.manualStatsAdjustment = toPlayerStatsLine(rest.manualStatsAdjustment);
    }
    await updateDoc(doc(db, 'players', id), rest);
  };

  const deletePlayer: DataContextType['deletePlayer'] = async (id) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'players', id));
    batch.delete(doc(db, 'users', id));
    await batch.commit();
  };

  const addMatch: DataContextType['addMatch'] = async (data) => {
    const awards = getResolvedMatchAwards(data.awards);
    const ref = await addDoc(collection(db, 'matches'), {
      ...data,
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

  const loading = loadingPlayers || loadingMatches || loadingGoals;

  return (
    <DataContext.Provider
      value={{
        players,
        matches,
        goals,
        loading,
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
