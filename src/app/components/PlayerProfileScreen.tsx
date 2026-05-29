import { useData } from '../../contexts/DataContext';
import { ArrowLeft, Trophy, Target, TrendingUp, Award, Calendar, User, Flame, Medal } from 'lucide-react';
import { format } from 'date-fns';
import { getPlayerAwardCounts } from '../../lib/matchAwards';
import { getSavePoints, getTotalPoints } from '../../lib/playerStats';
import { getPlayerCurrentStreak, getPlayerMvpCount, getPlayerRecentForm } from '../../lib/storyStats';

interface PlayerProfileScreenProps {
  playerId: string;
  onBack: () => void;
}

export function PlayerProfileScreen({ playerId, onBack }: PlayerProfileScreenProps) {
  const { players, matches, goals } = useData();
  const player = players.find((p) => p.id === playerId);

  if (!player) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <p className="text-gray-600">Player not found</p>
      </div>
    );
  }

  const playerGoals = goals.filter((g) => g.scorerId === playerId);
  const playerAssists = goals.filter((g) => g.assistId === playerId);

  const playerMatches = matches.filter(
    (m) =>
      m.status === 'completed' &&
      (m.teamA.playerIds.includes(playerId) || m.teamB.playerIds.includes(playerId))
  );
  const recentForm = getPlayerRecentForm(matches, playerId, 5);
  const streak = getPlayerCurrentStreak(matches, playerId);
  const mvpCount = getPlayerMvpCount(matches, playerId);
  const awardCounts = getPlayerAwardCounts(matches, playerId);
  const totalWeeklyAwards =
    awardCounts.scorer + awardCounts.assist + awardCounts.goalkeeper + awardCounts.mvp;

  const goalContributionPerMatch =
    player.matchesPlayed > 0
      ? ((player.totalGoals + player.totalAssists) / player.matchesPlayed).toFixed(2)
      : '0.00';

  const stats = [
    { label: 'Total Goals', value: player.totalGoals, icon: Trophy, color: 'bg-yellow-500' },
    { label: 'Total Assists', value: player.totalAssists, icon: Target, color: 'bg-blue-500' },
    { label: 'Total Saves', value: player.totalSaves, icon: TrendingUp, color: 'bg-cyan-500' },
    { label: 'Total Points', value: getTotalPoints(player), icon: Award, color: 'bg-green-500' },
    { label: 'G+A per Match', value: goalContributionPerMatch, icon: TrendingUp, color: 'bg-purple-500' },
    { label: 'Weekly Awards', value: totalWeeklyAwards, icon: Medal, color: 'bg-amber-500' },
  ];

  const record = [
    { label: 'Wins', value: player.wins, color: 'text-green-600' },
    { label: 'Draws', value: player.draws, color: 'text-gray-600' },
    { label: 'Losses', value: player.losses, color: 'text-red-600' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      <div className="bg-white rounded-xl shadow-md p-8 mb-6">
        <div className="flex items-start gap-6 mb-6">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center overflow-hidden">
            {player.avatar ? (
              <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-green-600">
                {player.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{player.name}</h1>
            {player.nickname && (
              <p className="text-xl text-gray-600 mb-2">"{player.nickname}"</p>
            )}
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {player.position || 'Unknown Position'}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  player.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {player.status}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className={`${stat.color} w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Match Record</h2>
          <div className="space-y-4">
            {record.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-gray-700">{item.label}</span>
                <span className={`text-2xl font-bold ${item.color}`}>{item.value}</span>
              </div>
            ))}
            {player.matchesPlayed > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Win Rate</span>
                  <span className="text-2xl font-bold text-green-600">
                    {((player.wins / player.matchesPlayed) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Season Stats</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Total Points</span>
              <span className="text-2xl font-bold text-gray-900">
                {getTotalPoints(player)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Goals</span>
              <span className="text-2xl font-bold text-yellow-600">{player.totalGoals}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Assists</span>
              <span className="text-2xl font-bold text-blue-600">{player.totalAssists}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Saves</span>
              <span className="text-2xl font-bold text-cyan-600">{player.totalSaves}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Save Points</span>
              <span className="text-2xl font-bold text-cyan-600">{getSavePoints(player.totalSaves)}</span>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Contribution/Match</span>
                <span className="text-2xl font-bold text-purple-600">{goalContributionPerMatch}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Current Form</h2>
          <div className="flex items-center gap-2 mb-4">
            {recentForm.length > 0 ? (
              recentForm.map(({ match, result }) => (
                <div
                  key={match.id}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    result === 'W'
                      ? 'bg-green-100 text-green-700'
                      : result === 'D'
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                  title={`${format(match.date, 'MMM dd')} · ${result}`}
                >
                  {result}
                </div>
              ))
            ) : (
              <p className="text-gray-500">No recent form yet</p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Current Streak</span>
            <span className="text-lg font-bold text-gray-900">
              {streak.count > 0 ? `${streak.type}${streak.count}` : '—'}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Story Stats</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-gray-700">
                <Flame className="w-4 h-4 text-orange-500" />
                Current Streak
              </span>
              <span className="text-2xl font-bold text-gray-900">
                {streak.count > 0 ? streak.count : 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-gray-700">
                <Trophy className="w-4 h-4 text-yellow-500" />
                Baller Awards
              </span>
              <span className="text-2xl font-bold text-gray-900">{awardCounts.scorer}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-gray-700">
                <Target className="w-4 h-4 text-blue-500" />
                Wizard Awards
              </span>
              <span className="text-2xl font-bold text-gray-900">{awardCounts.assist}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-gray-700">
                <TrendingUp className="w-4 h-4 text-cyan-500" />
                Brick Wall Awards
              </span>
              <span className="text-2xl font-bold text-gray-900">{awardCounts.goalkeeper}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-gray-700">
                <Medal className="w-4 h-4 text-emerald-500" />
                MVP Awards
              </span>
              <span className="text-2xl font-bold text-gray-900">{Math.max(mvpCount, awardCounts.mvp)}</span>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Recent Form Line</span>
                <span className="font-medium text-gray-900">
                  {recentForm.map((entry) => entry.result).join(' ') || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Matches</h2>
        <div className="space-y-3">
          {playerMatches.slice(0, 5).map((match) => {
            const isTeamA = match.teamA.playerIds.includes(playerId);
            const playerTeam = isTeamA ? match.teamA : match.teamB;
            const opponentTeam = isTeamA ? match.teamB : match.teamA;
            const ps = playerTeam.score ?? 0;
            const os = opponentTeam.score ?? 0;
            const won = ps > os;
            const draw = ps === os;

            const matchGoals = playerGoals.filter((g) => g.matchId === match.id).length;
            const matchAssists = playerAssists.filter((g) => g.matchId === match.id).length;

            return (
              <div
                key={match.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4 flex-1 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{format(match.date, 'MMM dd')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        won
                          ? 'bg-green-100 text-green-700'
                          : draw
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {won ? 'W' : draw ? 'D' : 'L'}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {ps} - {os}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">{match.location}</span>
                </div>
                {(matchGoals > 0 || matchAssists > 0) && (
                  <div className="flex items-center gap-3 text-sm">
                    {matchGoals > 0 && (
                      <div className="flex items-center gap-1">
                        <Trophy className="w-4 h-4 text-yellow-600" />
                        <span className="font-medium text-gray-900">{matchGoals}</span>
                      </div>
                    )}
                    {matchAssists > 0 && (
                      <div className="flex items-center gap-1">
                        <Target className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-gray-900">{matchAssists}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {playerMatches.length === 0 && (
            <p className="text-gray-500 text-center py-4">No matches played yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
