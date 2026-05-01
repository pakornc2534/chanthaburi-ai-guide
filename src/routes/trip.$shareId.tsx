import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getTripByShareId, listPlaces } from "@/server/places.functions";
import { useI18n } from "@/lib/i18n";
import type { Database } from "@/integrations/supabase/types";

type Place = Database["public"]["Tables"]["places"]["Row"];

type PlanItem = { time: "morning" | "noon" | "afternoon" | "evening"; placeId: string; activity: string; tip: string };
type PlanDay = { day: number; theme: string; items: PlanItem[] };
type Plan = { title: string; summary: string; days: PlanDay[] };

export const Route = createFileRoute("/trip/$shareId")({
  loader: async ({ params }) => {
    const [trip, places] = await Promise.all([
      getTripByShareId({ data: { shareId: params.shareId } }),
      listPlaces(),
    ]);
    if (!trip) throw notFound();
    return { trip, places: places as Place[] };
  },
  component: SharedTripPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-xl font-semibold">Trip not found</h1>
      <Link to="/" className="mt-4 inline-block text-primary">
        Home
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-xl font-semibold">Error</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${(loaderData.trip.plan as { title?: string }).title ?? "Trip"} — TripChan` },
          { name: "description", content: "Shared Chanthaburi trip plan" },
        ]
      : [],
  }),
});

function SharedTripPage() {
  const { trip, places } = Route.useLoaderData();
  const { t, lang } = useI18n();
  const plan = trip.plan as Plan;
  const placeMap = new Map<string, Place>(places.map((p: Place) => [p.id, p] as const));

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4">
      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">{t("publicPlan")}</span>
      <h1 className="mt-3 font-display text-2xl font-bold md:text-3xl">{plan.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{plan.summary}</p>

      <div className="mt-6 space-y-5">
        {plan.days.map((d) => (
          <div key={d.day} className="rounded-3xl border border-border bg-gradient-card p-5 shadow-soft">
            <div className="mb-3 flex items-baseline justify-between">
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
                    <div className="grid h-9 shrink-0 place-items-center rounded-xl bg-secondary px-2 text-[11px] font-semibold">
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
                        <p className="mt-0.5 text-xs italic text-muted-foreground">💡 {it.tip}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          to="/planner"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          ✨ {t("ctaPlanner")}
        </Link>
      </div>
      <div className="h-12" />
    </div>
  );
}
