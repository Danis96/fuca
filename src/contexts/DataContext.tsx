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
import { Player, Match, Goal } from '../types';

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

  recordResult: (
    matchId: string,
    teamAScore: number,
    teamBScore: number,
    goals: Array<Omit<Goal, 'id' | 'matchId' | 'createdAt'>>
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
  const [players, setPlayers] = useState<Player[]>([]);
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
          nickname: data.nickname ?? '',
          avatar: data.avatar ?? undefined,
          position: data.position ?? '',
          status: data.status ?? 'active',
          totalGoals: data.totalGoals ?? 0,
          totalAssists: data.totalAssists ?? 0,
          matchesPlayed: data.matchesPlayed ?? 0,
          wins: data.wins ?? 0,
          losses: data.losses ?? 0,
          draws: data.draws ?? 0,
          createdAt: toDate(data.createdAt),
        };
      });
      setPlayers(list);
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
          createdAt: toDate(data.createdAt),
        };
      });
      setMatches(list);
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
    const ref = await addDoc(collection(db, 'matches'), {
      ...data,
      date: data.date,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  };

  const updateMatch: DataContextType['updateMatch'] = async (id, data) => {
    const { id: _omit, createdAt: _c, ...rest } = data as any;
    await updateDoc(doc(db, 'matches', id), rest);
  };

  const deleteMatch: DataContextType['deleteMatch'] = async (id) => {
    await deleteDoc(doc(db, 'matches', id));
  };

  const recordResult: DataContextType['recordResult'] = async (
    matchId,
    teamAScore,
    teamBScore,
    newGoals
  ) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) throw new Error('Match not found');

    const batch = writeBatch(db);

    batch.update(doc(db, 'matches', matchId), {
      status: 'completed',
      'teamA.score': teamAScore,
      'teamB.score': teamBScore,
    });

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

    const allPlayerIds = [...match.teamA.playerIds, ...match.teamB.playerIds];
    const winner: 'A' | 'B' | 'D' =
      teamAScore > teamBScore ? 'A' : teamBScore > teamAScore ? 'B' : 'D';

    const goalCount: Record<string, number> = {};
    const assistCount: Record<string, number> = {};
    for (const g of newGoals) {
      if (g.scorerId) goalCount[g.scorerId] = (goalCount[g.scorerId] ?? 0) + 1;
      if (g.assistId) assistCount[g.assistId] = (assistCount[g.assistId] ?? 0) + 1;
    }

    for (const pid of allPlayerIds) {
      const player = players.find((p) => p.id === pid);
      if (!player) continue;
      const onTeamA = match.teamA.playerIds.includes(pid);
      const result: 'W' | 'L' | 'D' =
        winner === 'D' ? 'D' : (winner === 'A') === onTeamA ? 'W' : 'L';

      batch.update(doc(db, 'players', pid), {
        matchesPlayed: (player.matchesPlayed ?? 0) + 1,
        wins: (player.wins ?? 0) + (result === 'W' ? 1 : 0),
        losses: (player.losses ?? 0) + (result === 'L' ? 1 : 0),
        draws: (player.draws ?? 0) + (result === 'D' ? 1 : 0),
        totalGoals: (player.totalGoals ?? 0) + (goalCount[pid] ?? 0),
        totalAssists: (player.totalAssists ?? 0) + (assistCount[pid] ?? 0),
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
        recordResult,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
