import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Search } from "lucide-react";
import { listPlaces } from "@/server/places.functions";
import { useI18n, categoryLabel } from "@/lib/i18n";
import { PlaceCard } from "@/components/PlaceCard";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Place = Database["public"]["Tables"]["places"]["Row"];

const searchSchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/places")({
  validateSearch: searchSchema,
  loader: () => listPlaces(),
  component: PlacesPage,
  head: () => ({
    meta: [
      { title: "สถานที่ท่องเที่ยวจันทบุรี — Places in Chanthaburi" },
      {
        name: "description",
        content: "Browse all curated travel spots in Chanthaburi: beaches, waterfalls, temples and more.",
      },
    ],
  }),
});

const CATS = ["all", "beach", "nature", "history", "temple", "cafe", "market", "fruit", "viewpoint", "attraction"] as const;

function PlacesPage() {
  const places = Route.useLoaderData() as Place[];
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { t, lang } = useI18n();
  const [q, setQ] = useState(search.q ?? "");

  const cat = search.category ?? "all";

  const filtered = useMemo(() => {
    return places.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (q) {
        const needle = q.toLowerCase();
        const hay = `${p.name_th} ${p.name_en} ${p.description_th} ${p.description_en} ${p.district ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [places, cat, q]);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4">
      <h1 className="font-display text-2xl font-bold md:text-3xl">{t("allPlaces")}</h1>

      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5 shadow-soft">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search")}
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      <div className="mt-4 -mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 pb-2">
          {CATS.map((c) => {
            const active = (c === "all" && !search.category) || c === cat;
            return (
              <button
                key={c}
                onClick={() =>
                  navigate({
                    search: (s) => ({ ...s, category: c === "all" ? undefined : c }),
                  })
                }
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-secondary",
                )}
              >
                {c === "all" ? t("all") : categoryLabel(c, lang)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {filtered.map((p) => (
          <PlaceCard key={p.id} place={p} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-12 text-center text-sm text-muted-foreground">{t("noResults")}</p>
      )}
      <div className="h-10" />
    </div>
  );
}
