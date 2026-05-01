import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, MessageSquare, ArrowRight } from "lucide-react";
import { listPlaces } from "@/server/places.functions";
import { useI18n, categoryLabel } from "@/lib/i18n";
import { PlaceCard } from "@/components/PlaceCard";
import type { Database } from "@/integrations/supabase/types";

type Place = Database["public"]["Tables"]["places"]["Row"];

export const Route = createFileRoute("/")({
  loader: () => listPlaces(),
  component: Index,
  head: () => ({
    meta: [
      { title: "เที่ยวจันท์ — TripChan: AI guide to Chanthaburi" },
      {
        name: "description",
        content:
          "ค้นพบสถานที่ท่องเที่ยวจังหวัดจันทบุรี — ทะเล ภูเขา น้ำตก คาเฟ่ ตลาด ให้ AI ช่วยวางแผนเที่ยวให้คุณ",
      },
    ],
  }),
});

const CATS = ["beach", "nature", "history", "temple", "cafe", "market", "fruit"] as const;

function Index() {
  const places = Route.useLoaderData() as Place[];
  const { t, lang } = useI18n();
  const [_, force] = useState(0);
  useEffect(() => force((n) => n + 1), [lang]);

  const featured = places.filter((p) => p.featured).slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-hero p-6 text-white shadow-elevated md:p-12">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1600')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            mixBlendMode: "overlay",
          }}
        />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> AI travel guide
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight md:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-3 max-w-lg text-white/90 md:text-lg">{t("heroSubtitle")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/chat"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow-soft transition-transform hover:-translate-y-0.5"
            >
              <MessageSquare className="h-4 w-4" /> {t("ctaChat")}
            </Link>
            <Link
              to="/planner"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <Sparkles className="h-4 w-4" /> {t("ctaPlanner")}
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mt-10">
        <h2 className="mb-4 font-display text-xl font-semibold">{t("browseByCategory")}</h2>
        <div className="grid grid-cols-3 gap-2.5 md:grid-cols-7">
          {CATS.map((c) => (
            <Link
              key={c}
              to="/places"
              search={{ category: c }}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-gradient-card p-4 text-center shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <span className="text-2xl">{catEmoji(c)}</span>
              <span className="text-xs font-medium">{categoryLabel(c, lang)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Top picks */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{t("topPicks")}</h2>
          <Link to="/places" className="inline-flex items-center gap-1 text-sm text-primary">
            {t("allPlaces")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {featured.map((p) => (
            <PlaceCard key={p.id} place={p} />
          ))}
        </div>
      </section>

      <footer className="mt-16 mb-10 text-center text-xs text-muted-foreground">
        {t("appName")} · {t("tagline")}
      </footer>
    </div>
  );
}

function catEmoji(cat: string): string {
  switch (cat) {
    case "beach":
      return "🏖️";
    case "nature":
      return "🏞️";
    case "history":
      return "🏛️";
    case "temple":
      return "⛩️";
    case "cafe":
      return "☕";
    case "market":
      return "🛍️";
    case "fruit":
      return "🍇";
    default:
      return "📍";
  }
}
