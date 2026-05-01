import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Save, Share2, Loader2 } from "lucide-react";
import { generateTripPlan } from "@/server/ai.functions";
import { saveTrip, listPlaces } from "@/server/places.functions";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Place = Database["public"]["Tables"]["places"]["Row"];

type PlanItem = { time: "morning" | "noon" | "afternoon" | "evening"; placeId: string; activity: string; tip: string };
type PlanDay = { day: number; theme: string; items: PlanItem[] };
type Plan = { title: string; summary: string; days: PlanDay[] };

export const Route = createFileRoute("/planner")({
  loader: () => listPlaces(),
  component: PlannerPage,
  head: () => ({
    meta: [
      { title: "วางแผนเที่ยวจันทบุรี — Trip planner" },
      { name: "description", content: "AI-powered trip planner for Chanthaburi." },
    ],
  }),
});

const INTERESTS = ["beach", "nature", "history", "temple", "cafe", "market", "fruit"] as const;

function PlannerPage() {
  const places = Route.useLoaderData() as Place[];
  const { t, lang } = useI18n();
  const generateFn = useServerFn(generateTripPlan);
  const saveFn = useServerFn(saveTrip);

  const [days, setDays] = useState(2);
  const [budget, setBudget] = useState<"low" | "mid" | "high">("mid");
  const [travelStyle, setTravelStyle] = useState<"family" | "couple" | "friends" | "solo">("couple");
  const [interests, setInterests] = useState<string[]>(["beach", "nature"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [params, setParams] = useState<unknown>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const placeMap = new Map(places.map((p) => [p.id, p]));

  async function generate() {
    setLoading(true);
    setError(null);
    setShareUrl(null);
    try {
      const result = await generateFn({
        data: { days, budget, interests, travelStyle, lang },
      });
      setPlan(result.plan as Plan);
      setParams(result.params);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("RATE_LIMIT")) setError(t("errorRateLimit"));
      else if (msg.includes("PAYMENT_REQUIRED")) setError(t("errorPayment"));
      else setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  async function share() {
    if (!plan || !params) return;
    try {
      const r = await saveFn({ data: { title: plan.title, params, plan } });
      const url = `${window.location.origin}/trip/${r.share_id}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url).catch(() => undefined);
    } catch (e) {
      console.error(e);
      setError(t("errorGeneric"));
    }
  }

  const toggleInterest = (i: string) =>
    setInterests((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));

  return (
    <div className="mx-auto max-w-4xl px-4 pt-4">
      <h1 className="font-display text-2xl font-bold md:text-3xl">{t("plannerTitle")}</h1>

      <div className="mt-5 space-y-5 rounded-3xl border border-border bg-gradient-card p-5 shadow-soft md:p-6">
        {/* Days */}
        <Field label={t("days")}>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  "h-10 w-10 rounded-xl border text-sm font-medium",
                  days === d
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card",
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </Field>

        {/* Budget */}
        <Field label={t("budget")}>
          <div className="flex flex-wrap gap-2">
            {(["low", "mid", "high"] as const).map((b) => (
              <Pill key={b} active={budget === b} onClick={() => setBudget(b)}>
                {b === "low" ? t("budgetLow") : b === "mid" ? t("budgetMid") : t("budgetHigh")}
              </Pill>
            ))}
          </div>
        </Field>

        {/* Travel style */}
        <Field label={t("travelStyle")}>
          <div className="flex flex-wrap gap-2">
            {(["family", "couple", "friends", "solo"] as const).map((s) => (
              <Pill key={s} active={travelStyle === s} onClick={() => setTravelStyle(s)}>
                {t(s)}
              </Pill>
            ))}
          </div>
        </Field>

        {/* Interests */}
        <Field label={t("interests")}>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <Pill
                key={i}
                active={interests.includes(i)}
                onClick={() => toggleInterest(i)}
              >
                {t(i as never)}
              </Pill>
            ))}
          </div>
        </Field>

        <button
          onClick={generate}
          disabled={loading}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-opacity",
            loading && "opacity-60",
          )}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? t("generating") : plan ? t("regenerate") : t("generatePlan")}
        </button>

        {error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>

      {plan && (
        <section className="mt-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold">{plan.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{plan.summary}</p>
            </div>
            <button
              onClick={share}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-secondary"
            >
              <Share2 className="h-4 w-4" /> {t("shareTrip")}
            </button>
          </div>

          {shareUrl && (
            <p className="mt-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
              {t("copied")} <span className="font-mono break-all">{shareUrl}</span>
            </p>
          )}

          <div className="mt-5 space-y-6">
            {plan.days.map((d) => (
              <div key={d.day} className="rounded-3xl border border-border bg-gradient-card p-5 shadow-soft">
                <div className="mb-4 flex items-baseline justify-between">
                  <h3 className="font-display text-lg font-semibold">
                    {t("day")} {d.day}
                  </h3>
                  <span className="text-xs text-muted-foreground">{d.theme}</span>
                </div>
                <ol className="space-y-3">
                  {d.items.map((it, i) => {
                    const p = placeMap.get(it.placeId);
                    return (
                      <li key={i} className="flex gap-3">
                        <div className="grid h-9 shrink-0 place-items-center rounded-xl bg-secondary px-2 text-[11px] font-semibold text-foreground">
                          {t(it.time)}
                        </div>
                        <div className="flex-1">
                          {p ? (
                            <Link
                              to="/places/$id"
                              params={{ id: p.id }}
                              className="font-medium hover:text-primary"
                            >
                              {lang === "th" ? p.name_th : p.name_en}
                            </Link>
                          ) : (
                            <span className="font-medium">{it.activity}</span>
                          )}
                          <p className="text-sm text-muted-foreground">{it.activity}</p>
                          {it.tip && (
                            <p className="mt-0.5 text-xs text-muted-foreground italic">💡 {it.tip}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="h-12" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}
