import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Hotel as HotelIcon, ShoppingBag, Gift, Trash2, Check } from "lucide-react";
import { listRewards } from "@/server-fns/places.functions";
import {
  addRedemption,
  getRedemptions,
  getPointsBreakdown,
  resetLocalState,
  type LocalRedemption,
} from "@/lib/local-state";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Reward = Database["public"]["Tables"]["rewards"]["Row"] & {
  partners: Database["public"]["Tables"]["partners"]["Row"] | null;
};

export const Route = createFileRoute("/rewards")({
  loader: () => listRewards(),
  component: RewardsPage,
  head: () => ({
    meta: [{ title: "แลกของรางวัล — TripChan Rewards" }],
  }),
});

function RewardsPage() {
  const rewardsData = Route.useLoaderData() as Reward[];
  const { t, lang } = useI18n();
  const [breakdown, setBreakdown] = useState(getPointsBreakdown());
  const [redemptions, setRedemptions] = useState<LocalRedemption[]>([]);
  const [filter, setFilter] = useState<"all" | "hotel" | "shop">("all");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      setBreakdown(getPointsBreakdown());
      setRedemptions(getRedemptions().slice().reverse());
    };
    refresh();
    window.addEventListener("tripchan-state-changed", refresh);
    return () => window.removeEventListener("tripchan-state-changed", refresh);
  }, []);

  const filtered = rewardsData.filter((r) => {
    if (filter === "all") return true;
    return r.partners?.type === filter;
  });

  const redeem = (reward: Reward) => {
    if (!reward.partners) return;
    if (breakdown.balance < reward.point_cost) {
      setToast(t("notEnoughPoints"));
      setTimeout(() => setToast(null), 2500);
      return;
    }
    const result = addRedemption({
      rewardId: reward.id,
      partnerId: reward.partner_id,
      rewardTitleTh: reward.title_th,
      rewardTitleEn: reward.title_en,
      partnerNameTh: reward.partners.name_th,
      partnerNameEn: reward.partners.name_en,
      pointsUsed: reward.point_cost,
    });
    if (result.success && result.redemption) {
      setToast(`✅ ${t("redemptionCode")}: ${result.redemption.code}`);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleReset = () => {
    if (confirm(t("confirmReset"))) {
      resetLocalState();
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">{t("rewardsTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("rewardsSubtitle")}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">💡 {t("pocBadge")}</p>
        </div>
      </div>

      {/* Points breakdown card */}
      <div className="mt-5 overflow-hidden rounded-3xl bg-gradient-hero p-5 text-white shadow-elevated md:p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/80">
          <Sparkles className="h-3.5 w-3.5" />
          {t("myPoints")}
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-5xl font-bold">{breakdown.balance.toLocaleString()}</span>
          <span className="text-sm text-white/80">{t("pointsLabel")}</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
          <Stat label={t("fromCheckIns")} value={`+${breakdown.fromCheckIns}`} sub={`${breakdown.checkInCount}×`} />
          <Stat label={t("fromReviews")} value={`+${breakdown.fromReviews}`} sub={`${breakdown.reviewCount}×`} />
          <Stat label={t("spentOnRewards")} value={`-${breakdown.spent}`} sub={`${breakdown.redemptionCount}×`} />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mt-6 flex gap-2">
        {(
          [
            { key: "all", label: t("all"), Icon: Gift },
            { key: "hotel", label: t("partnerHotels"), Icon: HotelIcon },
            { key: "shop", label: t("partnerShops"), Icon: ShoppingBag },
          ] as const
        ).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              filter === key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-secondary",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Rewards list */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => {
          const partnerName = r.partners
            ? lang === "th"
              ? r.partners.name_th
              : r.partners.name_en
            : "—";
          const title = lang === "th" ? r.title_th : r.title_en;
          const desc = lang === "th" ? r.description_th : r.description_en;
          const canAfford = breakdown.balance >= r.point_cost;
          return (
            <div
              key={r.id}
              className="flex flex-col rounded-2xl border border-border bg-gradient-card p-4 shadow-soft"
            >
              <div className="flex items-center gap-2">
                {r.partners?.type === "hotel" ? (
                  <HotelIcon className="h-4 w-4 text-primary" />
                ) : (
                  <ShoppingBag className="h-4 w-4 text-primary" />
                )}
                <span className="text-[11px] font-medium text-muted-foreground">{partnerName}</span>
              </div>
              <h3 className="mt-1 font-display text-base font-semibold leading-tight">{title}</h3>
              {desc && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{desc}</p>}
              <div className="mt-auto flex items-center justify-between pt-3">
                <div className="inline-flex items-center gap-1 rounded-full bg-fruit/15 px-2 py-1 text-xs font-bold text-fruit">
                  <Sparkles className="h-3 w-3" />
                  {r.point_cost.toLocaleString()} {t("pointsLabel")}
                </div>
                <button
                  onClick={() => redeem(r)}
                  disabled={!canAfford}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
                    canAfford
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "cursor-not-allowed bg-muted text-muted-foreground",
                  )}
                >
                  {t("redeem")}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* My redemptions */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{t("myRedemptions")}</h2>
          {redemptions.length > 0 && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" /> {t("resetData")}
            </button>
          )}
        </div>
        {redemptions.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            {t("noRedemptions")}
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {redemptions.map((red) => (
              <div
                key={red.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-3 shadow-soft"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span className="font-medium">{lang === "th" ? red.rewardTitleTh : red.rewardTitleEn}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    @ {lang === "th" ? red.partnerNameTh : red.partnerNameEn}
                  </p>
                </div>
                <div className="text-right">
                  <div className="rounded-md bg-secondary px-2 py-1 font-mono text-xs font-bold">
                    {red.code}
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">−{red.pointsUsed} {t("pointsLabel")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="h-12" />

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background shadow-elevated md:bottom-8 animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
      <div className="text-[10px] uppercase tracking-wide text-white/70">{label}</div>
      <div className="mt-0.5 font-display text-xl font-bold">{value}</div>
      <div className="text-[10px] text-white/70">{sub}</div>
    </div>
  );
}
