import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Award,
  CalendarDays,
  Check,
  ChevronRight,
  Crown,
  Medal,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Player, Season } from '../../types';
import { getTotalPoints } from '../../lib/playerStats';

interface SeasonsScreenProps {
  onSelectPlayer?: (id: string, seasonId: string) => void;
}

function getNextSeasonName(season: Season) {
  return `${String(season.endYear).slice(-2)}/${String(season.endYear + 1).slice(-2)}`;
}

function rankPlayers(players: Player[]) {
  return [...players]
    .filter((player) =>
      player.matchesPlayed > 0 ||
      player.totalGoals > 0 ||
      player.totalAssists > 0 ||
      player.totalSaves > 0 ||
      getTotalPoints(player) !== 0
    )
    .sort((a, b) =>
      getTotalPoints(b) - getTotalPoints(a) ||
      b.totalGoals - a.totalGoals ||
      b.totalAssists - a.totalAssists ||
      b.wins - a.wins ||
      a.name.localeCompare(b.name)
    );
}

export function SeasonsScreen({ onSelectPlayer }: SeasonsScreenProps) {
  const { isAdmin } = useAuth();
  const {
    seasons,
    activeSeason,
    allMatches,
    allGoals,
    getPlayersForSeason,
    startNewSeason,
    updateSeasonAwards,
  } = useData();
  const [selectedSeasonId, setSelectedSeasonId] = useState(activeSeason.id);
  const [pendingSeasonId, setPendingSeasonId] = useState<string | null>(null);
  const [showStartModal, setShowStartModal] = useState(false);

  useEffect(() => {
    if (pendingSeasonId) {
      if (seasons.some((season) => season.id === pendingSeasonId)) {
        setSelectedSeasonId(pendingSeasonId);
        setPendingSeasonId(null);
      }
      return;
    }
    if (!seasons.some((season) => season.id === selectedSeasonId)) {
      setSelectedSeasonId(activeSeason.id);
    }
  }, [activeSeason.id, pendingSeasonId, seasons, selectedSeasonId]);

  const selectedSeason = seasons.find((season) => season.id === selectedSeasonId) ?? activeSeason;
  const seasonMatches = allMatches.filter((match) => match.seasonId === selectedSeason.id);
  const completedMatches = seasonMatches.filter((match) => match.status === 'completed');
  const seasonMatchIds = new Set(seasonMatches.map((match) => match.id));
  const seasonGoals = allGoals.filter((goal) => seasonMatchIds.has(goal.matchId));
  const seasonPlayers = getPlayersForSeason(selectedSeason.id);
  const standings = useMemo(() => rankPlayers(seasonPlayers), [seasonPlayers]);
  const playerOfSeason = seasonPlayers.find(
    (player) => player.id === selectedSeason.awards.playerOfTheSeasonId
  );
  const currentLeader = standings[0];
  const teamOfSeason = selectedSeason.awards.teamOfTheSeasonPlayerIds
    .map((id) => seasonPlayers.find((player) => player.id === id))
    .filter((player): player is Player => Boolean(player));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
        <div>
          <div className="pill mb-3">
            <Trophy className="w-3 h-3" />
            Hall of seasons
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-1">Seasons</h1>
          <p className="text-gray-500">Final tables, season awards and a fresh start every year.</p>
        </div>
        {isAdmin && (
          <motion.button
            type="button"
            onClick={() => setShowStartModal(true)}
            className="btn-primary px-5 py-3 inline-flex items-center gap-2"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Plus className="w-4 h-4" />
            Start New Season
          </motion.button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6">
        <aside className="space-y-3">
          {seasons.map((season) => {
            const selected = season.id === selectedSeason.id;
            const matchCount = allMatches.filter(
              (match) => match.seasonId === season.id && match.status === 'completed'
            ).length;
            return (
              <motion.button
                type="button"
                key={season.id}
                onClick={() => setSelectedSeasonId(season.id)}
                whileHover={{ x: 3 }}
                className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                  selected
                    ? 'border-emerald-400/35 bg-emerald-400/10'
                    : 'border-white/8 bg-white/[0.025] hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Season</p>
                    <p className="text-xl font-bold mt-1">{season.name}</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${selected ? 'text-emerald-300' : 'text-gray-600'}`} />
                </div>
                <div className="flex items-center justify-between mt-4 text-xs">
                  <span className={season.status === 'active' ? 'text-emerald-300' : 'text-gray-500'}>
                    {season.status === 'active' ? '● Active' : 'Completed'}
                  </span>
                  <span className="text-gray-500">{matchCount} matches</span>
                </div>
              </motion.button>
            );
          })}
        </aside>

        <section className="space-y-6 min-w-0">
          <div className="panel p-6 overflow-hidden relative">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_45%)]" />
            <div className="relative flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`pill ${selectedSeason.status === 'active' ? '' : 'opacity-70'}`}>
                    {selectedSeason.status === 'active' ? 'Live season' : 'Season archive'}
                  </span>
                </div>
                <h2 className="text-3xl font-black">Sezona {selectedSeason.name}</h2>
                <p className="text-gray-500 mt-1">
                  {selectedSeason.status === 'active'
                    ? 'Standings update automatically after every completed match.'
                    : 'Final record from the completed season.'}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <SeasonStat icon={CalendarDays} value={completedMatches.length} label="Matches" />
                <SeasonStat icon={Target} value={seasonGoals.length} label="Goals" />
                <SeasonStat icon={Users} value={standings.length} label="Players" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="panel p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/15 text-amber-300 flex items-center justify-center">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold">Player of the Season</p>
                    <p className="text-xs text-gray-500">
                      {playerOfSeason ? 'Official selection' : 'Current points leader'}
                    </p>
                  </div>
                </div>
                {isAdmin && standings.length > 0 && (
                  <PlayerOfSeasonSelect
                    players={standings}
                    value={selectedSeason.awards.playerOfTheSeasonId ?? ''}
                    onChange={async (playerId) => {
                      try {
                        await updateSeasonAwards(selectedSeason.id, {
                          ...selectedSeason.awards,
                          playerOfTheSeasonId: playerId || undefined,
                        });
                        toast.success('Player of the Season updated.');
                      } catch (error) {
                        console.error(error);
                        toast.error('Could not update the season award.');
                      }
                    }}
                  />
                )}
              </div>
              <FeaturedPlayer
                player={playerOfSeason ?? currentLeader}
                label={playerOfSeason ? 'Season MVP' : 'Leader'}
                onClick={(id) => onSelectPlayer?.(id, selectedSeason.id)}
              />
            </div>

            <div className="panel p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-400/15 text-violet-300 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold">Team of the Season</p>
                    <p className="text-xs text-gray-500">{teamOfSeason.length} selected players</p>
                  </div>
                </div>
                {isAdmin && standings.length > 0 && (
                  <TeamOfSeasonEditor
                    players={standings}
                    selectedIds={selectedSeason.awards.teamOfTheSeasonPlayerIds}
                    onSave={async (ids) => {
                      try {
                        await updateSeasonAwards(selectedSeason.id, {
                          ...selectedSeason.awards,
                          teamOfTheSeasonPlayerIds: ids,
                        });
                        toast.success('Team of the Season saved.');
                      } catch (error) {
                        console.error(error);
                        toast.error('Could not save Team of the Season.');
                      }
                    }}
                  />
                )}
              </div>
              {teamOfSeason.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {teamOfSeason.map((player) => (
                    <button
                      type="button"
                      key={player.id}
                      onClick={() => onSelectPlayer?.(player.id, selectedSeason.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-violet-300/15 bg-violet-400/10 px-3 py-2 text-sm hover:border-violet-300/30"
                    >
                      <PlayerAvatar player={player} size="sm" />
                      {player.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-gray-500">
                  {isAdmin ? 'Choose the players who made the season’s best squad.' : 'Team not selected yet.'}
                </div>
              )}
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-5 border-b border-white/8">
              <div>
                <h2 className="text-xl font-bold">
                  {selectedSeason.status === 'active' ? 'Live standings' : 'Final standings'}
                </h2>
                <p className="text-sm text-gray-500">Points, then goals, assists and wins decide tied places.</p>
              </div>
              <Award className="w-5 h-5 text-emerald-300" />
            </div>
            {standings.length > 0 ? (
              <div className="divide-y divide-white/5">
                {standings.map((player, index) => (
                  <button
                    type="button"
                    key={player.id}
                    onClick={() => onSelectPlayer?.(player.id, selectedSeason.id)}
                    className="w-full grid grid-cols-[40px_minmax(130px,1fr)_56px] sm:grid-cols-[48px_minmax(150px,1fr)_repeat(5,minmax(48px,72px))] items-center gap-2 px-4 sm:px-5 py-4 text-left hover:bg-white/[0.025] transition-colors"
                  >
                    <Rank rank={index + 1} />
                    <div className="flex items-center gap-3 min-w-0">
                      <PlayerAvatar player={player} />
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{player.name}</p>
                        <p className="text-xs text-gray-500 truncate">{player.position || 'Player'}</p>
                      </div>
                    </div>
                    <StandingValue label="PTS" value={getTotalPoints(player)} accent />
                    <div className="hidden sm:block"><StandingValue label="G" value={player.totalGoals} /></div>
                    <div className="hidden sm:block"><StandingValue label="A" value={player.totalAssists} /></div>
                    <div className="hidden sm:block"><StandingValue label="MP" value={player.matchesPlayed} /></div>
                    <div className="hidden sm:block"><StandingValue label="W" value={player.wins} /></div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-14 text-center">
                <Sparkles className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">No completed matches in this season yet.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {showStartModal && (
          <StartSeasonModal
            suggestedName={getNextSeasonName(activeSeason)}
            activeSeason={activeSeason}
            scheduledMatchCount={allMatches.filter(
              (match) => match.seasonId === activeSeason.id && match.status === 'scheduled'
            ).length}
            onClose={() => setShowStartModal(false)}
            onStart={async (name) => {
              const newSeasonId = await startNewSeason(name);
              setPendingSeasonId(newSeasonId);
              setShowStartModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SeasonStat({ icon: Icon, value, label }: { icon: typeof Trophy; value: number; label: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/15 px-3 py-2 text-center min-w-[72px]">
      <Icon className="w-4 h-4 text-emerald-300 mx-auto mb-1" />
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function PlayerAvatar({ player, size = 'md' }: { player: Player; size?: 'sm' | 'md' | 'lg' }) {
  const className = size === 'lg' ? 'w-16 h-16 text-xl' : size === 'sm' ? 'w-7 h-7 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className={`${className} shrink-0 rounded-full overflow-hidden bg-emerald-400/15 text-emerald-300 flex items-center justify-center font-bold`}>
      {player.avatar ? <img src={player.avatar} alt="" className="w-full h-full object-cover" /> : player.name.charAt(0).toUpperCase()}
    </div>
  );
}

function FeaturedPlayer({ player, label, onClick }: { player?: Player; label: string; onClick?: (id: string) => void }) {
  if (!player) {
    return <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-gray-500">No player data yet.</div>;
  }
  return (
    <button type="button" onClick={() => onClick?.(player.id)} className="w-full flex items-center gap-4 rounded-xl bg-white/[0.025] p-4 text-left hover:bg-white/[0.04]">
      <PlayerAvatar player={player} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.22em] text-amber-300">{label}</p>
        <p className="text-xl font-bold truncate">{player.name}</p>
        <p className="text-sm text-gray-500">{getTotalPoints(player)} pts · {player.totalGoals} G · {player.totalAssists} A</p>
      </div>
    </button>
  );
}

function PlayerOfSeasonSelect({ players, value, onChange }: { players: Player[]; value: string; onChange: (value: string) => void }) {
  return (
    <select
      aria-label="Select Player of the Season"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white"
    >
      <option value="">Auto: points leader</option>
      {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
    </select>
  );
}

function TeamOfSeasonEditor({ players, selectedIds, onSave }: { players: Player[]; selectedIds: string[]; onSave: (ids: string[]) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [draftIds, setDraftIds] = useState(selectedIds);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraftIds(selectedIds), [selectedIds]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary px-3 py-2 text-xs">Edit team</button>
      <AnimatePresence>
        {open && (
          <ModalShell onClose={() => setOpen(false)}>
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h3 className="text-2xl font-bold">Team of the Season</h3>
                <p className="text-sm text-gray-500 mt-1">Select the players for the season’s ideal squad.</p>
              </div>
              <CloseButton onClick={() => setOpen(false)} />
            </div>
            <div className="max-h-[52vh] overflow-y-auto space-y-2 pr-1">
              {players.map((player) => {
                const selected = draftIds.includes(player.id);
                return (
                  <button
                    type="button"
                    key={player.id}
                    onClick={() => setDraftIds((ids) => selected ? ids.filter((id) => id !== player.id) : [...ids, player.id])}
                    className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left ${selected ? 'border-violet-300/30 bg-violet-400/10' : 'border-white/8 bg-white/[0.02]'}`}
                  >
                    <PlayerAvatar player={player} />
                    <div className="flex-1">
                      <p className="font-semibold">{player.name}</p>
                      <p className="text-xs text-gray-500">{getTotalPoints(player)} pts · {player.matchesPlayed} matches</p>
                    </div>
                    <span className={`w-6 h-6 rounded-md border flex items-center justify-center ${selected ? 'bg-violet-400 border-violet-300 text-violet-950' : 'border-white/15'}`}>
                      {selected && <Check className="w-4 h-4" />}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-white/8">
              <p className="text-sm text-gray-500">{draftIds.length} selected</p>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  await onSave(draftIds);
                  setSaving(false);
                  setOpen(false);
                }}
                className="btn-primary px-5 py-2.5 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save team'}
              </button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>
    </>
  );
}

function StartSeasonModal({ suggestedName, activeSeason, scheduledMatchCount, onClose, onStart }: { suggestedName: string; activeSeason: Season; scheduledMatchCount: number; onClose: () => void; onStart: (name: string) => Promise<void> }) {
  const [name, setName] = useState(suggestedName);
  const [starting, setStarting] = useState(false);

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <div className="pill mb-3"><Plus className="w-3 h-3" /> New chapter</div>
          <h3 className="text-2xl font-bold">Start a new season</h3>
          <p className="text-sm text-gray-500 mt-1">Sezona {activeSeason.name} will be archived and all active stats will start from zero.</p>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      {scheduledMatchCount > 0 && (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100 mb-4">
          There {scheduledMatchCount === 1 ? 'is' : 'are'} {scheduledMatchCount} scheduled {scheduledMatchCount === 1 ? 'match' : 'matches'} in the current season. Finish, cancel or delete {scheduledMatchCount === 1 ? 'it' : 'them'} first.
        </div>
      )}

      <label className="block text-sm font-medium mb-2" htmlFor="new-season-name">Season name</label>
      <div className="flex items-center rounded-xl border border-white/10 bg-black/20 focus-within:border-emerald-400/40">
        <span className="pl-4 text-gray-500">Sezona</span>
        <input
          id="new-season-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="26/27"
          className="min-w-0 flex-1 bg-transparent px-2 py-3 outline-none"
          autoFocus
        />
      </div>
      <p className="text-xs text-gray-500 mt-2">Use the format 26/27. Players remain; matches, points and awards begin fresh.</p>

      <div className="flex justify-end gap-3 mt-6">
        <button type="button" onClick={onClose} className="btn-secondary px-4 py-2.5">Cancel</button>
        <button
          type="button"
          disabled={starting || scheduledMatchCount > 0}
          onClick={async () => {
            setStarting(true);
            try {
              await onStart(name);
              toast.success(`Sezona ${name.trim()} is now active.`);
            } catch (error) {
              console.error(error);
              toast.error(error instanceof Error ? error.message : 'Could not start the new season.');
              setStarting(false);
            }
          }}
          className="btn-primary px-5 py-2.5 disabled:opacity-50"
        >
          {starting ? 'Starting…' : 'Archive & start'}
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <motion.div
        className="panel w-full max-w-xl p-6 shadow-2xl"
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="icon-action shrink-0"><X className="w-4 h-4" /></button>;
}

function Rank({ rank }: { rank: number }) {
  if (rank <= 3) {
    const color = rank === 1 ? 'text-amber-300' : rank === 2 ? 'text-slate-300' : 'text-orange-400';
    return <div className="flex items-center gap-1"><Medal className={`w-5 h-5 ${color}`} /><span className="text-sm font-bold">{rank}</span></div>;
  }
  return <span className="pl-2 text-sm font-bold text-gray-500">{rank}</span>;
}

function StandingValue({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="text-center">
      <p className={`font-bold ${accent ? 'text-emerald-300 text-lg' : ''}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-gray-600">{label}</p>
    </div>
  );
}
