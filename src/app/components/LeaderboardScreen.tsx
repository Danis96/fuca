import { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { useData } from '../../contexts/DataContext';
import { Trophy, Target, TrendingUp, Award, Medal } from 'lucide-react';
import { getSavePoints, getTotalPoints } from '../../lib/playerStats';

type LeaderboardTab = 'goals' | 'assists' | 'saves' | 'total' | 'matches';

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
      case 'saves':
        return b.totalSaves - a.totalSaves;
      case 'matches':
        return b.matchesPlayed - a.matchesPlayed;
      default:
        return getTotalPoints(b) - getTotalPoints(a);
    }
  });

  const tabs = [
    { id: 'total' as LeaderboardTab, label: 'Total Points', icon: Award },
    { id: 'goals' as LeaderboardTab, label: 'Goals', icon: Trophy },
    { id: 'assists' as LeaderboardTab, label: 'Assists', icon: Target },
    { id: 'saves' as LeaderboardTab, label: 'Saves', icon: TrendingUp },
    { id: 'matches' as LeaderboardTab, label: 'Matches', icon: TrendingUp },
  ];

  const topScorer = [...players].sort((a, b) => b.totalGoals - a.totalGoals)[0];
  const topAssister = [...players].sort((a, b) => b.totalAssists - a.totalAssists)[0];
  const bestGoalkeeper = [...players]
    .filter((p) => p.position === 'Goalkeeper')
    .sort((a, b) => b.totalSaves - a.totalSaves)[0];
  const bestOverall = [...players].sort((a, b) => getTotalPoints(b) - getTotalPoints(a))[0];

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
        <LayoutGroup id="leaderboard">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto relative">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    className={`relative flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition-colors ${
                      active ? 'text-green-600' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <motion.span
                      animate={active ? { rotate: [0, -15, 15, -8, 8, 0], scale: [1, 1.15, 1] } : { rotate: 0, scale: 1 }}
                      transition={{ duration: 0.6 }}
                      className="inline-flex"
                    >
                      <Icon className="w-5 h-5" />
                    </motion.span>
                    {tab.label}
                    {active && (
                      <motion.span
                        layoutId="leaderboard-tab-underline"
                        className="absolute left-3 right-3 bottom-0 h-[3px] rounded-t-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <motion.div layout className="divide-y divide-gray-200">
            {sorted.length === 0 ? (
              <p className="text-center text-gray-500 py-12">No players yet</p>
            ) : (
              <AnimatePresence initial={false}>
                {sorted.map((player, index) => {
                  const rank = index + 1;
                  const value =
                    activeTab === 'goals'
                      ? player.totalGoals
                      : activeTab === 'assists'
                      ? player.totalAssists
                      : activeTab === 'saves'
                      ? player.totalSaves
                      : activeTab === 'matches'
                      ? player.matchesPlayed
                      : getTotalPoints(player);

                  return (
                    <motion.div
                      key={player.id}
                      layout
                      layoutId={`lb-row-${player.id}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.8 }}
                      onClick={() => onSelectPlayer?.(player.id)}
                      whileHover={{ scale: 1.005, backgroundColor: 'rgba(16,185,129,0.04)' }}
                      className={`leaderboard-row rank-${rank <= 3 ? rank : 'other'} flex items-center gap-4 p-4 cursor-pointer`}
                    >
                      <motion.div layout="position" className="flex items-center justify-center w-12">
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.div
                            key={rank}
                            initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
                            transition={{ type: 'spring', stiffness: 360, damping: 24 }}
                          >
                            {getRankIcon(rank) || (
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${getRankColor(rank)}`}
                              >
                                {rank}
                              </div>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </motion.div>

                      <motion.div layout="position" className="flex-1">
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
                      </motion.div>

                      <motion.div layout="position" className="hidden md:grid grid-cols-4 gap-6 mr-4">
                        {([
                          { key: 'goals', label: 'Goals', val: player.totalGoals },
                          { key: 'assists', label: 'Assists', val: player.totalAssists },
                          { key: 'saves', label: 'Saves', val: player.totalSaves },
                          { key: 'matches', label: 'Matches', val: player.matchesPlayed },
                        ] as const).map((s) => {
                          const isActive = activeTab === s.key;
                          return (
                            <div key={s.key} className="text-center">
                              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">{s.label}</p>
                              <motion.p
                                animate={{ scale: isActive ? 1.2 : 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                                className={`font-bold ${isActive ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'text-gray-200'}`}
                              >
                                {s.val}
                              </motion.p>
                            </div>
                          );
                        })}
                      </motion.div>

                      <motion.div layout="position" className="text-right min-w-[80px]">
                        <div className="relative h-9 overflow-hidden">
                          <AnimatePresence mode="popLayout" initial={false}>
                            <motion.p
                              key={`${activeTab}-${value}`}
                              initial={{ y: 20, opacity: 0, scale: 0.7 }}
                              animate={{ y: 0, opacity: 1, scale: 1 }}
                              exit={{ y: -20, opacity: 0, scale: 0.7 }}
                              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                              className="text-3xl font-bold text-green-600 absolute right-0"
                            >
                              {value}
                            </motion.p>
                          </AnimatePresence>
                        </div>
                        <p className="text-xs text-gray-500">
                          {activeTab === 'total' ? 'pts' : activeTab === 'matches' ? 'played' : activeTab}
                        </p>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </motion.div>
        </LayoutGroup>
      </div>

      {players.length > 0 && (
        <motion.div
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
          }}
        >
          {[
            {
              label: 'Top Scorer',
              player: topScorer,
              statValue: topScorer?.totalGoals ?? 0,
              statUnit: 'goals',
              icon: Trophy,
              from: 'from-amber-400',
              to: 'to-amber-600',
              text: 'text-amber-300',
              ring: 'rgba(245, 158, 11, 0.35)',
              glow: 'rgba(245, 158, 11, 0.18)',
            },
            {
              label: 'Top Assister',
              player: topAssister,
              statValue: topAssister?.totalAssists ?? 0,
              statUnit: 'assists',
              icon: Target,
              from: 'from-sky-400',
              to: 'to-blue-600',
              text: 'text-sky-300',
              ring: 'rgba(56, 189, 248, 0.35)',
              glow: 'rgba(56, 189, 248, 0.18)',
            },
            {
              label: 'Best Overall',
              player: bestOverall,
              statValue: bestOverall ? getTotalPoints(bestOverall) : 0,
              statUnit: 'pts',
              breakdown: bestOverall
                ? `${bestOverall.totalGoals} G · ${bestOverall.totalAssists} A · ${bestOverall.matchesPlayed} M · ${bestOverall.totalSaves} S`
                : undefined,
              icon: Award,
              from: 'from-emerald-400',
              to: 'to-emerald-600',
              text: 'text-emerald-300',
              ring: 'rgba(16, 185, 129, 0.35)',
              glow: 'rgba(16, 185, 129, 0.2)',
            },
            {
              label: 'Top Goalkeeper',
              player: bestGoalkeeper,
              statValue: bestGoalkeeper?.totalSaves ?? 0,
              statUnit: 'saves',
              breakdown: bestGoalkeeper
                ? `${getSavePoints(bestGoalkeeper.totalSaves)} pts from saves`
                : undefined,
              icon: TrendingUp,
              from: 'from-cyan-400',
              to: 'to-cyan-600',
              text: 'text-cyan-300',
              ring: 'rgba(34, 211, 238, 0.35)',
              glow: 'rgba(34, 211, 238, 0.2)',
            },
          ].map((c) => {
            const Icon = c.icon;
            const initial = c.player?.name?.charAt(0).toUpperCase() ?? '—';
            return (
              <motion.div
                key={c.label}
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.95 },
                  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
                }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                onClick={() => c.player && onSelectPlayer?.(c.player.id)}
                className="relative group rounded-2xl p-5 cursor-pointer overflow-hidden"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
                  border: `1px solid ${c.ring}`,
                  boxShadow: `0 0 0 1px ${c.ring}, 0 20px 40px -20px ${c.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
                }}
              >
                {/* Accent gradient sweep */}
                <div
                  className="absolute inset-0 opacity-40 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at top right, ${c.glow}, transparent 60%)`,
                  }}
                />

                <div className="relative z-10 flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <motion.div
                      whileHover={{ rotate: [0, -12, 12, 0], scale: 1.1 }}
                      transition={{ duration: 0.6 }}
                      className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.from} ${c.to} flex items-center justify-center shadow-lg`}
                      style={{ boxShadow: `0 8px 20px -8px ${c.ring}` }}
                    >
                      <Icon className="w-5 h-5 text-black/80" />
                    </motion.div>
                    <p className="text-xs uppercase tracking-wider font-semibold text-gray-400">
                      {c.label}
                    </p>
                  </div>
                  <div className={`text-2xl font-black ${c.text} leading-none`}>
                    {c.statValue}
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 ml-1">
                      {c.statUnit}
                    </span>
                  </div>
                </div>

                <div className="relative z-10 flex items-center gap-3">
                  <div className="relative">
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${c.from} ${c.to} flex items-center justify-center font-black text-base text-black/80 shadow-lg`}
                      style={{ boxShadow: `0 8px 24px -10px ${c.ring}` }}
                    >
                      {c.player?.avatar ? (
                        <img
                          src={c.player.avatar}
                          alt={c.player.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        initial
                      )}
                    </div>
                    <motion.div
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-black border border-white/10 flex items-center justify-center"
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Icon className={`w-3 h-3 ${c.text}`} />
                    </motion.div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white text-lg truncate">
                      {c.player?.name ?? '—'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {c.breakdown ?? c.player?.position ?? '—'}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
