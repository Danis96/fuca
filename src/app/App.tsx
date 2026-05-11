import { useState } from 'react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { DataProvider } from '../contexts/DataContext';
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
    <AuthProvider>
      <Toaster position="top-center" richColors />
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

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
      <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
        {renderPage()}
      </Layout>
    </DataProvider>
  );
}
