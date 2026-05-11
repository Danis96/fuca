import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Trophy, Target, Users, TrendingUp, Award } from 'lucide-react';
import { format } from 'date-fns';

export function DashboardHome() {
  const { players, matches } = useData();
  const { userProfile } = useAuth();

  const upcomingMatch = matches.find((m) => m.status === 'scheduled');
  const lastMatch = matches
    .filter((m) => m.status === 'completed')
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

  const activePlayers = players.filter((p) => p.status === 'active');
  const totalMatches = matches.filter((m) => m.status === 'completed').length;

  const topScorer = [...players].sort((a, b) => b.totalGoals - a.totalGoals)[0];
  const topAssister = [...players].sort((a, b) => b.totalAssists - a.totalAssists)[0];

  const cards = [
    {
      title: 'Upcoming Match',
      value: upcomingMatch ? format(upcomingMatch.date, 'MMM dd') : 'None',
      subtitle: upcomingMatch ? upcomingMatch.location : 'No matches scheduled',
      icon: Calendar,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Players',
      value: activePlayers.length.toString(),
      subtitle: 'Active players',
      icon: Users,
      color: 'bg-green-500',
    },
    {
      title: 'Last Match',
      value: lastMatch ? `${lastMatch.teamA.score ?? 0} - ${lastMatch.teamB.score ?? 0}` : 'N/A',
      subtitle: lastMatch ? format(lastMatch.date, 'MMM dd') : 'No matches',
      icon: Trophy,
      color: 'bg-purple-500',
    },
    {
      title: 'Top Scorer',
      value: topScorer?.name ?? '—',
      subtitle: topScorer ? `${topScorer.totalGoals} goals` : '',
      icon: Target,
      color: 'bg-orange-500',
    },
    {
      title: 'Top Assister',
      value: topAssister?.name ?? '—',
      subtitle: topAssister ? `${topAssister.totalAssists} assists` : '',
      icon: TrendingUp,
      color: 'bg-cyan-500',
    },
    {
      title: 'Matches Played',
      value: totalMatches.toString(),
      subtitle: 'Season total',
      icon: Award,
      color: 'bg-pink-500',
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Welcome{userProfile?.displayName ? `, ${userProfile.displayName}` : ''} — Sunday League Football
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{card.value}</p>
                  <p className="text-sm text-gray-500">{card.subtitle}</p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Matches</h2>
          <div className="space-y-4">
            {matches
              .filter((m) => m.status === 'completed')
              .slice(0, 3)
              .map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{match.location}</p>
                    <p className="text-sm text-gray-500">{format(match.date, 'MMM dd, yyyy')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {match.teamA.score ?? 0} - {match.teamB.score ?? 0}
                    </p>
                  </div>
                </div>
              ))}
            {matches.filter((m) => m.status === 'completed').length === 0 && (
              <p className="text-gray-500 text-center py-4">No completed matches yet</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top Performers</h2>
          <div className="space-y-4">
            {[...players]
              .sort((a, b) => (b.totalGoals + b.totalAssists) - (a.totalGoals + a.totalAssists))
              .slice(0, 5)
              .map((player, index) => (
                <div key={player.id} className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-700 rounded-full font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{player.name}</p>
                    <p className="text-sm text-gray-500">{player.position || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      {player.totalGoals + player.totalAssists}
                    </p>
                    <p className="text-xs text-gray-500">G+A</p>
                  </div>
                </div>
              ))}
            {players.length === 0 && (
              <p className="text-gray-500 text-center py-4">No players yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
