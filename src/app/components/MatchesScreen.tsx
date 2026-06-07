import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Match, Goal, SaveEntry, Player, MatchAwards, MatchRsvpStatus } from '../../types';
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
  ChevronRight,
  ArrowRightLeft,
  ClipboardCheck,
  Shuffle,
  Sparkles,
  Shield,
  Copy,
  Mail,
  Award,
  Pencil,
  ChevronDown,
} from 'lucide-react';
import {
  format,
  formatDistanceToNowStrict,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isBefore,
  startOfDay,
} from 'date-fns';
import { toast } from 'sonner';
import {
  formatMatchEmailDate,
  sendMatchReminderEmails,
  sendMatchScheduleEmails,
  sendTeamAssignmentEmails,
} from '../../lib/teamNotifications';
import { DEFAULT_MATCH_AWARDS, getAwardWinners, getResolvedMatchAwards } from '../../lib/matchAwards';
import { getSavePoints, getSuggestedMvpId } from '../../lib/playerStats';
function getMatchRsvpUrl(matchId: string) {
  return `${window.location.origin}${window.location.pathname}?rsvp=1&match=${encodeURIComponent(matchId)}`;
}

function getMatchStartIso(date: Date, time: string) {
  const [hours, minutes] = time.split(':').map((value) => Number.parseInt(value, 10));
  const matchStart = new Date(date);
  matchStart.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return matchStart.toISOString();
}

function getKickoffDateForMatch(match: Match) {
  const kickoff = match.kickoffAtIso ? new Date(match.kickoffAtIso) : new Date(getMatchStartIso(match.date, match.time));
  return Number.isNaN(kickoff.getTime()) ? null : kickoff;
}

function getCountdownLabel(match: Match) {
  const kickoff = getKickoffDateForMatch(match);
  if (!kickoff) return 'Kickoff time unavailable';
  if (kickoff.getTime() <= Date.now()) return 'Kickoff time has passed';
  return formatDistanceToNowStrict(kickoff, { addSuffix: true });
}

async function resendMatchInvites(match: Pick<Match, 'id' | 'date' | 'time' | 'location' | 'notes'>, players: Player[]) {
  const recipients = players
    .filter((player) => player.status === 'active')
    .map((player) => ({
      name: player.name || 'Player',
      email: player.email ?? '',
    }));

  return sendMatchScheduleEmails({
    matchId: match.id,
    date: formatMatchEmailDate(match.date),
    time: match.time,
    location: match.location,
    notes: match.notes,
    rsvpUrl: getMatchRsvpUrl(match.id),
    eventStartIso: getMatchStartIso(match.date, match.time),
    eventTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    recipients,
  });
}

export function MatchesScreen() {
  const { isAdmin } = useAuth();
  const { matches, players, addMatch, deleteMatch } = useData();
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
                const eventTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const kickoffAtIso = getMatchStartIso(data.date, data.time);
                const matchId = await addMatch({
                  ...data,
                  kickoffAtIso,
                  eventTimeZone,
                });
                const emailResult = await resendMatchInvites({
                  id: matchId,
                  date: data.date,
                  time: data.time,
                  location: data.location,
                  notes: data.notes,
                }, players);

                setShowCreateModal(false);
                if (emailResult.skippedCount > 0) {
                  toast.success(`Match scheduled. Sent ${emailResult.sentCount} emails, skipped ${emailResult.skippedCount}.`);
                } else {
                  toast.success(`Match scheduled and ${emailResult.sentCount} RSVP emails sent.`);
                }
              } catch (err) {
                console.error(err);
                toast.error(err instanceof Error ? err.message : 'Failed to schedule');
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
  const aScore = match.teamA.score ?? 0;
  const bScore = match.teamB.score ?? 0;
  const winner: 'a' | 'b' | 'draw' | null = isCompleted
    ? aScore > bScore ? 'a' : bScore > aScore ? 'b' : 'draw'
    : null;

  return (
    <motion.div
      onClick={onClick}
      className="match-card v2"
      style={{ ['--card-accent' as any]: accent }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <div className="match-card-glow" aria-hidden />

      <div className="match-card-header">
        <div className="date-tile">
          <span className="date-tile-month">{format(match.date, 'MMM')}</span>
          <span className="date-tile-day">{format(match.date, 'dd')}</span>
          <span className="date-tile-weekday">{format(match.date, 'EEE')}</span>
        </div>

        <div className="match-card-meta">
          <p className="match-card-title">{format(match.date, 'EEEE')}</p>
          <p className="match-card-subtitle">{format(match.date, 'MMMM dd, yyyy')}</p>
          <div className="match-card-meta-row">
            <span className="meta-chip">
              <Clock className="w-3.5 h-3.5" />
              {match.time}
            </span>
            <span className="meta-chip">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{match.location}</span>
            </span>
          </div>
        </div>

        <div className="match-card-actions">
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

      <div className="scoreboard v2">
        <div className={`team-block team-a ${winner === 'a' ? 'is-winner' : ''} ${winner && winner !== 'a' && winner !== 'draw' ? 'is-loser' : ''}`}>
          <span className="team-stripe" aria-hidden />
          <div className="team-block-inner">
            <span className="team-label">Team A</span>
            <span className="team-meta">
              <Users className="w-3.5 h-3.5" />
              {match.teamA.playerIds.length} {match.teamA.playerIds.length === 1 ? 'player' : 'players'}
            </span>
          </div>
          {isCompleted && <span className="team-score">{aScore}</span>}
        </div>

        <div className={`vs-divider ${isCompleted ? 'is-final' : ''}`}>
          {isCompleted ? (
            <span className="vs-final">FT</span>
          ) : (
            <>
              <span className="vs-text">VS</span>
              <span className="vs-pulse" aria-hidden />
            </>
          )}
        </div>

        <div className={`team-block team-b ${winner === 'b' ? 'is-winner' : ''} ${winner && winner !== 'b' && winner !== 'draw' ? 'is-loser' : ''}`}>
          {isCompleted && <span className="team-score">{bScore}</span>}
          <div className="team-block-inner align-right">
            <span className="team-label">Team B</span>
            <span className="team-meta">
              <Users className="w-3.5 h-3.5" />
              {match.teamB.playerIds.length} {match.teamB.playerIds.length === 1 ? 'player' : 'players'}
            </span>
          </div>
          <span className="team-stripe" aria-hidden />
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
  onSave: (data: Omit<Match, 'id' | 'createdAt'>) => Promise<unknown> | unknown;
}

function CreateMatchModal({ onClose, onSave }: CreateMatchModalProps) {
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [awardTitles, setAwardTitles] = useState<MatchAwards>(DEFAULT_MATCH_AWARDS);

  const updateAwardTitle = (key: keyof MatchAwards, title: string) => {
    setAwardTitles((current) => ({
      ...current,
      [key]: {
        ...current[key],
        title,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast.error('Pick a date');
      return;
    }
    if (!time) {
      toast.error('Pick a time');
      return;
    }
    onSave({
      date,
      time,
      location,
      notes,
      status: 'scheduled',
      teamA: { name: 'Team A', playerIds: [] },
      teamB: { name: 'Team B', playerIds: [] },
      awards: getResolvedMatchAwards(awardTitles),
    });
  };

  return (
    <ModalShell
      title="Schedule New Match"
      subtitle="Pick a date, time and venue."
      onClose={onClose}
      maxWidth="38rem"
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
            <DatePickerField value={date} onChange={setDate} />
          </div>
          <div>
            <label className="field-label">Time</label>
            <TimePickerField value={time} onChange={setTime} />
          </div>
        </div>
        <div>
          <label className="field-label">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="field-input"
            required
            placeholder="e.g. Central Park Field"
          />
        </div>
        <div>
          <label className="field-label">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="field-input resize-none"
            rows={3}
            placeholder="Anything else worth noting…"
          />
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-4">
          <div>
            <h3 className="font-bold">Weekly Awards</h3>
            <p className="text-sm text-gray-500">Set the title for each award before the match.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([
              ['scorer', 'Top scorer award'],
              ['assist', 'Top assist award'],
              ['goalkeeper', 'Goalkeeper award'],
              ['mvp', 'Best player award'],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <label className="field-label">{label}</label>
                <input
                  type="text"
                  value={awardTitles[key].title}
                  onChange={(e) => updateAwardTitle(key, e.target.value)}
                  className="field-input"
                  required
                />
              </div>
            ))}
          </div>
        </div>
      </form>
    </ModalShell>
  );
}

/* ============================================================
 * Date Picker
 * ============================================================ */

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, onClose: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', esc);
    };
  }, [ref, onClose, active]);
}

