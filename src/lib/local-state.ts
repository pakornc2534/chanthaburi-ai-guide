// Local POC state for check-ins, reviews, and reward redemptions.
// Single source of truth in localStorage; points are derived from event log.
// Points formula: +10 per check-in, +25 per review, minus redemption.point_cost
// All hooks dispatch a single 'tripchan-state-changed' event for cross-component sync.

const KEYS = {
  checkIns: "tripchan.checkins",
  reviews: "tripchan.reviews",
  redemptions: "tripchan.redemptions",
} as const;

const POINTS_PER_CHECKIN = 10;
const POINTS_PER_REVIEW = 25;

export const POINTS = { perCheckIn: POINTS_PER_CHECKIN, perReview: POINTS_PER_REVIEW };

export type LocalCheckIn = {
  placeId: string;
  createdAt: string;
};

export type LocalReview = {
  placeId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
};

export type LocalRedemption = {
  id: string;
  rewardId: string;
  partnerId: string;
  rewardTitleTh: string;
  rewardTitleEn: string;
  partnerNameTh: string;
  partnerNameEn: string;
  pointsUsed: number;
  code: string;
  createdAt: string;
  used: boolean;
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tripchan-state-changed"));
  }
}

// === CHECK-INS ===
export function getCheckIns(): LocalCheckIn[] {
  if (typeof window === "undefined") return [];
  return safeParse<LocalCheckIn[]>(localStorage.getItem(KEYS.checkIns), []);
}

export function hasCheckedInToday(placeId: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return getCheckIns().some((c) => c.placeId === placeId && c.createdAt.slice(0, 10) === today);
}

export function addCheckIn(placeId: string): { success: boolean; pointsEarned: number } {
  if (hasCheckedInToday(placeId)) {
    return { success: false, pointsEarned: 0 };
  }
  const cur = getCheckIns();
  const next = [...cur, { placeId, createdAt: new Date().toISOString() }];
  localStorage.setItem(KEYS.checkIns, JSON.stringify(next));
  emit();
  return { success: true, pointsEarned: POINTS_PER_CHECKIN };
}

// === REVIEWS ===
export function getReviews(): LocalReview[] {
  if (typeof window === "undefined") return [];
  return safeParse<LocalReview[]>(localStorage.getItem(KEYS.reviews), []);
}

export function getReviewForPlace(placeId: string): LocalReview | null {
  return getReviews().find((r) => r.placeId === placeId) ?? null;
}

export function upsertReview(
  placeId: string,
  rating: number,
  comment: string,
): { isNew: boolean; pointsEarned: number } {
  const all = getReviews();
  const existingIdx = all.findIndex((r) => r.placeId === placeId);
  const isNew = existingIdx < 0;
  const review: LocalReview = {
    placeId,
    rating: Math.max(1, Math.min(5, Math.round(rating))),
    comment: comment.trim(),
    createdAt: isNew ? new Date().toISOString() : all[existingIdx].createdAt,
  };
  const next = isNew ? [...all, review] : all.map((r, i) => (i === existingIdx ? review : r));
  localStorage.setItem(KEYS.reviews, JSON.stringify(next));
  emit();
  return { isNew, pointsEarned: isNew ? POINTS_PER_REVIEW : 0 };
}

// === REDEMPTIONS ===
export function getRedemptions(): LocalRedemption[] {
  if (typeof window === "undefined") return [];
  return safeParse<LocalRedemption[]>(localStorage.getItem(KEYS.redemptions), []);
}

export function addRedemption(
  redemption: Omit<LocalRedemption, "id" | "code" | "createdAt" | "used">,
): { success: boolean; redemption?: LocalRedemption; reason?: string } {
  const balance = getPointsBalance();
  if (balance < redemption.pointsUsed) {
    return { success: false, reason: "not_enough_points" };
  }
  const r: LocalRedemption = {
    ...redemption,
    id: crypto.randomUUID(),
    code: generateCode(),
    createdAt: new Date().toISOString(),
    used: false,
  };
  const next = [...getRedemptions(), r];
  localStorage.setItem(KEYS.redemptions, JSON.stringify(next));
  emit();
  return { success: true, redemption: r };
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

// === POINTS (derived from event log) ===
export function getPointsBalance(): number {
  const earned =
    getCheckIns().length * POINTS_PER_CHECKIN + getReviews().length * POINTS_PER_REVIEW;
  const spent = getRedemptions().reduce((sum, r) => sum + r.pointsUsed, 0);
  return earned - spent;
}

export function getPointsBreakdown() {
  return {
    fromCheckIns: getCheckIns().length * POINTS_PER_CHECKIN,
    fromReviews: getReviews().length * POINTS_PER_REVIEW,
    spent: getRedemptions().reduce((sum, r) => sum + r.pointsUsed, 0),
    balance: getPointsBalance(),
    checkInCount: getCheckIns().length,
    reviewCount: getReviews().length,
    redemptionCount: getRedemptions().length,
  };
}

// === Reset (for QA/testing) ===
export function resetLocalState() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEYS.checkIns);
  localStorage.removeItem(KEYS.reviews);
  localStorage.removeItem(KEYS.redemptions);
  emit();
}
