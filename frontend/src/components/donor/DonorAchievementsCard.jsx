import { Award, Heart, Medal, Sparkles, CheckCircle2, Lock, ShieldCheck } from 'lucide-react';
import Card from '../ui/Card';
import { BADGE_DEFINITIONS } from '../../utils/achievements';

const BADGE_ICONS = {
  first_lifesaver: Heart,
  bronze_donor: Award,
  silver_donor: Medal,
  gold_donor: Sparkles,
};

export default function DonorAchievementsCard({ achievements, className = '' }) {
  const total_verified_donations = achievements?.total_verified_donations ?? 0;
  const earned_badges = achievements?.earned_badges ?? [];
  const all_badges = achievements?.all_badges?.length > 0
    ? achievements.all_badges
    : BADGE_DEFINITIONS.map(b => ({ ...b, is_earned: false, progress_count: 0 }));
  const highest_badge = achievements?.highest_badge ?? null;
  const next_milestone = achievements?.next_milestone ?? null;

  return (
    <Card className={`p-6 border-surface-200 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-surface-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center shrink-0 shadow-xs">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
              Donor Recognition & Achievements
              {highest_badge && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-800">
                  {highest_badge.name}
                </span>
              )}
            </h2>
            <p className="text-xs text-surface-500 mt-0.5">
              Honoring distinct admin-verified lifesaving contributions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-surface-100 text-surface-700">
            {total_verified_donations} Verified Donation{total_verified_donations === 1 ? '' : 's'}
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            {earned_badges.length} of {all_badges.length} Badges Unlocked
          </span>
        </div>
      </div>

      {/* Medical Disclaimer */}
      <div className="flex items-start gap-2 my-4 px-3 py-2 bg-surface-50 rounded-lg border border-surface-200 text-xs text-surface-600">
        <ShieldCheck className="w-4 h-4 text-surface-400 shrink-0 mt-0.5" />
        <p>
          <span className="font-semibold text-surface-700">Medical Notice: </span>
          Recognition badges celebrate verified voluntary donations and do not alter clinical triage, medical suitability, or eligibility at donation time.
        </p>
      </div>

      {/* Milestone Progress Bar or Completion Banner */}
      {next_milestone ? (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary-50/70 to-surface-50 border border-primary-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1.5 mb-2">
            <div className="font-semibold text-surface-800 flex items-center gap-1.5">
              <span>Next Milestone:</span>
              <span className="text-primary-700 font-bold">{next_milestone.badge_name}</span>
            </div>
            <div className="text-surface-500">
              <span className="font-bold text-surface-900">{next_milestone.current_count}</span> of{' '}
              <span className="font-bold text-surface-900">{next_milestone.target_count}</span> donations verified
              ({next_milestone.progress_percentage}%)
            </div>
          </div>
          <div className="w-full bg-surface-200/80 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-primary-600 h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${next_milestone.progress_percentage}%` }}
            />
          </div>
          <p className="text-[11px] text-surface-500 mt-2">
            {next_milestone.remaining_count} more verified donation{next_milestone.remaining_count > 1 ? 's' : ''} needed to unlock {next_milestone.badge_name}.
          </p>
        </div>
      ) : total_verified_donations >= 10 ? (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-yellow-300 text-xs">
          <div className="flex items-center gap-2 font-bold text-yellow-900">
            <Sparkles className="w-4 h-4 text-amber-600" />
            Distinguished Lifesaver — All Milestone Badges Achieved!
          </div>
          <p className="text-yellow-800 mt-1">
            You have attained the Gold Donor milestone. Thank you for your exceptional, ongoing dedication to saving lives.
          </p>
        </div>
      ) : null}

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(all_badges.length > 0 ? all_badges : BADGE_DEFINITIONS).map((badge) => {
          const isEarned = Boolean(badge.is_earned);
          const Icon = BADGE_ICONS[badge.id] || Award;
          const styles = badge.colorClasses?.[isEarned ? 'earned' : 'locked'] || {
            border: isEarned ? 'border-primary-200' : 'border-surface-200',
            bg: isEarned ? 'bg-primary-50/50' : 'bg-surface-50/50',
            badgeBg: isEarned ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-100 text-surface-500',
            iconBg: isEarned ? 'bg-primary-600 text-white' : 'bg-surface-200 text-surface-400',
            text: isEarned ? 'text-surface-900' : 'text-surface-600',
          };

          return (
            <div
              key={badge.id}
              className={`flex flex-col p-4 rounded-xl border transition-all ${styles.border} ${styles.bg}`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${styles.iconBg}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {isEarned ? (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${styles.badgeBg}`}>
                    <CheckCircle2 className="w-3 h-3" />
                    Unlocked
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${styles.badgeBg}`}>
                    <Lock className="w-3 h-3" />
                    {badge.threshold} Needed
                  </span>
                )}
              </div>

              <h3 className={`text-sm font-bold ${styles.text}`}>
                {badge.name}
              </h3>
              <p className="text-xs text-surface-500 mt-1 flex-1">
                {badge.description}
              </p>

              <div className="pt-3 mt-3 border-t border-surface-200/60 flex items-center justify-between text-[11px] text-surface-500">
                <span>Milestone:</span>
                <span className="font-semibold text-surface-700">
                  {badge.threshold} verified donation{badge.threshold > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Zero verified donations empty state hint */}
      {total_verified_donations === 0 && (
        <div className="mt-5 text-center p-4 rounded-xl bg-surface-50/60 border border-surface-200 text-xs text-surface-500">
          <p>
            You have not earned any badges yet. Once your first blood donation is verified by hospital or blood bank staff, your <strong className="text-surface-700">First Lifesaver</strong> badge and official certificate will be unlocked automatically.
          </p>
        </div>
      )}
    </Card>
  );
}
