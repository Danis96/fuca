import { Award, Flame, Sparkles, TrendingUp } from 'lucide-react';
import { MatchRecap } from '../../types';

interface MatchRecapCardProps {
  recap: MatchRecap;
  compact?: boolean;
  title?: string;
  subtitle?: string;
}

export function MatchRecapCard({
  recap,
  compact = false,
  title = 'Post-match recap',
  subtitle = 'Automatically generated from the recorded result.',
}: MatchRecapCardProps) {
  const visiblePerformers = compact ? recap.topPerformers.slice(0, 2) : recap.topPerformers;
  const visibleAwards = compact ? recap.awardWinners.slice(0, 2) : recap.awardWinners;
  const visibleStreaks = compact ? recap.standoutStreaks.slice(0, 2) : recap.standoutStreaks;

  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-[linear-gradient(145deg,rgba(16,185,129,0.10),rgba(15,23,42,0.86))] p-5 shadow-[0_24px_70px_-38px_rgba(16,185,129,0.65)]">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="pill mb-3 border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
            <Sparkles className="w-3 h-3" />
            Match story
          </div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <p className="text-sm text-emerald-100/65">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
          <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-200/60 mb-1">Scoreline</p>
          <p className="text-sm font-semibold text-white">{recap.scoreline}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-200/60 mb-2">Headline</p>
        <p className="text-lg font-semibold text-white">{recap.headline}</p>
        <p className="mt-2 text-sm text-emerald-50/85">{recap.summary}</p>
        <p className="mt-3 text-sm text-emerald-100/70">{recap.turningPoint}</p>
      </div>

      <div className={`mt-4 grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-3'}`}>
        <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-300" />
            <h4 className="text-sm font-semibold text-white">Top performers</h4>
          </div>
          <div className="space-y-3">
            {visiblePerformers.map((performer) => (
              <div key={`${performer.playerId}-${performer.playerName}`} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                <p className="text-sm font-medium text-white">{performer.playerName}</p>
                <p className="text-xs text-emerald-100/70">{performer.statLine}</p>
              </div>
            ))}
            {visiblePerformers.length === 0 && (
              <p className="text-sm text-emerald-100/60">No standout individual stat line was logged for this one.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-emerald-300" />
            <h4 className="text-sm font-semibold text-white">Award winners</h4>
          </div>
          <div className="space-y-3">
            {visibleAwards.map((award) => (
              <div key={award.key} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                <p className="text-sm font-medium text-white">{award.title}</p>
                <p className="text-xs text-emerald-100/70">{award.winnerName}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-emerald-300" />
            <h4 className="text-sm font-semibold text-white">Standout streaks</h4>
          </div>
          <div className="space-y-3">
            {visibleStreaks.map((streak) => (
              <div key={`${streak.playerId}-${streak.label}`} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                <p className="text-sm font-medium text-white">{streak.label}</p>
                <p className="text-xs text-emerald-100/70">{streak.text}</p>
              </div>
            ))}
            {visibleStreaks.length === 0 && (
              <p className="text-sm text-emerald-100/60">No major streak changed shape after this result.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
