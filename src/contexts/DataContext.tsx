import React, { createContext, useContext, useEffect, useState } from 'react';
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
import { Player, Match, Goal, SaveEntry } from '../types';
import { getAwardWinners, getResolvedMatchAwards, toFirestoreMatchAwards } from '../lib/matchAwards';

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
  ) => Promise<void>;
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
          createdAt: toDate(data.createdAt),
        };
      });
      setMatches(list);
      setLoadingMatches(false);
    });
    return unsub;
  }, []);

  const players = rawPlayers;

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
      createdAt: serverTimestamp(),
    });
    return ref.id;
  };

  const updatePlayer: DataContextType['updatePlayer'] = async (id, data) => {
    const { id: _omit, createdAt: _c, ...rest } = data as any;
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
    const ref = await addDoc(collection(db, 'goals'), {
      ...data,
      createdAt: serverTimestamp(),
    });
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
    const allPlayerIds = Array.from(new Set([...match.teamA.playerIds, ...match.teamB.playerIds]));

    const countGoalsByPlayer = (goalList: Array<Pick<Goal, 'scorerId' | 'assistId'>>) => {
      const goalCount: Record<string, number> = {};
      const assistCount: Record<string, number> = {};
      for (const goal of goalList) {
        if (goal.scorerId) {
          goalCount[goal.scorerId] = (goalCount[goal.scorerId] ?? 0) + 1;
        }
        if (goal.assistId) {
          assistCount[goal.assistId] = (assistCount[goal.assistId] ?? 0) + 1;
        }
      }
      return { goalCount, assistCount };
    };

    const countSavesByPlayer = (saveEntries: SaveEntry[]) => {
      const saveCount: Record<string, number> = {};
      for (const entry of saveEntries) {
        if (!entry.playerId || entry.saves <= 0) continue;
        saveCount[entry.playerId] = (saveCount[entry.playerId] ?? 0) + entry.saves;
      }
      return saveCount;
    };

    const getWinner = (aScore: number, bScore: number): 'A' | 'B' | 'D' =>
      aScore > bScore ? 'A' : bScore > aScore ? 'B' : 'D';

    const getResultForPlayer = (playerId: string, winner: 'A' | 'B' | 'D') => {
      const onTeamA = match.teamA.playerIds.includes(playerId);
      if (winner === 'D') return 'D' as const;
      return (winner === 'A') === onTeamA ? 'W' as const : 'L' as const;
    };

    const oldWinner =
      match.status === 'completed'
        ? getWinner(match.teamA.score ?? 0, match.teamB.score ?? 0)
        : null;
    const newWinner = getWinner(teamAScore, teamBScore);
    const { goalCount: oldGoalCount, assistCount: oldAssistCount } = countGoalsByPlayer(existingGoals);
    const { goalCount: newGoalCount, assistCount: newAssistCount } = countGoalsByPlayer(newGoals);
    const oldSaveCount = countSavesByPlayer(match.saves ?? []);
    const newSaveCount = countSavesByPlayer(saves);
    const awards = getAwardWinners({
      awards: match.awards,
      goals: newGoals,
      saves,
      suggestedMvpId: mvpId,
      players: rawPlayers,
    });

    batch.update(doc(db, 'matches', matchId), {
      status: 'completed',
      'teamA.score': teamAScore,
      'teamB.score': teamBScore,
      saves,
      mvpId: mvpId ?? null,
      awards: toFirestoreMatchAwards(awards),
    });

    for (const existingGoal of existingGoals) {
      batch.delete(doc(db, 'goals', existingGoal.id));
    }

    for (const g of newGoals) {
      const ref = doc(collection(db, 'goals'));
      const payload: Record<string, unknown> = {
        scorerId: g.scorerId,
        team: g.team,
        matchId,
        createdAt: serverTimestamp(),
      };
      if (g.assistId !== undefined) payload.assistId = g.assistId;
      if (g.minute !== undefined) payload.minute = g.minute;
      batch.set(ref, payload);
    }

    for (const playerId of allPlayerIds) {
      const player = rawPlayers.find((entry) => entry.id === playerId);
      if (!player) continue;

      const oldResult = oldWinner ? getResultForPlayer(playerId, oldWinner) : null;
      const newResult = getResultForPlayer(playerId, newWinner);

      batch.update(doc(db, 'players', playerId), {
        matchesPlayed:
          (player.matchesPlayed ?? 0) + (match.status === 'completed' ? 0 : 1),
        wins:
          (player.wins ?? 0)
          - (oldResult === 'W' ? 1 : 0)
          + (newResult === 'W' ? 1 : 0),
        losses:
          (player.losses ?? 0)
          - (oldResult === 'L' ? 1 : 0)
          + (newResult === 'L' ? 1 : 0),
        draws:
          (player.draws ?? 0)
          - (oldResult === 'D' ? 1 : 0)
          + (newResult === 'D' ? 1 : 0),
        totalGoals:
          (player.totalGoals ?? 0)
          - (oldGoalCount[playerId] ?? 0)
          + (newGoalCount[playerId] ?? 0),
        totalAssists:
          (player.totalAssists ?? 0)
          - (oldAssistCount[playerId] ?? 0)
          + (newAssistCount[playerId] ?? 0),
        totalSaves:
          (player.totalSaves ?? 0)
          - (oldSaveCount[playerId] ?? 0)
          + (newSaveCount[playerId] ?? 0),
      });
    }

    await batch.commit();
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
