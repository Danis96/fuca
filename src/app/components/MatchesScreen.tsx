import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Match, Goal } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import {
  Plus,
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  Trash2,
  Trophy,
  Clock,
  X,
  ChevronLeft,
  ArrowRightLeft,
  ClipboardCheck,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function MatchesScreen() {
  const { isAdmin } = useAuth();
  const { matches, addMatch, deleteMatch } = useData();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const upcomingMatches = matches.filter((m) => m.status === 'scheduled');
  const completedMatches = matches.filter((m) => m.status === 'completed');

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this match?')) return;
    try {
      await deleteMatch(id);
      toast.success('Match deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="pill mb-3">
            <Calendar className="w-3 h-3" />
            Schedule
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-1">Matches</h1>
          <p className="text-gray-500">View and manage Sunday League fixtures.</p>
        </div>
        {isAdmin && (
          <motion.button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary px-5 py-3 inline-flex items-center gap-2"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Plus className="w-4 h-4" />
            Schedule Match
          </motion.button>
        )}
      </div>

      <div className="space-y-10">
        <Section
          title="Upcoming"
          accent="#60a5fa"
          count={upcomingMatches.length}
          emptyIcon={Calendar}
          emptyText="No upcoming matches scheduled"
          isEmpty={upcomingMatches.length === 0}
        >
          {upcomingMatches.map((match, idx) => (
            <MatchCard
              key={match.id}
              match={match}
              onClick={() => setSelectedMatch(match)}
              isAdmin={isAdmin}
              onDelete={() => handleDelete(match.id)}
              delay={idx * 0.05}
            />
          ))}
        </Section>

        <Section
          title="Completed"
          accent="#10b981"
          count={completedMatches.length}
          emptyIcon={Trophy}
          emptyText="No completed matches yet"
          isEmpty={completedMatches.length === 0}
        >
          {completedMatches.map((match, idx) => (
            <MatchCard
              key={match.id}
              match={match}
              onClick={() => setSelectedMatch(match)}
              isAdmin={isAdmin}
              onDelete={() => handleDelete(match.id)}
              delay={idx * 0.05}
            />
          ))}
        </Section>
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <CreateMatchModal
            onClose={() => setShowCreateModal(false)}
            onSave={async (data) => {
              try {
                await addMatch(data);
                setShowCreateModal(false);
                toast.success('Match scheduled');
              } catch (err) {
                console.error(err);
                toast.error('Failed to schedule');
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedMatch && (
          <MatchDetailsModal
            match={selectedMatch}
            onClose={() => setSelectedMatch(null)}
            isAdmin={isAdmin}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface SectionProps {
  title: string;
  accent: string;
  count: number;
  children: React.ReactNode;
  emptyIcon: React.ComponentType<{ className?: string }>;
  emptyText: string;
  isEmpty: boolean;
}

function Section({ title, accent, count, children, emptyIcon: EmptyIcon, emptyText, isEmpty }: SectionProps) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="w-1 h-6 rounded-full" style={{ background: accent }} />
        <h2 className="text-xl font-bold">{title}</h2>
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/[0.04] border border-white/5 text-gray-400">
          {count}
        </span>
      </div>
      {isEmpty ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <EmptyIcon className="w-6 h-6" />
          </div>
          <p className="text-gray-500">{emptyText}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">{children}</div>
      )}
    </div>
  );
}

interface MatchCardProps {
  match: Match;
  onClick: () => void;
  isAdmin: boolean;
  onDelete: () => void;
  delay?: number;
}

function MatchCard({ match, onClick, isAdmin, onDelete, delay = 0 }: MatchCardProps) {
  const isCompleted = match.status === 'completed';
  const accent = isCompleted ? '#10b981' : '#3b82f6';

  return (
    <motion.div
      onClick={onClick}
      className="match-card"
      style={{ ['--card-accent' as any]: accent }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: `color-mix(in oklab, ${accent} 14%, transparent)`,
              border: `1px solid color-mix(in oklab, ${accent} 30%, transparent)`,
              color: accent,
            }}
          >
            {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <p className="font-bold truncate">{format(match.date, 'EEEE, MMM dd, yyyy')}</p>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {match.time}
              </span>
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{match.location}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`match-status-pill ${isCompleted ? 'completed' : 'scheduled'}`}>
            <span className="dot" />
            {match.status}
          </span>
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="btn-danger-soft"
              title="Delete match"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="scoreboard">
        <div className="team-block team-a">
          <span className="team-label">Team A</span>
          {isCompleted && <span className="team-score">{match.teamA.score ?? 0}</span>}
          <span className="team-meta">
            <Users className="w-3.5 h-3.5" />
            {match.teamA.playerIds.length}
          </span>
        </div>

        <div className="vs-divider">{isCompleted ? '–' : 'VS'}</div>

        <div className="team-block team-b">
          <span className="team-label">Team B</span>
          {isCompleted && <span className="team-score">{match.teamB.score ?? 0}</span>}
          <span className="team-meta">
            <Users className="w-3.5 h-3.5" />
            {match.teamB.playerIds.length}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ============================================================
 * Modal shell
 * ============================================================ */

interface ModalShellProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

function ModalShell({ title, subtitle, onClose, children, footer, maxWidth = '32rem' }: ModalShellProps) {
  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        className="modal-panel"
        style={{ maxWidth }}
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{title}</h2>
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="modal-close" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </motion.div>
    </motion.div>
  );
}

/* ============================================================
 * Create Match Modal
 * ============================================================ */

interface CreateMatchModalProps {
  onClose: () => void;
  onSave: (data: Omit<Match, 'id' | 'createdAt'>) => Promise<void> | void;
}

function CreateMatchModal({ onClose, onSave }: CreateMatchModalProps) {
  const [formData, setFormData] = useState({ date: '', time: '', location: '', notes: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      date: new Date(formData.date),
      time: formData.time,
      location: formData.location,
      notes: formData.notes,
      status: 'scheduled',
      teamA: { name: 'Team A', playerIds: [] },
      teamB: { name: 'Team B', playerIds: [] },
    });
  };

  return (
    <ModalShell
      title="Schedule New Match"
      subtitle="Pick a date, time and venue."
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" form="create-match-form" className="btn-primary flex-1 py-2.5 inline-flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            Schedule
          </button>
        </>
      }
    >
      <form id="create-match-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="field-input"
              required
            />
          </div>
          <div>
            <label className="field-label">Time</label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="field-input"
              required
            />
          </div>
        </div>
        <div>
          <label className="field-label">Location</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="field-input"
            required
            placeholder="e.g. Central Park Field"
          />
        </div>
        <div>
          <label className="field-label">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="field-input resize-none"
            rows={3}
            placeholder="Anything else worth noting…"
          />
        </div>
      </form>
    </ModalShell>
  );
}

/* ============================================================
 * Details Modal
 * ============================================================ */

interface MatchDetailsModalProps {
  match: Match;
  onClose: () => void;
  isAdmin: boolean;
}

function MatchDetailsModal({ match, onClose, isAdmin }: MatchDetailsModalProps) {
  const { players } = useData();
  const [view, setView] = useState<'details' | 'teams' | 'result'>('details');

  const teamAPlayers = players.filter((p) => match.teamA.playerIds.includes(p.id));
  const teamBPlayers = players.filter((p) => match.teamB.playerIds.includes(p.id));

  if (view === 'teams') {
    return <TeamAssignmentModal match={match} onClose={onClose} onBack={() => setView('details')} />;
  }

  if (view === 'result') {
    return <RecordResultModal match={match} onClose={onClose} onBack={() => setView('details')} />;
  }

  const isCompleted = match.status === 'completed';

  return (
    <ModalShell
      title="Match Details"
      subtitle={format(match.date, 'EEEE, MMMM dd, yyyy')}
      onClose={onClose}
      maxWidth="42rem"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary flex-1">
            Close
          </button>
          {isAdmin && match.status === 'scheduled' && (
            <>
              <button onClick={() => setView('teams')} className="btn-secondary flex-1 inline-flex items-center justify-center gap-2">
                <ArrowRightLeft className="w-4 h-4" />
                Teams
              </button>
              <button onClick={() => setView('result')} className="btn-primary flex-1 py-2.5 inline-flex items-center justify-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                Record Result
              </button>
            </>
          )}
        </>
      }
    >
      <div className="space-y-6">
        {/* meta strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetaCell icon={Calendar} label="Date" value={format(match.date, 'MMM dd')} />
          <MetaCell icon={Clock} label="Time" value={match.time} />
          <MetaCell icon={MapPin} label="Location" value={match.location} />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Status</span>
            <span className={`match-status-pill ${isCompleted ? 'completed' : 'scheduled'} self-start`}>
              <span className="dot" />
              {match.status}
            </span>
          </div>
        </div>

        {/* scoreboard */}
        <div className="scoreboard">
          <div className="team-block team-a">
            <span className="team-label">Team A</span>
            {isCompleted && <span className="team-score">{match.teamA.score ?? 0}</span>}
            <span className="team-meta">
              <Users className="w-3.5 h-3.5" />
              {teamAPlayers.length} players
            </span>
          </div>
          <div className="vs-divider">{isCompleted ? '–' : 'VS'}</div>
          <div className="team-block team-b">
            <span className="team-label">Team B</span>
            {isCompleted && <span className="team-score">{match.teamB.score ?? 0}</span>}
            <span className="team-meta">
              <Users className="w-3.5 h-3.5" />
              {teamBPlayers.length} players
            </span>
          </div>
        </div>

        {/* squads */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">Squads</h3>
            {isAdmin && match.status === 'scheduled' && (
              <button onClick={() => setView('teams')} className="text-sm text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Edit teams
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SquadPanel title="Team A" variant="a" players={teamAPlayers} />
            <SquadPanel title="Team B" variant="b" players={teamBPlayers} />
          </div>
        </div>

        {match.notes && (
          <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
            <h3 className="font-semibold mb-1 text-sm uppercase tracking-wider text-gray-500">Notes</h3>
            <p className="text-sm">{match.notes}</p>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

function MetaCell({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <p className="font-medium text-sm truncate">{value}</p>
    </div>
  );
}

function SquadPanel({ title, variant, players }: { title: string; variant: 'a' | 'b'; players: { id: string; name: string }[] }) {
  return (
    <div className={`team-panel ${variant}`}>
      <div className="team-panel-title">
        <span className="name">{title}</span>
        <span className="count">{players.length}</span>
      </div>
      <div className="space-y-1.5">
        {players.map((p) => (
          <div key={p.id} className="text-sm py-1.5 px-2 rounded-md bg-white/[0.02]">{p.name}</div>
        ))}
        {players.length === 0 && (
          <p className="text-sm text-gray-500 italic">No players assigned</p>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * Team Assignment Modal
 * ============================================================ */

interface TeamAssignmentModalProps {
  match: Match;
  onClose: () => void;
  onBack: () => void;
}

function TeamAssignmentModal({ match, onClose, onBack }: TeamAssignmentModalProps) {
  const { players, updateMatch } = useData();
  const [teamA, setTeamA] = useState<string[]>(match.teamA.playerIds);
  const [teamB, setTeamB] = useState<string[]>(match.teamB.playerIds);
  const [shuffling, setShuffling] = useState(false);

  const assignedPlayers = [...teamA, ...teamB];
  const availablePlayers = players.filter(
    (p) => p.status === 'active' && !assignedPlayers.includes(p.id)
  );

  const moveToTeamA = (playerId: string) => {
    setTeamB(teamB.filter((id) => id !== playerId));
    setTeamA([...teamA.filter((id) => id !== playerId), playerId]);
  };
  const moveToTeamB = (playerId: string) => {
    setTeamA(teamA.filter((id) => id !== playerId));
    setTeamB([...teamB.filter((id) => id !== playerId), playerId]);
  };
  const removeFromTeam = (playerId: string) => {
    setTeamA(teamA.filter((id) => id !== playerId));
    setTeamB(teamB.filter((id) => id !== playerId));
  };

  const autoShuffle = () => {
    if (shuffling) return;
    setShuffling(true);
    // Clear teams first so chips fly back to Available, then deal them out.
    setTeamA([]);
    setTeamB([]);
    setTimeout(() => {
      const pool = players.filter((p) => p.status === 'active').map((p) => p.id);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const half = Math.ceil(pool.length / 2);
      setTeamA(pool.slice(0, half));
      setTeamB(pool.slice(half));
      setTimeout(() => setShuffling(false), 700);
    }, 280);
  };

  const handleSave = async () => {
    try {
      await updateMatch(match.id, {
        teamA: {
          name: match.teamA.name,
          playerIds: teamA,
          ...(match.teamA.score !== undefined && { score: match.teamA.score }),
        },
        teamB: {
          name: match.teamB.name,
          playerIds: teamB,
          ...(match.teamB.score !== undefined && { score: match.teamB.score }),
        },
      });
      toast.success('Teams updated');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update teams');
    }
  };

  const chipSpring = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.7 };

  const renderChip = (playerId: string, side: 'A' | 'B' | 'available') => {
    const player = players.find((p) => p.id === playerId);
    if (!player) return null;
    return (
      <motion.div
        key={playerId}
        layout
        layoutId={`player-${playerId}`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.6 }}
        transition={chipSpring}
        whileHover={{ scale: 1.03, y: -2 }}
        whileTap={{ scale: 0.97 }}
        className="player-chip"
      >
        <motion.span layout="position" className="font-medium flex-1">
          {player.name}
        </motion.span>
        {side === 'available' ? (
          <div className="flex gap-1">
            <motion.button
              onClick={() => moveToTeamA(playerId)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="btn-pill team-a"
            >
              A
            </motion.button>
            <motion.button
              onClick={() => moveToTeamB(playerId)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="btn-pill team-b"
            >
              B
            </motion.button>
          </div>
        ) : (
          <div className="flex gap-1 items-center">
            <motion.button
              onClick={() => (side === 'A' ? moveToTeamB(playerId) : moveToTeamA(playerId))}
              whileHover={{ scale: 1.15, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className="text-gray-400 hover:text-emerald-300"
              title={`Swap to Team ${side === 'A' ? 'B' : 'A'}`}
            >
              <ArrowRightLeft className="w-4 h-4" />
            </motion.button>
            <motion.button
              onClick={() => removeFromTeam(playerId)}
              whileHover={{ scale: 1.15, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className="text-rose-400 hover:text-rose-300"
            >
              <XCircle className="w-4 h-4" />
            </motion.button>
          </div>
        )}
      </motion.div>
    );
  };

  const Count = ({ value }: { value: number }) => (
    <span className="count relative inline-block min-w-[1.5em] text-center overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: -14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 14, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );

  return (
    <ModalShell
      title="Team Assignment"
      subtitle={`${assignedPlayers.length} assigned · ${availablePlayers.length} available`}
      onClose={onClose}
      maxWidth="60rem"
      footer={
        <>
          <button onClick={onBack} className="btn-secondary inline-flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <motion.button
            onClick={autoShuffle}
            disabled={shuffling}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="btn-secondary inline-flex items-center gap-2 disabled:opacity-60"
            title="Auto-balance teams"
          >
            <motion.span
              animate={shuffling ? { rotate: 360 } : { rotate: 0 }}
              transition={shuffling ? { duration: 0.6, repeat: Infinity, ease: 'linear' } : { duration: 0.4 }}
              className="inline-flex"
            >
              <Shuffle className="w-4 h-4" />
            </motion.span>
            {shuffling ? 'Shuffling…' : 'Auto Shuffle'}
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          </motion.button>
          <motion.button
            onClick={handleSave}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary flex-1 py-2.5"
          >
            Save Teams
          </motion.button>
        </>
      }
    >
      <motion.div
        layout
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {/* Team A */}
        <motion.div
          layout
          className="team-panel a relative overflow-hidden"
          animate={{ boxShadow: teamA.length > 0 ? '0 0 0 1px rgba(16,185,129,0.35), 0 0 30px -10px rgba(16,185,129,0.4)' : '0 0 0 1px rgba(255,255,255,0.05)' }}
          transition={{ duration: 0.4 }}
        >
          <div className="team-panel-title">
            <span className="name">Team A</span>
            <Count value={teamA.length} />
          </div>
          <div className="space-y-2 min-h-[60px]">
            <AnimatePresence mode="popLayout">
              {teamA.map((id) => renderChip(id, 'A'))}
            </AnimatePresence>
            {teamA.length === 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-gray-500 italic"
              >
                Drop players here
              </motion.p>
            )}
          </div>
        </motion.div>

        {/* Available */}
        <motion.div
          layout
          className="team-panel"
          style={{ ['--team-color' as any]: '#8b5cf6' }}
        >
          <div className="team-panel-title">
            <span className="name">Available</span>
            <Count value={availablePlayers.length} />
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            <AnimatePresence mode="popLayout">
              {availablePlayers.map((player) => renderChip(player.id, 'available'))}
            </AnimatePresence>
            {availablePlayers.length === 0 && (
              <motion.p
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-sm text-emerald-300/80 italic flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                All players assigned
              </motion.p>
            )}
          </div>
        </motion.div>

        {/* Team B */}
        <motion.div
          layout
          className="team-panel b relative overflow-hidden"
          animate={{ boxShadow: teamB.length > 0 ? '0 0 0 1px rgba(244,63,94,0.35), 0 0 30px -10px rgba(244,63,94,0.4)' : '0 0 0 1px rgba(255,255,255,0.05)' }}
          transition={{ duration: 0.4 }}
        >
          <div className="team-panel-title">
            <span className="name">Team B</span>
            <Count value={teamB.length} />
          </div>
          <div className="space-y-2 min-h-[60px]">
            <AnimatePresence mode="popLayout">
              {teamB.map((id) => renderChip(id, 'B'))}
            </AnimatePresence>
            {teamB.length === 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-gray-500 italic"
              >
                Drop players here
              </motion.p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </ModalShell>
  );
}

/* ============================================================
 * Record Result Modal
 * ============================================================ */

interface RecordResultModalProps {
  match: Match;
  onClose: () => void;
  onBack: () => void;
}

type GoalDraft = Omit<Goal, 'id' | 'matchId' | 'createdAt'>;

function RecordResultModal({ match, onClose, onBack }: RecordResultModalProps) {
  const { players, recordResult } = useData();
  const [teamAScore, setTeamAScore] = useState<number>(0);
  const [teamBScore, setTeamBScore] = useState<number>(0);
  const [goals, setGoals] = useState<GoalDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const teamAPlayers = players.filter((p) => match.teamA.playerIds.includes(p.id));
  const teamBPlayers = players.filter((p) => match.teamB.playerIds.includes(p.id));

  const addGoalRow = (team: 'A' | 'B') => {
    setGoals([...goals, { scorerId: '', assistId: undefined, team, minute: undefined }]);
  };
  const updateGoal = (index: number, patch: Partial<GoalDraft>) => {
    setGoals(goals.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  };
  const removeGoal = (index: number) => setGoals(goals.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (goals.some((g) => !g.scorerId)) {
      toast.error('All goals need a scorer');
      return;
    }
    setSaving(true);
    try {
      await recordResult(match.id, teamAScore, teamBScore, goals);
      toast.success('Result recorded');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to record result');
    } finally {
      setSaving(false);
    }
  };

  const renderGoalRow = (g: GoalDraft, idx: number) => {
    const scorerPool = g.team === 'A' ? teamAPlayers : teamBPlayers;
    return (
      <motion.div
        key={idx}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap gap-2 items-center p-3 rounded-xl border border-white/5 bg-white/[0.02]"
      >
        <span className={`btn-pill ${g.team === 'A' ? 'team-a' : 'team-b'} pointer-events-none`}>
          Team {g.team}
        </span>
        <select
          value={g.scorerId}
          onChange={(e) => updateGoal(idx, { scorerId: e.target.value })}
          className="field-input text-sm flex-1 min-w-[140px] py-1.5"
        >
          <option value="">Scorer…</option>
          {scorerPool.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={g.assistId ?? ''}
          onChange={(e) => updateGoal(idx, { assistId: e.target.value || undefined })}
          className="field-input text-sm flex-1 min-w-[140px] py-1.5"
        >
          <option value="">Assist (optional)…</option>
          {scorerPool.filter((p) => p.id !== g.scorerId).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          placeholder="Min"
          value={g.minute ?? ''}
          onChange={(e) => updateGoal(idx, { minute: e.target.value ? parseInt(e.target.value, 10) : undefined })}
          className="field-input w-20 py-1.5 text-sm"
        />
        <button onClick={() => removeGoal(idx)} className="btn-danger-soft">
          <XCircle className="w-4 h-4" />
        </button>
      </motion.div>
    );
  };

  return (
    <ModalShell
      title="Record Result"
      subtitle="Set final score and goalscorers."
      onClose={onClose}
      maxWidth="48rem"
      footer={
        <>
          <button onClick={onBack} className="btn-secondary inline-flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex-1 py-2.5 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Result'}
          </button>
        </>
      }
    >
      {/* Score */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 mb-8">
        <div className="team-panel a">
          <div className="team-panel-title">
            <span className="name">Team A</span>
          </div>
          <input
            type="number"
            min={0}
            value={teamAScore}
            onChange={(e) => setTeamAScore(parseInt(e.target.value || '0', 10))}
            className="score-input"
          />
        </div>
        <div className="vs-divider mb-3">VS</div>
        <div className="team-panel b">
          <div className="team-panel-title">
            <span className="name">Team B</span>
          </div>
          <input
            type="number"
            min={0}
            value={teamBScore}
            onChange={(e) => setTeamBScore(parseInt(e.target.value || '0', 10))}
            className="score-input"
          />
        </div>
      </div>

      {/* Goals */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Goals</h3>
          <div className="flex gap-2">
            <button onClick={() => addGoalRow('A')} className="btn-pill team-a">
              <Plus className="w-3 h-3" /> Team A
            </button>
            <button onClick={() => addGoalRow('B')} className="btn-pill team-b">
              <Plus className="w-3 h-3" /> Team B
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <AnimatePresence>{goals.map(renderGoalRow)}</AnimatePresence>
          {goals.length === 0 && (
            <p className="text-sm text-gray-500 italic text-center py-6">
              No goals added — a scoreless result will be recorded.
            </p>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
