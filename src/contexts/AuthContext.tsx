import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { isAdminEmail } from '../lib/admins';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: 'admin' | 'player';
  playerId: string | null;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

async function ensureUserDoc(user: User): Promise<UserProfile> {
  const role: 'admin' | 'player' = isAdminEmail(user.email) ? 'admin' : 'player';
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      email: user.email ?? '',
      displayName: user.displayName ?? user.email ?? 'Player',
      photoURL: user.photoURL ?? null,
      role,
      playerId: role === 'player' ? user.uid : null,
      createdAt: serverTimestamp(),
    });

    if (role === 'player') {
      const playerRef = doc(db, 'players', user.uid);
      const playerSnap = await getDoc(playerRef);
      if (!playerSnap.exists()) {
        await setDoc(playerRef, {
          name: user.displayName ?? user.email ?? 'Player',
          nickname: '',
          position: '',
          status: 'active',
          avatar: user.photoURL ?? null,
          email: user.email ?? '',
          uid: user.uid,
          totalGoals: 0,
          totalAssists: 0,
          totalSaves: 0,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          createdAt: serverTimestamp(),
        });
      }
    }
  } else {
    const data = snap.data();
    if (data.role !== role) {
      await setDoc(userRef, { role }, { merge: true });
    }
  }

  const finalSnap = await getDoc(userRef);
  const data = finalSnap.data() ?? {};
  return {
    uid: user.uid,
    email: data.email ?? user.email ?? '',
    displayName: data.displayName ?? user.displayName ?? '',
    photoURL: data.photoURL ?? user.photoURL ?? null,
    role: data.role ?? role,
    playerId: data.playerId ?? (role === 'player' ? user.uid : null),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const profile = await ensureUserDoc(firebaseUser);
          setUserProfile(profile);
        } catch (err) {
          console.error('Failed to load user profile', err);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const isAdmin = userProfile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{ user, userProfile, loading, signInWithGoogle, signInWithEmail, signOut, isAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
}
