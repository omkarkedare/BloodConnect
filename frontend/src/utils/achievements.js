/**
 * Donor Recognition Badges & Milestone Achievements Utility.
 * Calculates achievements strictly from distinct admin-verified successful blood donations.
 */

export const BADGE_DEFINITIONS = [
  {
    id: 'first_lifesaver',
    name: 'First Lifesaver',
    threshold: 1,
    tier: 'emerald',
    description: 'Completed your 1st verified blood donation, saving lives.',
    colorClasses: {
      earned: {
        border: 'border-emerald-300',
        bg: 'bg-emerald-50/70',
        badgeBg: 'bg-emerald-100 text-emerald-800',
        iconBg: 'bg-emerald-600 text-white',
        text: 'text-emerald-950',
      },
      locked: {
        border: 'border-surface-200',
        bg: 'bg-surface-50/50',
        badgeBg: 'bg-surface-100 text-surface-500',
        iconBg: 'bg-surface-200 text-surface-400',
        text: 'text-surface-700',
      },
    },
  },
  {
    id: 'bronze_donor',
    name: 'Bronze Donor',
    threshold: 3,
    tier: 'bronze',
    description: 'Completed 3 verified blood donations.',
    colorClasses: {
      earned: {
        border: 'border-amber-300',
        bg: 'bg-amber-50/70',
        badgeBg: 'bg-amber-100 text-amber-800',
        iconBg: 'bg-amber-600 text-white',
        text: 'text-amber-950',
      },
      locked: {
        border: 'border-surface-200',
        bg: 'bg-surface-50/50',
        badgeBg: 'bg-surface-100 text-surface-500',
        iconBg: 'bg-surface-200 text-surface-400',
        text: 'text-surface-700',
      },
    },
  },
  {
    id: 'silver_donor',
    name: 'Silver Donor',
    threshold: 5,
    tier: 'silver',
    description: 'Completed 5 verified blood donations.',
    colorClasses: {
      earned: {
        border: 'border-slate-300',
        bg: 'bg-slate-50/80',
        badgeBg: 'bg-slate-200 text-slate-800',
        iconBg: 'bg-slate-600 text-white',
        text: 'text-slate-950',
      },
      locked: {
        border: 'border-surface-200',
        bg: 'bg-surface-50/50',
        badgeBg: 'bg-surface-100 text-surface-500',
        iconBg: 'bg-surface-200 text-surface-400',
        text: 'text-surface-700',
      },
    },
  },
  {
    id: 'gold_donor',
    name: 'Gold Donor',
    threshold: 10,
    tier: 'gold',
    description: 'Completed 10 verified blood donations — distinguished lifesaver.',
    colorClasses: {
      earned: {
        border: 'border-yellow-400',
        bg: 'bg-gradient-to-br from-yellow-50/90 to-amber-50/60',
        badgeBg: 'bg-yellow-100 text-yellow-900 border border-yellow-300',
        iconBg: 'bg-amber-500 text-white',
        text: 'text-amber-950',
      },
      locked: {
        border: 'border-surface-200',
        bg: 'bg-surface-50/50',
        badgeBg: 'bg-surface-100 text-surface-500',
        iconBg: 'bg-surface-200 text-surface-400',
        text: 'text-surface-700',
      },
    },
  },
];

/**
 * Filter donations to distinct admin-verified records.
 * Deduplicates multiple records referencing the same blood request,
 * while preserving legitimate donations sharing the same date and hospital.
 */
export function getDistinctVerifiedDonations(donations = []) {
  if (!Array.isArray(donations)) return [];

  const verified = donations.filter((d) => {
    const status = (d?.status?.value || d?.status || '').toLowerCase();
    return status === 'verified';
  });

  const distinct = [];
  const seenRequestIds = new Set();

  for (const d of verified) {
    if (d.request_id != null) {
      if (seenRequestIds.has(d.request_id)) continue;
      seenRequestIds.add(d.request_id);
      distinct.push(d);
    } else {
      distinct.push(d);
    }
  }

  return distinct;
}

/**
 * Compute badges, earned status, highest achievement, and next milestone.
 */
export function calculateDonorAchievements(donations = []) {
  const verifiedList = getDistinctVerifiedDonations(donations);
  const totalCount = verifiedList.length;

  const earnedBadges = [];
  const allBadges = [];
  let highestBadge = null;
  let nextMilestone = null;

  for (const cfg of BADGE_DEFINITIONS) {
    const isEarned = totalCount >= cfg.threshold;
    const badgeItem = {
      ...cfg,
      is_earned: isEarned,
      progress_count: Math.min(totalCount, cfg.threshold),
    };

    allBadges.push(badgeItem);
    if (isEarned) {
      earnedBadges.push(badgeItem);
      highestBadge = badgeItem;
    }
  }

  for (const cfg of BADGE_DEFINITIONS) {
    if (totalCount < cfg.threshold) {
      const remaining = cfg.threshold - totalCount;
      const pct = Math.min(100, Math.max(0, Math.round((totalCount / cfg.threshold) * 100)));
      nextMilestone = {
        badge_id: cfg.id,
        badge_name: cfg.name,
        target_count: cfg.threshold,
        current_count: totalCount,
        remaining_count: remaining,
        progress_percentage: pct,
      };
      break;
    }
  }

  return {
    total_verified_donations: totalCount,
    earned_badges: earnedBadges,
    all_badges: allBadges,
    highest_badge: highestBadge,
    next_milestone: nextMilestone,
  };
}
