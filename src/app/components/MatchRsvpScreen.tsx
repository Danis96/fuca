import { motion } from 'motion/react';
import { Calendar, Clock, MapPin, CheckCircle2, HelpCircle, XCircle, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { MatchRsvpStatus } from '../../types';

interface MatchRsvpScreenProps {
  matchId: string;
  onBack: () => void;
}

export function MatchRsvpScreen({ matchId, onBack }: MatchRsvpScreenProps) {
  const { matches, updateMatch } = useData();
  const { userProfile } = useAuth();
  const match = matches.find((entry) => entry.id === matchId);
  const playerId = userProfile?.playerId ?? null;

  if (!match) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition">
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <div className="panel p-8 text-center">
          <p className="text-xl font-bold mb-2">Match not found</p>
          <p className="text-gray-500">This RSVP link is invalid or the match was removed.</p>
        </div>
      </div>
    );
  }

  if (match.status !== 'scheduled') {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition">
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <div className="panel p-8 text-center">
          <p className="text-xl font-bold mb-2">RSVP is closed</p>
          <p className="text-gray-500">This match is no longer accepting RSVPs.</p>
        </div>
      </div>
    );
  }

  if (!playerId) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition">
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <div className="panel p-8 text-center">
          <p className="text-xl font-bold mb-2">Use a player account</p>
          <p className="text-gray-500">Sign in as a player to RSVP from this shared link.</p>
        </div>
      </div>
    );
  }

  const existingRsvp = match.rsvps?.find((entry) => entry.playerId === playerId);
  const counts = {
    in: match.rsvps?.filter((entry) => entry.status === 'in').length ?? 0,
    maybe: match.rsvps?.filter((entry) => entry.status === 'maybe').length ?? 0,
    out: match.rsvps?.filter((entry) => entry.status === 'out').length ?? 0,
  };

  const saveRsvp = async (status: MatchRsvpStatus) => {
    const nextRsvps = [
      ...(match.rsvps?.filter((entry) => entry.playerId !== playerId) ?? []),
      {
        playerId,
        status,
        respondedAt: new Date(),
      },
    ];

    try {
      await updateMatch(match.id, { rsvps: nextRsvps });
      toast.success(
        status === 'in'
          ? 'You are on the list'
          : status === 'maybe'
          ? 'Marked as maybe'
          : 'Marked as unavailable'
      );
    } catch (error) {
      console.error(error);
      toast.error('Failed to save RSVP');
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition">
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      <div className="panel p-8">
        <div className="pill mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Match RSVP
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Can you play?</h1>
        <p className="text-gray-500 mb-8">Respond to lock yourself into the team selection pool.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <MetaCell icon={Calendar} label="Date" value={format(match.date, 'EEE, MMM dd')} />
          <MetaCell icon={Clock} label="Time" value={match.time} />
          <MetaCell icon={MapPin} label="Location" value={match.location} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <RsvpButton
            label="I'm in"
            subtitle="Add me to the game list"
            icon={CheckCircle2}
            active={existingRsvp?.status === 'in'}
            accent="emerald"
            onClick={() => saveRsvp('in')}
          />
          <RsvpButton
            label="Maybe"
            subtitle="Count me as unsure"
            icon={HelpCircle}
            active={existingRsvp?.status === 'maybe'}
            accent="amber"
            onClick={() => saveRsvp('maybe')}
          />
          <RsvpButton
            label="Out"
            subtitle="Don't include me"
            icon={XCircle}
            active={existingRsvp?.status === 'out'}
            accent="rose"
            onClick={() => saveRsvp('out')}
          />
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold">Current Count</h2>
            <span className="text-sm text-gray-500">
              {existingRsvp ? `You replied: ${existingRsvp.status}` : 'No reply yet'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <CountCard label="In" value={counts.in} accent="text-emerald-400" />
            <CountCard label="Maybe" value={counts.maybe} accent="text-amber-300" />
            <CountCard label="Out" value={counts.out} accent="text-rose-300" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaCell({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function RsvpButton({
  label,
  subtitle,
  icon: Icon,
  active,
  accent,
  onClick,
}: {
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  accent: 'emerald' | 'amber' | 'rose';
  onClick: () => void;
}) {
  const accentClasses = {
    emerald: active ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-white/5 hover:border-emerald-500/25',
    amber: active ? 'border-amber-500/40 bg-amber-500/10 text-amber-100' : 'border-white/5 hover:border-amber-500/25',
    rose: active ? 'border-rose-500/40 bg-rose-500/10 text-rose-100' : 'border-white/5 hover:border-rose-500/25',
  };

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      className={`rounded-2xl border p-5 text-left transition ${accentClasses[accent]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold mb-1">{label}</p>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        <Icon className="w-6 h-6" />
      </div>
    </motion.button>
  );
}

function CountCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-4 text-center">
      <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">{label}</p>
      <p className={`text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
