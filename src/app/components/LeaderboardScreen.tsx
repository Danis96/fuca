import { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Trophy, Target, TrendingUp, Award, Medal } from 'lucide-react';

type LeaderboardTab = 'goals' | 'assists' | 'total' | 'matches';

interface LeaderboardScreenProps {
  onSelectPlayer?: (id: string) => void;
}

export function LeaderboardScreen({ onSelectPlayer }: LeaderboardScreenProps) {
  const { players } = useData();
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('total');

  const sorted = [...players].sort((a, b) => {
    switch (activeTab) {
      case 'goals':
        return b.totalGoals - a.totalGoals;
      case 'assists':
        return b.totalAssists - a.totalAssists;
      case 'matches':
        return b.matchesPlayed - a.matchesPlayed;
      default:
        return (b.totalGoals + b.totalAssists) - (a.totalGoals + a.totalAssists);
    }
  });

  const tabs = [
    { id: 'total' as LeaderboardTab, label: 'Goals + Assists', icon: Award },
    { id: 'goals' as LeaderboardTab, label: 'Goals', icon: Trophy },
    { id: 'assists' as LeaderboardTab, label: 'Assists', icon: Target },
    { id: 'matches' as LeaderboardTab, label: 'Matches', icon: TrendingUp },
  ];

  const topScorer = [...players].sort((a, b) => b.totalGoals - a.totalGoals)[0];
  const topAssister = [...players].sort((a, b) => b.totalAssists - a.totalAssists)[0];
  const bestOverall = [...players].sort(
    (a, b) => (b.totalGoals + b.totalAssists) - (a.totalGoals + a.totalAssists)
  )[0];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Medal className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-orange-600" />;
    return null;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-700';
    if (rank === 2) return 'bg-gray-100 text-gray-700';
    if (rank === 3) return 'bg-orange-100 text-orange-700';
    return 'bg-gray-50 text-gray-700';
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Leaderboard</h1>
        <p className="text-gray-600">Top performers of the season</p>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition ${
                    activeTab === tab.id
                      ? 'text-green-600 border-b-2 border-green-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {sorted.length === 0 ? (
            <p className="text-center text-gray-500 py-12">No players yet</p>
          ) : (
            sorted.map((player, index) => {
              const rank = index + 1;
              const value =
                activeTab === 'goals'
                  ? player.totalGoals
                  : activeTab === 'assists'
                  ? player.totalAssists
                  : activeTab === 'matches'
                  ? player.matchesPlayed
                  : player.totalGoals + player.totalAssists;

              return (
                <div
                  key={player.id}
                  onClick={() => onSelectPlayer?.(player.id)}
                  className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition cursor-pointer ${
                    rank <= 3 ? 'bg-gradient-to-r from-gray-50 to-white' : ''
                  }`}
                >
                  <div className="flex items-center justify-center w-12">
                    {getRankIcon(rank) || (
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${getRankColor(rank)}`}
                      >
                        {rank}
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center overflow-hidden">
                        {player.avatar ? (
                          <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold text-green-700">
                            {player.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{player.name}</p>
                        <p className="text-sm text-gray-500">{player.position || '—'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="hidden md:grid grid-cols-3 gap-6 mr-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Goals</p>
                      <p className={`font-bold ${activeTab === 'goals' ? 'text-green-600 text-lg' : 'text-gray-900'}`}>
                        {player.totalGoals}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Assists</p>
                      <p className={`font-bold ${activeTab === 'assists' ? 'text-green-600 text-lg' : 'text-gray-900'}`}>
                        {player.totalAssists}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Matches</p>
                      <p className={`font-bold ${activeTab === 'matches' ? 'text-green-600 text-lg' : 'text-gray-900'}`}>
                        {player.matchesPlayed}
                      </p>
                    </div>
                  </div>

                  <div className="text-right min-w-[80px]">
                    <p className="text-3xl font-bold text-green-600">{value}</p>
                    <p className="text-xs text-gray-500">
                      {activeTab === 'total' ? 'G+A' : activeTab === 'matches' ? 'played' : activeTab}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {players.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
            <div className="flex items-center gap-3 mb-3">
              <Trophy className="w-8 h-8 text-yellow-600" />
              <h3 className="font-bold text-gray-900">Top Scorer</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{topScorer?.name}</p>
            <p className="text-yellow-700 font-medium">{topScorer?.totalGoals} goals</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center gap-3 mb-3">
              <Target className="w-8 h-8 text-blue-600" />
              <h3 className="font-bold text-gray-900">Top Assister</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{topAssister?.name}</p>
            <p className="text-blue-700 font-medium">{topAssister?.totalAssists} assists</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center gap-3 mb-3">
              <Award className="w-8 h-8 text-green-600" />
              <h3 className="font-bold text-gray-900">Best Overall</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{bestOverall?.name}</p>
            <p className="text-green-700 font-medium">
              {bestOverall?.totalGoals} G + {bestOverall?.totalAssists} A
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
