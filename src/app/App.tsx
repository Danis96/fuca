import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { DataProvider } from '../contexts/DataContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { LoginScreen } from './components/LoginScreen';
import { Layout } from './components/Layout';
import { DashboardHome } from './components/DashboardHome';
import { PlayersScreen } from './components/PlayersScreen';
import { MatchesScreen } from './components/MatchesScreen';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { PlayerProfileScreen } from './components/PlayerProfileScreen';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster position="top-center" richColors />
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4 shadow-[0_0_30px_rgba(16,185,129,0.4)]"></div>
          <motion.p
            className="text-gray-400 tracking-wider uppercase text-xs"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            Loading the pitch…
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <LoginScreen />
        </motion.div>
      </AnimatePresence>
    );
  }

  const pageKey = selectedPlayerId ? `player-${selectedPlayerId}` : currentPage;

  const renderPage = () => {
    if (selectedPlayerId) {
      return (
        <PlayerProfileScreen
          playerId={selectedPlayerId}
          onBack={() => setSelectedPlayerId(null)}
        />
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return <DashboardHome />;
      case 'players':
        return <PlayersScreen onSelectPlayer={setSelectedPlayerId} />;
      case 'matches':
        return <MatchesScreen />;
      case 'leaderboard':
        return <LeaderboardScreen onSelectPlayer={setSelectedPlayerId} />;
      default:
        return <DashboardHome />;
    }
  };

  return (
    <DataProvider>
      <Layout currentPage={currentPage} onNavigate={(page) => { setSelectedPlayerId(null); setCurrentPage(page); }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={pageKey}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </Layout>
    </DataProvider>
  );
}
