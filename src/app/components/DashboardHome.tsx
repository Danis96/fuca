import { motion } from 'motion/react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Trophy, Target, Users, TrendingUp, Award, Flame, Link2, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { getTotalPoints } from '../../lib/playerStats';
import { getBestPartnership, getBiggestWin, getTopFormPlayer } from '../../lib/storyStats';

export function DashboardHome() {
  const { players, matches, goals } = useData();
  const { userProfile } = useAuth();

  const upcomingMatch = matches.find((m) => m.status === 'scheduled');
  const lastMatch = matches
    .filter((m) => m.status === 'completed')
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

  const activePlayers = players.filter((p) => p.status === 'active');
  const totalMatches = matches.filter((m) => m.status === 'completed').length;

  const topScorer = [...players].sort((a, b) => b.totalGoals - a.totalGoals)[0];
  const topAssister = [...players].sort((a, b) => b.totalAssists - a.totalAssists)[0];
  const topFormPlayer = getTopFormPlayer(players, matches, goals);
  const biggestWin = getBiggestWin(matches);
  const bestPartnership = getBestPartnership(players, matches);

  const cards = [
    {
      title: 'Upcoming Match',
      value: upcomingMatch ? format(upcomingMatch.date, 'MMM dd') : 'None',
      subtitle: upcomingMatch ? upcomingMatch.location : 'No matches scheduled',
      icon: Calendar,
      accent: '#3b82f6',
    },
    {
      title: 'Total Players',
      value: activePlayers.length.toString(),
      subtitle: 'Active players',
      icon: Users,
      accent: '#10b981',
    },
    {
      title: 'Last Match',
      value: lastMatch ? `${lastMatch.teamA.score ?? 0} - ${lastMatch.teamB.score ?? 0}` : 'N/A',
      subtitle: lastMatch ? format(lastMatch.date, 'MMM dd') : 'No matches',
      icon: Trophy,
      accent: '#8b5cf6',
    },
    {
      title: 'Top Scorer',
      value: topScorer?.name ?? '—',
      subtitle: topScorer ? `${topScorer.totalGoals} goals` : '',
      icon: Target,
      accent: '#f59e0b',
    },
    {
      title: 'Top Assister',
      value: topAssister?.name ?? '—',
      subtitle: topAssister ? `${topAssister.totalAssists} assists` : '',
      icon: TrendingUp,
      accent: '#22d3ee',
    },
    {
      title: 'Matches Played',
      value: totalMatches.toString(),
      subtitle: 'Season total',
      icon: Award,
      accent: '#f43f5e',
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="pill mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Live season
          </div>
          <h1 className="text-4xl font-bold mb-1 tracking-tight">
            Welcome back{userProfile?.displayName ? `, ${userProfile.displayName.split(' ')[0]}` : ''}
          </h1>
          <p className="text-gray-500">Here's what's happening in Sunday League this week.</p>
        </div>
      </div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
        }}
      >
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              className="stat-card"
              style={{ ['--card-accent' as any]: card.accent }}
              variants={{
                hidden: { opacity: 0, y: 18, scale: 0.96 },
                show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
              }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-2">{card.title}</p>
                  <p className="text-3xl font-bold mb-1 truncate">{card.value}</p>
                  <p className="text-sm text-gray-500">{card.subtitle}</p>
                </div>
                <motion.div
                  className="icon-badge shrink-0"
                  whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Icon className="w-6 h-6 text-white" />
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600"></span>
            Recent Matches
          </h2>
          <div className="space-y-4">
            {matches
              .filter((m) => m.status === 'completed')
              .slice(0, 3)
              .map((match, idx) => (
                <motion.div
                  key={match.id}
                  className="row-item flex items-center justify-between p-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.08, duration: 0.35 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <div>
                    <p className="font-medium">{match.location}</p>
                    <p className="text-sm text-gray-500">{format(match.date, 'MMM dd, yyyy')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold tracking-tight">
                      <span className="text-emerald-400">{match.teamA.score ?? 0}</span>
                      <span className="text-gray-500 mx-1">–</span>
                      <span>{match.teamB.score ?? 0}</span>
                    </p>
                  </div>
                </motion.div>
              ))}
            {matches.filter((m) => m.status === 'completed').length === 0 && (
              <p className="text-gray-500 text-center py-4">No completed matches yet</p>
            )}
          </div>
        </div>

        <div className="panel p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-violet-600"></span>
            Top Performers
          </h2>
          <div className="space-y-2">
            {[...players]
              .sort((a, b) => getTotalPoints(b) - getTotalPoints(a))
              .slice(0, 5)
              .map((player, index) => (
                <motion.div
                  key={player.id}
                  className="row-hover flex items-center gap-4 p-3 rounded-xl"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.06, duration: 0.35 }}
                  whileHover={{ x: 4 }}
                >
                  <div className={`flex items-center justify-center w-9 h-9 rounded-xl font-bold text-sm ${
                    index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950 shadow-lg shadow-amber-500/30' :
                    index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-slate-900' :
                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-orange-950' :
                    'bg-white/5 text-gray-400'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{player.name}</p>
                    <p className="text-sm text-gray-500">{player.position || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-emerald-400">
                      {getTotalPoints(player)}
                    </p>
                    <p className="text-xs text-gray-500">pts</p>
                  </div>
                </motion.div>
              ))}
            {players.length === 0 && (
              <p className="text-gray-500 text-center py-4">No players yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-400 to-rose-500"></span>
          <h2 className="text-xl font-bold">League Storylines</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <StoryCard
            icon={Flame}
            accent="#f97316"
            title="Hot Right Now"
            value={topFormPlayer?.player?.name ?? 'No leader yet'}
            players={topFormPlayer?.player ? [topFormPlayer.player] : []}
            subtitle={
              topFormPlayer
                ? `${topFormPlayer.score} form pts across last ${topFormPlayer.windowSize} matches`
                : 'Complete more matches to unlock form'
            }
          />
          <StoryCard
            icon={Shield}
            accent="#06b6d4"
            title="Biggest Win"
            value={
              biggestWin
                ? `${biggestWin.match.teamA.score ?? 0} - ${biggestWin.match.teamB.score ?? 0}`
                : 'No result yet'
            }
            subtitle={
              biggestWin
                ? `${biggestWin.margin}-goal margin at ${biggestWin.match.location}`
                : 'No completed matches yet'
            }
          />
          <StoryCard
            icon={Link2}
            accent="#a855f7"
            title="Best Partnership"
            value={
              bestPartnership?.players[0] && bestPartnership?.players[1]
                ? `${bestPartnership.players[0].name} + ${bestPartnership.players[1].name}`
                : 'No duo yet'
            }
            players={bestPartnership?.players.filter((player): player is NonNullable<typeof player> => Boolean(player)) ?? []}
            subtitle={
              bestPartnership
                ? `${bestPartnership.wins} wins together in ${bestPartnership.matches} matches`
                : 'Need completed matches with teammates'
            }
          />
        </div>
      </div>
    </div>
  );
}

function StoryCard({
  icon: Icon,
  accent,
  title,
  value,
  players = [],
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  title: string;
  value: string;
  players?: Array<{ id: string; name: string; avatar?: string }>;
  subtitle: string;
}) {
  return (
    <motion.div
      className="stat-card"
      style={{ ['--card-accent' as any]: accent }}
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <div className="flex items-start justify-between relative z-10 gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-2">{title}</p>
          <p className="text-2xl font-bold mb-1">{value}</p>
          <p className="text-sm text-gray-500">{subtitle}</p>
          {players.length > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex -space-x-3">
                {players.slice(0, 2).map((player, index) => (
                  <PlayerAvatar key={player.id} player={player} accent={accent} elevated={index === 0} />
                ))}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-100 truncate">
                  {players.map((player) => player.name).join(' + ')}
                </p>
                <p className="text-xs text-gray-500">
                  {players.length === 1 ? 'Featured player' : 'Featured partnership'}
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="icon-badge shrink-0">
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  );
}

function PlayerAvatar({
  player,
  accent,
  elevated = false,
}: {
  player: { name: string; avatar?: string };
  accent: string;
  elevated?: boolean;
}) {
  const initial = player.name.charAt(0).toUpperCase();

  return (
    <div
      className={`h-12 w-12 overflow-hidden rounded-full border-2 border-[#0f1720] ${elevated ? 'shadow-lg' : ''}`}
      style={{ boxShadow: elevated ? `0 8px 20px -12px ${accent}` : undefined }}
    >
      {player.avatar ? (
        <img src={player.avatar} alt={player.name} className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-sm font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${accent}, rgba(255,255,255,0.18))` }}
        >
          {initial}
        </div>
      )}
    </div>
  );
}