function DatePickerField({ value, onChange }: { value: Date | null; onChange: (d: Date) => void }) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(value ?? new Date());
  const rootRef = useRef<HTMLDivElement>(null);

  useOutsideClick(rootRef, () => setOpen(false), open);

  useEffect(() => {
    if (open) setViewMonth(value ?? new Date());
  }, [open, value]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const out: Date[] = [];
    let d = gridStart;
    while (!isBefore(gridEnd, d)) {
      out.push(d);
      d = addDays(d, 1);
    }
    return out;
  }, [viewMonth]);

  const today = startOfDay(new Date());
  const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="picker-root" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`picker-trigger ${open ? 'is-open' : ''} ${value ? 'has-value' : ''}`}
      >
        <Calendar className="w-4 h-4 picker-trigger-icon" />
        <span className="picker-trigger-value">
          {value ? format(value, 'EEE, MMM dd, yyyy') : 'Select date'}
        </span>
        <ChevronRight className={`w-4 h-4 picker-trigger-caret ${open ? 'rotated' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="picker-popover"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="cal-header">
              <button
                type="button"
                onClick={() => setViewMonth((m) => subMonths(m, 1))}
                className="cal-nav"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="cal-title">
                <span className="cal-month">{format(viewMonth, 'MMMM')}</span>
                <span className="cal-year">{format(viewMonth, 'yyyy')}</span>
              </div>
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
                className="cal-nav"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="cal-weekdays">
              {weekdays.map((w, i) => (
                <span key={i}>{w}</span>
              ))}
            </div>
            <div className="cal-grid">
              {days.map((d) => {
                const inMonth = isSameMonth(d, viewMonth);
                const isSelected = value && isSameDay(d, value);
                const isToday = isSameDay(d, today);
                return (
                  <button
                    type="button"
                    key={d.toISOString()}
                    onClick={() => {
                      onChange(d);
                      setOpen(false);
                    }}
                    className={[
                      'cal-cell',
                      inMonth ? '' : 'is-muted',
                      isSelected ? 'is-selected' : '',
                      isToday ? 'is-today' : '',
                    ].join(' ')}
                  >
                    {format(d, 'd')}
                  </button>
                );
              })}
            </div>
            <div className="cal-footer">
              <button
                type="button"
                className="cal-quick"
                onClick={() => {
                  onChange(today);
                  setOpen(false);
                }}
              >
                Today
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
 * Time Picker
 * ============================================================ */

function TimePickerField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useOutsideClick(rootRef, () => setOpen(false), open);

  const [h, m] = value ? value.split(':') : ['', ''];
  const hour = h ? parseInt(h, 10) : null;
  const minute = m ? parseInt(m, 10) : null;

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const hourListRef = useRef<HTMLDivElement>(null);
  const minListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const scrollTo = (container: HTMLDivElement | null, sel: string) => {
      if (!container) return;
      const el = container.querySelector<HTMLElement>(sel);
      if (el) container.scrollTop = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
    };
    requestAnimationFrame(() => {
      scrollTo(hourListRef.current, '.time-cell.is-selected');
      scrollTo(minListRef.current, '.time-cell.is-selected');
    });
  }, [open]);

  const setH = (nh: number) => {
    const nm = minute ?? 0;
    onChange(`${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`);
  };
  const setM = (nm: number) => {
    const nh = hour ?? 12;
    onChange(`${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`);
  };

  const display = value
    ? (() => {
        const d = new Date();
        d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
        return format(d, 'HH:mm');
      })()
    : 'Select time';

  return (
    <div className="picker-root" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`picker-trigger ${open ? 'is-open' : ''} ${value ? 'has-value' : ''}`}
      >
        <Clock className="w-4 h-4 picker-trigger-icon" />
        <span className="picker-trigger-value">{display}</span>
        <ChevronRight className={`w-4 h-4 picker-trigger-caret ${open ? 'rotated' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="picker-popover time-popover"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="time-header">
              <span className="time-display">
                <span className={`time-num ${hour !== null ? 'is-set' : ''}`}>
                  {hour !== null ? String(hour).padStart(2, '0') : '--'}
                </span>
                <span className="time-colon">:</span>
                <span className={`time-num ${minute !== null ? 'is-set' : ''}`}>
                  {minute !== null ? String(minute).padStart(2, '0') : '--'}
                </span>
              </span>
            </div>
            <div className="time-columns">
              <div className="time-col">
                <div className="time-col-label">Hour</div>
                <div className="time-list" ref={hourListRef}>
                  {hours.map((hh) => (
                    <button
                      key={hh}
                      type="button"
                      onClick={() => setH(hh)}
                      className={`time-cell ${hour === hh ? 'is-selected' : ''}`}
                    >
                      {String(hh).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="time-col">
                <div className="time-col-label">Minute</div>
                <div className="time-list" ref={minListRef}>
                  {minutes.map((mm) => (
                    <button
                      key={mm}
                      type="button"
                      onClick={() => setM(mm)}
                      className={`time-cell ${minute === mm ? 'is-selected' : ''}`}
                    >
                      {String(mm).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="time-presets">
              {['10:00', '12:00', '15:00', '17:30', '19:00', '20:00'].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`time-preset ${value === t ? 'is-selected' : ''}`}
                  onClick={() => {
                    onChange(t);
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="time-footer">
              <button type="button" className="cal-quick" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
  const { players, goals, updateMatch, deleteGoal } = useData();
  const [view, setView] = useState<'details' | 'teams' | 'result' | 'awards' | 'goal'>('details');
  const [sendingInvites, setSendingInvites] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [showReminderDetails, setShowReminderDetails] = useState(false);

  const rsvpStatusByPlayer = new Map((match.rsvps ?? []).map((entry) => [entry.playerId, entry.status]));
  const teamAPlayers = players.filter((p) => match.teamA.playerIds.includes(p.id));
  const teamBPlayers = players.filter((p) => match.teamB.playerIds.includes(p.id));
  const reminderTeamAPlayers = teamAPlayers.filter((player) => player.status === 'active' && rsvpStatusByPlayer.get(player.id) !== 'out');
  const reminderTeamBPlayers = teamBPlayers.filter((player) => player.status === 'active' && rsvpStatusByPlayer.get(player.id) !== 'out');
  const totalReminderRecipients = reminderTeamAPlayers.length + reminderTeamBPlayers.length;
  const kickoffAt = getKickoffDateForMatch(match);
  const countdownLabel = getCountdownLabel(match);
  const matchGoals = goals
    .filter((goal) => goal.matchId === match.id)
    .sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999));
  const mvp = match.mvpId ? players.find((player) => player.id === match.mvpId) : null;
  const awards = getResolvedMatchAwards(match.awards, players);
  const rsvpCounts = {
    in: match.rsvps?.filter((entry) => entry.status === 'in').length ?? 0,
    maybe: match.rsvps?.filter((entry) => entry.status === 'maybe').length ?? 0,
    out: match.rsvps?.filter((entry) => entry.status === 'out').length ?? 0,
  };
  const rsvpPlayers: Record<MatchRsvpStatus, Player[]> = {
    in: [],
    maybe: [],
    out: [],
  };

  (match.rsvps ?? []).forEach((entry) => {
    const player = players.find((candidate) => candidate.id === entry.playerId);
    if (player) {
      rsvpPlayers[entry.status].push(player);
    }
  });

  const copyRsvpLink = async () => {
    try {
      await navigator.clipboard.writeText(getMatchRsvpUrl(match.id));
      toast.success('RSVP link copied');
    } catch (error) {
      console.error(error);
      toast.error('Failed to copy RSVP link');
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await deleteGoal(goalId);
      toast.success('Goal removed');
    } catch (error) {
      console.error(error);
      toast.error('Failed to remove goal');
    }
  };

  const handleSendInvites = async () => {
    if (sendingInvites) return;
    setSendingInvites(true);
    try {
      const emailResult = await resendMatchInvites(match, players);
      if (emailResult.skippedCount > 0) {
        toast.success(`Invites sent to ${emailResult.sentCount} players, skipped ${emailResult.skippedCount}.`);
      } else {
        toast.success(`Invites sent to ${emailResult.sentCount} players.`);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to send invites');
    } finally {
      setSendingInvites(false);
    }
  };

  const handleSendReminder = async () => {
    if (sendingReminder) return;
    setSendingReminder(true);
    try {
      const teamARecipientNames = reminderTeamAPlayers.map((player) => player.name);
      const teamBRecipientNames = reminderTeamBPlayers.map((player) => player.name);
      const result = await sendMatchReminderEmails({
        manual: {
          date: formatMatchEmailDate(match.date),
          time: match.time,
          location: match.location,
          countdownLabel,
          notes: match.notes,
          recipients: [
            ...reminderTeamAPlayers.map((player) => ({
              email: player.email,
              playerName: player.name,
              teamName: match.teamA.name,
              teammateList: teamARecipientNames.filter((name) => name !== player.name).join(', ') || 'No teammates assigned yet',
              opponentTeamName: match.teamB.name,
              opponentList: teamBRecipientNames.join(', ') || 'No opposition assigned yet',
            })),
            ...reminderTeamBPlayers.map((player) => ({
              email: player.email,
              playerName: player.name,
              teamName: match.teamB.name,
              teammateList: teamBRecipientNames.filter((name) => name !== player.name).join(', ') || 'No teammates assigned yet',
              opponentTeamName: match.teamA.name,
              opponentList: teamARecipientNames.join(', ') || 'No opposition assigned yet',
            })),
          ],
        },
      });
      if (result.sentCount > 0) {
        toast.success(`Sent ${result.sentCount} personal reminder${result.sentCount === 1 ? '' : 's'}.`);
      } else {
        toast.message(result.skippedReason ? `Reminder skipped: ${result.skippedReason}` : 'No reminders were sent.');
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to send reminders');
    } finally {
      setSendingReminder(false);
    }
  };

  if (view === 'teams') {
    return <TeamAssignmentModal match={match} onClose={onClose} onBack={() => setView('details')} />;
  }

  if (view === 'result') {
    return <RecordResultModal match={match} onClose={onClose} onBack={() => setView('details')} />;
  }

  if (view === 'awards') {
    return (
      <EditAwardsModal
        match={match}
        onClose={onClose}
        onBack={() => setView('details')}
        onSave={async (awards) => {
          await updateMatch(match.id, { awards });
        }}
      />
    );
  }

  if (view === 'goal') {
    return (
      <QuickGoalModal
        match={match}
        onClose={onClose}
        onBack={() => setView('details')}
      />
    );
  }

  const isCompleted = match.status === 'completed';

  return (
    <ModalShell
      title="Match Details"
      subtitle={format(match.date, 'EEEE, MMMM dd, yyyy')}
      onClose={onClose}
      maxWidth="64rem"
      footer={
        <div className="match-details-footer-actions">
          <button onClick={onClose} className="btn-secondary flex-1">
            Close
          </button>
          {isAdmin && (
            <>
              {match.status === 'scheduled' && (
                <>
                  <button
                    onClick={handleSendInvites}
                    disabled={sendingInvites}
                    className="btn-secondary flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Mail className="w-4 h-4" />
                    {sendingInvites ? 'Sending…' : 'Send Invites'}
                  </button>
                  <button onClick={() => setView('teams')} className="btn-secondary flex-1 inline-flex items-center justify-center gap-2">
                    <ArrowRightLeft className="w-4 h-4" />
                    Teams
                  </button>
                  <button onClick={() => setView('awards')} className="btn-secondary flex-1 inline-flex items-center justify-center gap-2">
                    <Pencil className="w-4 h-4" />
                    Edit Awards
                  </button>
                </>
              )}
              <button onClick={() => setView('result')} className="btn-primary flex-1 py-2.5 inline-flex items-center justify-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                {isCompleted ? 'Edit Result' : 'Record Result'}
              </button>
            </>
          )}
        </div>
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

        {isAdmin && match.status !== 'completed' && (
          <>
            <div className="rounded-[1.4rem] border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(3,7,18,0.78))] p-5 shadow-[0_20px_60px_-30px_rgba(16,185,129,0.65)]">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="pill mb-3 border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                      <Mail className="w-3 h-3" />
                      Personal Reminder
                    </div>
                    <h3 className="text-xl font-bold mb-1">Send a match-ready reminder</h3>
                    <p className="text-sm text-emerald-100/70 max-w-2xl">
                      Every player gets their own message with kickoff timing, team assignment, teammates, and opposition so nobody has to guess where they belong.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowReminderDetails((current) => !current)}
                    aria-expanded={showReminderDetails}
                    className="inline-flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition-colors hover:border-white/20 hover:bg-black/30"
                  >
                    <div className="text-left">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-200/60 mb-1">Reminder Summary</p>
                      <p className="text-sm font-semibold text-white">{totalReminderRecipients} players ready</p>
                      <p className="text-xs text-emerald-100/60">{countdownLabel}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 shrink-0 text-emerald-100/75 transition-transform duration-200 ${showReminderDetails ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {showReminderDetails && (
                    <motion.div
                      key="reminder-details"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="pt-1 space-y-4">
                        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4 items-start">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                            <div className="self-start rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                              <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-200/60 mb-1">Time Until Match</p>
                              <p className="text-lg font-semibold text-white">{countdownLabel}</p>
                              {kickoffAt && (
                                <p className="text-xs text-emerald-100/60 mt-1">
                                  {format(kickoffAt, 'EEE, MMM dd · HH:mm')}
                                </p>
                              )}
                            </div>
                            <div className="self-start rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                              <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-200/60 mb-1">Recipients</p>
                              <p className="text-lg font-semibold text-white">{totalReminderRecipients} players</p>
                              <p className="text-xs text-emerald-100/60 mt-1">
                                Team A {reminderTeamAPlayers.length} · Team B {reminderTeamBPlayers.length}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
                              <div>
                                <p className="text-sm font-semibold text-white">Reminder Preview</p>
                                <p className="text-xs text-emerald-100/60">A quick look at what gets sent</p>
                              </div>
                              <button
                                onClick={handleSendReminder}
                                disabled={sendingReminder}
                                className="btn-primary inline-flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                <Mail className="w-4 h-4" />
                                {sendingReminder ? 'Sending…' : 'Send Reminder Now'}
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/8 px-4 py-3">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-200/55 mb-2">What They Get</p>
                                <div className="grid gap-1.5 text-sm text-emerald-50">
                                  <p>Exact countdown to kickoff</p>
                                  <p>Assigned team and teammate list</p>
                                  <p>Opposition roster and match location</p>
                                </div>
                              </div>
                              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-200/55 mb-2">Delivery Rules</p>
                                <div className="grid gap-1.5 text-sm text-white">
                                  <p>Only players in teams and available</p>
                                  <p>Skips inactive and RSVP-out players</p>
                                  <p>Automatic send in the last hour</p>
                                  <p>One personalized version per player</p>
                                </div>
                              </div>
                            </div>

                            <p className="mt-3 text-xs text-emerald-100/60">
                              Automatic reminders still go out during the last hour before kickoff. This button is your manual override, and it only targets assigned players who are actually available for the match.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <ReminderTeamPanel title={match.teamA.name} variant="a" players={reminderTeamAPlayers} />
                          <ReminderTeamPanel title={match.teamB.name} variant="b" players={reminderTeamBPlayers} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Sideline Goal Entry</p>
                  <p className="text-sm text-emerald-100/65">
                    Log scorer and assist while the match is live. Goals stay attached to this match and are reused when the final result is saved.
                  </p>
                </div>
                <button
                  onClick={() => setView('goal')}
                  className="btn-secondary inline-flex w-full items-center justify-center gap-2 sm:w-auto"
                >
                  <Plus className="w-4 h-4" />
                  Log Goal
                </button>
              </div>
            </div>
          </>
        )}

        {match.status === 'scheduled' && (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-bold mb-1">Share RSVP Link</h3>
                <p className="text-sm text-gray-500">
                  Players can open the link, check in, and get added to the team selection pool.
                </p>
              </div>
              {isAdmin && (
                <button onClick={copyRsvpLink} className="btn-secondary inline-flex items-center gap-2">
                  <Copy className="w-4 h-4" />
                  Copy Link
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <RsvpCountPill label="In" value={rsvpCounts.in} accent="text-emerald-300" players={rsvpPlayers.in} />
              <RsvpCountPill label="Maybe" value={rsvpCounts.maybe} accent="text-amber-300" players={rsvpPlayers.maybe} />
              <RsvpCountPill label="Out" value={rsvpCounts.out} accent="text-rose-300" players={rsvpPlayers.out} />
            </div>
          </div>
        )}

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

        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div>
              <h3 className="font-bold">Weekly Awards</h3>
              <p className="text-sm text-gray-500">
                {isCompleted ? 'Winners were assigned automatically from the recorded result.' : 'These titles will be awarded automatically when the result is recorded.'}
              </p>
            </div>
            {isAdmin && match.status === 'scheduled' && (
              <button onClick={() => setView('awards')} className="btn-secondary inline-flex items-center gap-2">
                <Pencil className="w-4 h-4" />
                Edit Titles
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              ['scorer', 'Scorer'],
              ['assist', 'Assist'],
              ['goalkeeper', 'Goalkeeper'],
              ['mvp', 'Best Player'],
            ] as const).map(([key, fallbackLabel]) => {
              const winner = awards[key].winnerId
                ? players.find((player) => player.id === awards[key].winnerId)
                : null;

              return (
                <div key={key} className="rounded-xl border border-white/5 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                    {fallbackLabel}
                  </p>
                  <p className="font-medium text-white">{awards[key].title}</p>
                  <p className="text-sm text-gray-400 mt-2">
                    {winner ? winner.name : isCompleted ? 'No winner assigned' : 'Waiting for result'}
                  </p>
                </div>
              );
            })}
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

        {(matchGoals.length > 0 || isCompleted) && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Match Events</h3>
              <span className="text-sm text-gray-500">
                {matchGoals.length} {matchGoals.length === 1 ? 'goal' : 'goals'}
              </span>
            </div>
            <div className="space-y-2">
              {mvp && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                        <Award className="w-5 h-5 text-emerald-300" />
                      </div>
                      <div>
                        <p className="font-medium text-emerald-200">{mvp.name}</p>
                        <p className="text-sm text-emerald-100/70">Suggested MVP</p>
                      </div>
                    </div>
                    <span className="btn-pill team-a pointer-events-none">MVP</span>
                  </div>
                </div>
              )}
              {matchGoals.map((goal) => {
                const scorer = players.find((player) => player.id === goal.scorerId);
                const assister = goal.assistId
                  ? players.find((player) => player.id === goal.assistId)
                  : null;
              return (
                  <GoalEventCard
                    key={goal.id}
                    scorer={scorer}
                    assister={assister}
                    team={goal.team}
                    ownGoal={goal.ownGoal}
                    minute={goal.minute}
                    canDelete={isAdmin && match.status !== 'completed'}
                    onDelete={() => handleDeleteGoal(goal.id)}
                  />
                );
              })}
              {match.saves?.map((entry) => {
                const player = players.find((candidate) => candidate.id === entry.playerId);
                return (
                  <div
                    key={entry.playerId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10">
                        <Shield className="w-5 h-5 text-cyan-300" />
                      </div>
                      <div>
                        <p className="font-medium">{player?.name ?? 'Unknown player'}</p>
                        <p className="text-sm text-gray-500">Saves</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-300">{entry.saves}</p>
                      <p className="text-xs text-gray-500">{getSavePoints(entry.saves)} pts</p>
                    </div>
                  </div>
                );
              })}
              {matchGoals.length === 0 && (match.saves?.length ?? 0) === 0 && (
                <p className="text-sm text-gray-500 italic text-center py-4">
                  No recorded events yet.
                </p>
              )}
            </div>
          </div>
        )}

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

function GoalEventCard({
  scorer,
  assister,
  team,
  ownGoal,
  minute,
  canDelete,
  onDelete,
}: {
  scorer?: Player | null;
  assister?: Player | null;
  team: 'A' | 'B';
  ownGoal?: boolean;
  minute?: number;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const variant = team === 'A' ? 'a' : 'b';
  const teamLabel = `Team ${team}`;
  const ownGoalByTeam = team === 'A' ? 'B' : 'A';

  return (
    <div className={`goal-event-card ${variant}`}>
      <div className="goal-event-card__glow" />
      <div className="goal-event-card__topline">
        <div className="goal-event-card__meta">
          <span className={`btn-pill ${team === 'A' ? 'team-a' : 'team-b'} pointer-events-none`}>{teamLabel}</span>
          <span className="goal-event-card__type">
            {ownGoal ? 'Own goal' : assister ? 'Linked play' : 'Solo finish'}
          </span>
        </div>
        <div className="goal-event-card__actions">
          <span className="goal-event-card__minute">{minute !== undefined ? `${minute}'` : 'FT'}</span>
          {canDelete && (
            <button
              onClick={onDelete}
              className="btn-danger-soft"
              title="Delete goal"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {ownGoal ? (
        <div className="goal-solo">
          <EventPlayerChip
            label="Own goal"
            fallbackName={`Team ${ownGoalByTeam}`}
            emphasis="finish"
          />
          <div className="goal-solo__note">Credited to Team {team}</div>
        </div>
      ) : assister ? (
        <div className="goal-link">
          <EventPlayerChip
            label="Assist"
            player={assister}
            emphasis="support"
          />
          <div className="goal-link__connector" aria-hidden="true">
            <div className="goal-link__line" />
            <Sparkles className="goal-link__icon" />
            <div className="goal-link__line" />
          </div>
          <EventPlayerChip
            label="Goal"
            player={scorer}
            emphasis="finish"
          />
        </div>
      ) : (
        <div className="goal-solo">
          <EventPlayerChip
            label="Goal"
            player={scorer}
            emphasis="finish"
          />
          <div className="goal-solo__note">Unassisted finish</div>
        </div>
      )}
    </div>
  );
}

function EventPlayerChip({
  label,
  player,
  fallbackName,
  emphasis,
}: {
  label: string;
  player?: Player | null;
  fallbackName?: string;
  emphasis: 'support' | 'finish';
}) {
  const name =
    player?.name
    ?? fallbackName
    ?? (label === 'Assist' ? 'Unknown assister' : 'Unknown scorer');
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className={`event-player-chip ${emphasis}`}>
      <div className="event-player-chip__avatar" aria-hidden="true">
        {player?.avatar ? (
          <img src={player.avatar} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span>{initial}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="event-player-chip__label">{label}</p>
        <p className="event-player-chip__name">{name}</p>
      </div>
    </div>
  );
}

function ReminderTeamPanel({
  title,
  variant,
  players,
}: {
  title: string;
  variant: 'a' | 'b';
  players: { id: string; name: string }[];
}) {
  return (
    <div className={`rounded-2xl border p-4 ${variant === 'a' ? 'border-sky-400/20 bg-sky-500/10' : 'border-rose-400/20 bg-rose-500/10'}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-white/55">{players.length} assigned</p>
        </div>
        <span className={`btn-pill ${variant === 'a' ? 'team-a' : 'team-b'} pointer-events-none`}>
          Team {variant.toUpperCase()}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {players.map((player) => (
          <div key={player.id} className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/90">
            {player.name}
          </div>
        ))}
        {players.length === 0 && (
          <p className="text-sm text-white/55 italic">No players assigned yet.</p>
        )}
      </div>
    </div>
  );
}

function RsvpCountPill({ label, value, accent, players }: { label: string; value: number; accent: string; players: Player[] }) {
  const visiblePlayers = players.slice(0, 4);
  const overflowCount = players.length - visiblePlayers.length;

  return (
    <div className="rounded-lg border border-white/5 bg-black/20 p-3 text-center min-h-[112px] flex flex-col justify-between">
      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${accent}`}>{value}</p>
      <div className="mt-3 flex items-center justify-center min-h-8">
        {visiblePlayers.length > 0 ? (
          <div className="flex items-center justify-center">
            {visiblePlayers.map((player, index) => (
              <div
                key={player.id}
                className={`relative h-8 w-8 overflow-hidden rounded-full border border-[#111827] bg-white/10 ${index > 0 ? '-ml-2.5' : ''}`}
                title={player.name}
              >
                {player.avatar ? (
                  <img src={player.avatar} alt={player.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[11px] font-bold text-white/80">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ))}
            {overflowCount > 0 && (
              <div className="-ml-2.5 flex h-8 w-8 items-center justify-center rounded-full border border-[#111827] bg-white/10 text-[11px] font-semibold text-white/80">
                +{overflowCount}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-600">No replies</p>
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

interface EditAwardsModalProps {
  match: Match;
  onClose: () => void;
  onBack: () => void;
  onSave: (awards: MatchAwards) => Promise<void>;
}

function EditAwardsModal({ match, onClose, onBack, onSave }: EditAwardsModalProps) {
  const [awardTitles, setAwardTitles] = useState<MatchAwards>(getResolvedMatchAwards(match.awards));
  const [saving, setSaving] = useState(false);

  const updateAwardTitle = (key: keyof MatchAwards, title: string) => {
    setAwardTitles((current) => ({
      ...current,
      [key]: {
        ...current[key],
        title,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(getResolvedMatchAwards(awardTitles));
      toast.success('Award titles updated');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update award titles');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Edit Weekly Awards"
      subtitle="Adjust award titles after the match has been created."
      onClose={onClose}
      maxWidth="38rem"
      footer={
        <>
          <button onClick={onBack} className="btn-secondary inline-flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-2.5 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Awards'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {([
          ['scorer', 'Top scorer award'],
          ['assist', 'Top assist award'],
          ['goalkeeper', 'Goalkeeper award'],
          ['mvp', 'Best player award'],
        ] as const).map(([key, label]) => (
          <div key={key}>
            <label className="field-label">{label}</label>
            <input
              type="text"
              value={awardTitles[key].title}
              onChange={(e) => updateAwardTitle(key, e.target.value)}
              className="field-input"
              required
            />
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

interface QuickGoalModalProps {
  match: Match;
  onClose: () => void;
  onBack: () => void;
}

function QuickGoalModal({ match, onClose, onBack }: QuickGoalModalProps) {
  const { players, goals, addGoal } = useData();
  const [team, setTeam] = useState<'A' | 'B'>('A');
  const [ownGoal, setOwnGoal] = useState(false);
  const [scorerId, setScorerId] = useState('');
  const [assistId, setAssistId] = useState<string | undefined>(NO_ASSIST_VALUE);
  const [saving, setSaving] = useState(false);

  const teamAPlayers = players.filter((p) => match.teamA.playerIds.includes(p.id));
  const teamBPlayers = players.filter((p) => match.teamB.playerIds.includes(p.id));
  const teamPlayers = team === 'A' ? teamAPlayers : teamBPlayers;
  const matchGoals = goals
    .filter((goal) => goal.matchId === match.id)
    .sort((a, b) => (a.createdAt?.getTime?.() ?? 0) - (b.createdAt?.getTime?.() ?? 0));

  const scorerPlayer = scorerId ? players.find((player) => player.id === scorerId) ?? null : null;
  const normalizedAssistId = assistId === NO_ASSIST_VALUE ? undefined : assistId;
  const assistPlayer = normalizedAssistId
    ? players.find((player) => player.id === normalizedAssistId) ?? null
    : null;
  const ownGoalByTeam = team === 'A' ? 'B' : 'A';

  const handleTeamChange = (nextTeam: 'A' | 'B') => {
    setTeam(nextTeam);
    setOwnGoal(false);
    setScorerId('');
    setAssistId(NO_ASSIST_VALUE);
  };

  const handleSave = async () => {
    if (!ownGoal && !scorerId) {
      toast.error('Pick a scorer');
      return;
    }

    setSaving(true);
    try {
      await addGoal({
        matchId: match.id,
        scorerId: ownGoal ? undefined : scorerId,
        assistId: ownGoal ? undefined : normalizedAssistId,
        team,
        ownGoal,
      });
      toast.success('Goal logged');
      setOwnGoal(false);
      setScorerId('');
      setAssistId(NO_ASSIST_VALUE);
    } catch (error) {
      console.error(error);
      toast.error('Failed to log goal');
    } finally {
      setSaving(false);
    }
  };

  const renderPlayerButton = (player: Player, kind: 'scorer' | 'assist') => {
    const isSelected = kind === 'scorer' ? scorerId === player.id : normalizedAssistId === player.id;
    const disabled = kind === 'assist' && player.id === scorerId;

    return (
      <button
        key={player.id}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (kind === 'scorer') {
            if (isSelected) {
              setScorerId('');
              if (normalizedAssistId === player.id) setAssistId(NO_ASSIST_VALUE);
              return;
            }
            setScorerId(player.id);
            if (normalizedAssistId === player.id) setAssistId(NO_ASSIST_VALUE);
          } else {
            if (isSelected) {
              setAssistId(NO_ASSIST_VALUE);
              return;
            }
            setAssistId(player.id);
          }
        }}
        className={`rounded-2xl border px-3 py-3 text-left transition ${
          isSelected
            ? team === 'A'
              ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100'
              : 'border-rose-400/50 bg-rose-500/15 text-rose-100'
            : 'border-white/10 bg-white/[0.03] text-gray-200 hover:bg-white/[0.06]'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm leading-tight break-words">{player.name}</span>
          {isSelected && <CheckCircle className="w-4 h-4 shrink-0" />}
        </div>
      </button>
    );
  };

  return (
    <ModalShell
      title="Log Goal"
      subtitle="Mobile-friendly goal entry for live sideline use."
      onClose={onClose}
      maxWidth="42rem"
      footer={
        <>
          <button onClick={onBack} className="btn-secondary inline-flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex-1 py-2.5 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Goal'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleTeamChange('A')}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              team === 'A'
                ? 'border-emerald-400/50 bg-emerald-500/15'
                : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
            }`}
          >
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Team</p>
            <p className="mt-1 font-semibold">Team A</p>
            <p className="text-sm text-gray-500">{teamAPlayers.length} players available</p>
          </button>
          <button
            type="button"
            onClick={() => handleTeamChange('B')}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              team === 'B'
                ? 'border-rose-400/50 bg-rose-500/15'
                : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
            }`}
          >
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Team</p>
            <p className="mt-1 font-semibold">Team B</p>
            <p className="text-sm text-gray-500">{teamBPlayers.length} players available</p>
          </button>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-bold">Scorer</h3>
              <p className="text-sm text-gray-500">Tap the player who scored.</p>
            </div>
            {scorerPlayer && (
              <span className={`btn-pill ${team === 'A' ? 'team-a' : 'team-b'} pointer-events-none`}>
                {scorerPlayer.name}
              </span>
            )}
            {ownGoal && (
              <span className={`btn-pill ${team === 'A' ? 'team-a' : 'team-b'} pointer-events-none`}>
                Own goal by Team {ownGoalByTeam}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setOwnGoal((current) => {
                const next = !current;
                if (next) {
                  setScorerId('');
                  setAssistId(NO_ASSIST_VALUE);
                }
                return next;
              });
            }}
            className={`btn-pill ${ownGoal ? (team === 'A' ? 'team-a' : 'team-b') : ''}`}
          >
            Own goal by Team {ownGoalByTeam}
          </button>
          {ownGoal ? (
            <p className="text-sm text-gray-500 italic">
              This adds a goal for Team {team} without crediting a scorer or assist.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {teamPlayers.map((player) => renderPlayerButton(player, 'scorer'))}
              {teamPlayers.length === 0 && (
                <p className="text-sm text-gray-500 italic">No players assigned to this team.</p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-bold">Assist</h3>
              <p className="text-sm text-gray-500">Optional. Tap no assist if needed.</p>
            </div>
            <button
              type="button"
              onClick={() => setAssistId(NO_ASSIST_VALUE)}
              disabled={ownGoal}
              className={`btn-pill ${normalizedAssistId === undefined && !ownGoal ? (team === 'A' ? 'team-a' : 'team-b') : ''} ${ownGoal ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              No assist
            </button>
          </div>
          {ownGoal ? (
            <p className="text-sm text-gray-500 italic">Assists are not available for own goals.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {teamPlayers
                .filter((player) => player.id !== scorerId)
                .map((player) => renderPlayerButton(player, 'assist'))}
              {teamPlayers.filter((player) => player.id !== scorerId).length === 0 && (
                <p className="text-sm text-gray-500 italic">Only the scorer is available for this assist list.</p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-200">Current selection</p>
              <p className="text-sm text-gray-500">
                Team {team}
                {ownGoal
                  ? ` · own goal by Team ${ownGoalByTeam}`
                  : ` · ${scorerPlayer?.name ?? 'no scorer yet'}${normalizedAssistId ? ` · assist ${assistPlayer?.name ?? 'selected'}` : ' · no assist'}`}
              </p>
            </div>
            <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
              {matchGoals.length} logged
            </span>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function TeamAssignmentModal({ match, onClose, onBack }: TeamAssignmentModalProps) {
  const { players, updateMatch } = useData();
  const [teamA, setTeamA] = useState<string[]>(match.teamA.playerIds);
  const [teamB, setTeamB] = useState<string[]>(match.teamB.playerIds);
  const [shuffling, setShuffling] = useState(false);
  const [saving, setSaving] = useState(false);

  const rsvpPlayerIds = new Set((match.rsvps ?? []).map((entry) => entry.playerId));
  const checkedInPlayerIds = new Set(
    (match.rsvps ?? [])
      .filter((entry) => entry.status === 'in')
      .map((entry) => entry.playerId)
  );
  const assignedPlayers = [...teamA, ...teamB];
  const availablePlayers = players.filter(
    (p) =>
      p.status === 'active'
      && !assignedPlayers.includes(p.id)
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
    if (saving) return;
    setSaving(true);
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

      const recipients = [
        ...teamA.map((playerId) => {
          const player = players.find((entry) => entry.id === playerId);
          return {
            name: player?.name ?? 'Player',
            email: player?.email ?? '',
            teamName: match.teamA.name,
          };
        }),
        ...teamB.map((playerId) => {
          const player = players.find((entry) => entry.id === playerId);
          return {
            name: player?.name ?? 'Player',
            email: player?.email ?? '',
            teamName: match.teamB.name,
          };
        }),
      ];

      const emailResult = await sendTeamAssignmentEmails({
        matchId: match.id,
        date: formatMatchEmailDate(match.date),
        time: match.time,
        location: match.location,
        notes: match.notes,
        recipients,
      });

      if (emailResult.skippedCount > 0) {
        toast.success(`Teams updated. Sent ${emailResult.sentCount} emails, skipped ${emailResult.skippedCount}.`);
      } else {
        toast.success(`Teams updated and ${emailResult.sentCount} emails sent.`);
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to update teams');
    } finally {
      setSaving(false);
    }
  };

  const chipSpring = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.7 };

  const renderChip = (playerId: string, side: 'A' | 'B' | 'available') => {
    const player = players.find((p) => p.id === playerId);
    if (!player) return null;
    const isCheckedIn = checkedInPlayerIds.has(playerId);
    const hasRsvp = rsvpPlayerIds.has(playerId);
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
        className={`player-chip ${isCheckedIn ? 'ring-1 ring-emerald-400/50 bg-emerald-500/[0.08]' : hasRsvp ? 'ring-1 ring-amber-400/40 bg-amber-500/[0.06]' : ''}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 flex-wrap">
          <motion.span layout="position" className="font-medium min-w-0 flex-1 break-words">
            {player.name}
          </motion.span>
          {hasRsvp && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                isCheckedIn
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-amber-500/15 text-amber-300'
              }`}
            >
              {isCheckedIn ? 'RSVP In' : 'RSVP'}
            </span>
          )}
        </div>
        {side === 'available' ? (
          <div className="flex shrink-0 gap-1 self-start">
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
      subtitle={`${assignedPlayers.length} assigned · ${availablePlayers.length} available · RSVP players highlighted`}
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
            disabled={saving}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary flex-1 py-2.5 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Teams'}
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
type SaveDraft = SaveEntry;
const OWN_GOAL_VALUE = '__OWN_GOAL__';
const NO_ASSIST_VALUE = '__NO_ASSIST__';

function RecordResultModal({ match, onClose, onBack }: RecordResultModalProps) {
  const { players, goals: allGoals, recordResult } = useData();
  const existingGoals = allGoals
    .filter((goal) => goal.matchId === match.id)
    .sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999));
  const existingGoalTotals = existingGoals.reduce(
    (totals, goal) => {
      if (goal.team === 'A') {
        totals.teamA += 1;
      } else {
        totals.teamB += 1;
      }
      return totals;
    },
    { teamA: 0, teamB: 0 }
  );
  const [goals, setGoals] = useState<GoalDraft[]>(
    existingGoals.map((goal) => ({
      scorerId: goal.scorerId,
      assistId: goal.assistId ?? NO_ASSIST_VALUE,
      team: goal.team,
      ownGoal: goal.ownGoal ?? false,
      minute: goal.minute,
    }))
  );
  const [saves, setSaves] = useState<Record<string, number>>(
    Object.fromEntries((match.saves ?? []).map((entry) => [entry.playerId, entry.saves]))
  );
  const [saving, setSaving] = useState(false);
  const normalizedGoals = goals.map((goal) => ({
    ...goal,
    assistId: goal.assistId === NO_ASSIST_VALUE ? undefined : goal.assistId,
  }));
  const goalTotals = goals.reduce(
    (totals, goal) => {
      if (goal.team === 'A') {
        totals.teamA += 1;
      } else {
        totals.teamB += 1;
      }
      return totals;
    },
    { teamA: 0, teamB: 0 }
  );

  const teamAPlayers = players.filter((p) => match.teamA.playerIds.includes(p.id));
  const teamBPlayers = players.filter((p) => match.teamB.playerIds.includes(p.id));
  const saveEligiblePlayers = [...teamAPlayers, ...teamBPlayers];
  const suggestedMvpId = getSuggestedMvpId({
    playerIds: [...match.teamA.playerIds, ...match.teamB.playerIds],
    goals: normalizedGoals,
    saves: Object.entries(saves)
      .map(([playerId, total]) => ({ playerId, saves: total }))
      .filter((entry) => entry.saves > 0),
  });
  const suggestedMvp = suggestedMvpId
    ? players.find((player) => player.id === suggestedMvpId)
    : null;
  const suggestedAwards = getAwardWinners({
    awards: match.awards,
    goals: normalizedGoals,
    saves: Object.entries(saves)
      .map(([playerId, total]) => ({ playerId, saves: total }))
      .filter((entry) => entry.saves > 0),
    suggestedMvpId,
    players,
  });

  const addGoalRow = (team: 'A' | 'B') => {
    setGoals([...goals, { scorerId: '', assistId: NO_ASSIST_VALUE, team, ownGoal: false, minute: undefined }]);
  };
  const updateGoal = (index: number, patch: Partial<GoalDraft>) => {
    setGoals(goals.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  };
  const removeGoal = (index: number) => setGoals(goals.filter((_, i) => i !== index));
  const updateSaves = (playerId: string, value: number) => {
    setSaves((current) => ({ ...current, [playerId]: value }));
  };

  const handleSave = async () => {
    if (goals.some((g) => !g.ownGoal && !g.scorerId)) {
      toast.error('All goals need a scorer');
      return;
    }

    const saveEntries: SaveDraft[] = Object.entries(saves)
      .map(([playerId, total]) => ({ playerId, saves: total }))
      .filter((entry) => entry.saves > 0);
    setSaving(true);
    try {
      await recordResult(match.id, goalTotals.teamA, goalTotals.teamB, normalizedGoals, saveEntries, suggestedMvpId);
      toast.success(match.status === 'completed' ? 'Result updated' : 'Result recorded');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : match.status === 'completed'
          ? 'Failed to update result'
          : 'Failed to record result'
      );
    } finally {
      setSaving(false);
    }
  };

  const renderGoalRow = (g: GoalDraft, idx: number) => {
    const scorerPool = g.team === 'A' ? teamAPlayers : teamBPlayers;
    const ownGoalByTeam = g.team === 'A' ? 'B' : 'A';
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
          value={g.ownGoal ? OWN_GOAL_VALUE : (g.scorerId ?? '')}
          onChange={(e) => {
            if (e.target.value === OWN_GOAL_VALUE) {
              updateGoal(idx, { scorerId: undefined, assistId: undefined, ownGoal: true });
              return;
            }
            updateGoal(idx, { scorerId: e.target.value, ownGoal: false });
          }}
          className="field-input text-sm flex-1 min-w-[140px] py-1.5"
        >
          <option value="">Scorer…</option>
          <option value={OWN_GOAL_VALUE}>Own goal by Team {ownGoalByTeam}</option>
          {scorerPool.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={g.assistId ?? NO_ASSIST_VALUE}
          onChange={(e) => updateGoal(idx, { assistId: e.target.value })}
          disabled={g.ownGoal}
          className={`field-input text-sm flex-1 min-w-[140px] py-1.5 ${g.ownGoal ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <option value={NO_ASSIST_VALUE}>No assist</option>
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
      title={match.status === 'completed' ? 'Edit Result' : 'Record Result'}
      subtitle={
        existingGoals.length > 0 && match.status !== 'completed'
          ? 'Final score is prefilled from the goals already logged during play.'
          : 'Set final score, goalscorers, saves, and let the weekly awards auto-assign.'
      }
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
            {saving ? 'Saving…' : match.status === 'completed' ? 'Update Result' : 'Save Result'}
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
            value={goalTotals.teamA}
            readOnly
            aria-readonly="true"
            className="score-input cursor-default"
          />
        </div>
        <div className="vs-divider mb-3">VS</div>
        <div className="team-panel b">
          <div className="team-panel-title">
            <span className="name">Team B</span>
          </div>
          <input
            type="number"
            value={goalTotals.teamB}
            readOnly
            aria-readonly="true"
            className="score-input cursor-default"
          />
        </div>
      </div>
      <p className="text-xs text-gray-500 -mt-5 mb-6">
        Final score is calculated from the logged goal rows, so match score, events, and leaderboard stats stay in sync.
      </p>

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

      <div className="mt-8">
        <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                <Award className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <p className="font-medium text-emerald-200">
                  {suggestedMvp?.name ?? 'No MVP suggested yet'}
                </p>
                <p className="text-sm text-emerald-100/70">
                  Auto-suggested from goals, assists, and save points
                </p>
              </div>
            </div>
            <span className="btn-pill team-a pointer-events-none">MVP</span>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="mb-3">
            <h3 className="font-bold">Award Preview</h3>
            <p className="text-sm text-gray-500">These update live as you enter goals and saves.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              ['scorer', 'Scorer'],
              ['assist', 'Assist'],
              ['goalkeeper', 'Goalkeeper'],
              ['mvp', 'Best Player'],
            ] as const).map(([key, fallbackLabel]) => {
              const winner = suggestedAwards[key].winnerId
                ? players.find((player) => player.id === suggestedAwards[key].winnerId)
                : null;

              return (
                <div key={key} className="rounded-xl border border-white/5 bg-black/20 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                    {fallbackLabel}
                  </p>
                  <p className="font-medium">{suggestedAwards[key].title}</p>
                  <p className="text-sm text-gray-400 mt-1">{winner?.name ?? 'No winner yet'}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Saves</h3>
          <p className="text-sm text-gray-500">You can log saves for any player. 1 point per 4 saves.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {saveEligiblePlayers.map((player) => {
            const team = match.teamA.playerIds.includes(player.id) ? 'A' : 'B';
            return (
              <div
                key={player.id}
                className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{player.name}</p>
                    <p className="text-sm text-gray-500">Team {team}</p>
                  </div>
                  <span className={`btn-pill ${team === 'A' ? 'team-a' : 'team-b'} pointer-events-none`}>
                    Team {team}
                  </span>
                </div>
                <input
                  type="number"
                  min={0}
                  value={saves[player.id] ?? 0}
                  onChange={(e) => updateSaves(player.id, parseInt(e.target.value || '0', 10))}
                  className="field-input"
                  placeholder="0"
                />
              </div>
            );
          })}
          {saveEligiblePlayers.length === 0 && (
            <p className="text-sm text-gray-500 italic text-center py-6 col-span-full">
              No players assigned to this match yet.
            </p>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
