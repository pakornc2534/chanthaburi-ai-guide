import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Clock, MapPin, Phone, Tag, Heart, Star } from "lucide-react";
import { getPlaceById, listPlaces } from "@/server-fns/places.functions";
import { useI18n, categoryLabel } from "@/lib/i18n";
import { PlaceCard } from "@/components/PlaceCard";
import { CheckInButton } from "@/components/CheckInButton";
import { ReviewForm } from "@/components/ReviewForm";
import { useFavorite } from "@/hooks/use-favorite";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Place = Database["public"]["Tables"]["places"]["Row"];

export const Route = createFileRoute("/places/$id")({
  loader: async ({ params }) => {
    const [place, all] = await Promise.all([
      getPlaceById({ data: { id: params.id } }),
      listPlaces(),
    ]);
    if (!place) throw notFound();
    return { place: place as Place, all: all as Place[] };
  },
  component: PlaceDetail,
  notFoundComponent: () => (
    <div className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-xl font-semibold">Place not found</h1>
      <Link to="/places" className="mt-4 inline-block text-primary">
        Back to places
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
          { title: `${loaderData.place.name_th} — TripChan` },
          { name: "description", content: loaderData.place.description_en.slice(0, 160) },
          { property: "og:title", content: loaderData.place.name_en },
          { property: "og:image", content: loaderData.place.image_url ?? "" },
        ]
      : [],
  }),
});

const CAT_EMOJI: Record<string, string> = {
  beach: "🏖️", nature: "🏞️", temple: "⛩️", history: "🏛️",
  food: "🍜", cafe: "☕", nightlife: "🍻", fruit: "🍇",
};
const CAT_GRADIENT: Record<string, string> = {
  beach: "from-sky-200 to-cyan-300",
  nature: "from-emerald-200 to-green-300",
  temple: "from-amber-200 to-orange-300",
  history: "from-stone-200 to-amber-200",
  food: "from-orange-200 to-red-300",
  cafe: "from-amber-100 to-yellow-200",
  nightlife: "from-purple-300 to-fuchsia-400",
  fruit: "from-lime-200 to-yellow-300",
};

function PlaceDetail() {
  const { place, all } = Route.useLoaderData();
  const { lang, t } = useI18n();
  const { isFav, toggle } = useFavorite(place.id);
  const [imgError, setImgError] = useState(false);

  const name = lang === "th" ? place.name_th : place.name_en;
  const desc = lang === "th" ? place.description_th : place.description_en;
  const showImage = place.image_url && !imgError;
  const gradient = CAT_GRADIENT[place.category] ?? "from-slate-200 to-slate-300";
  const emoji = CAT_EMOJI[place.category] ?? "📍";

  const nearby = all
    .filter((p: Place) => p.id !== place.id && p.category === place.category)
    .slice(0, 4);

  const mapsUrl =
    place.lat && place.lng
      ? `https://www.google.com/maps?q=${place.lat},${place.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name_en + " Chanthaburi")}`;

  return (
    <div className="mx-auto max-w-4xl px-4 pt-3">
      <Link
        to="/places"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("navPlaces")}
      </Link>

      <div className="mt-3 overflow-hidden rounded-3xl border border-border shadow-soft">
        {showImage ? (
          <img
            src={place.image_url!}
            alt={name}
            onError={() => setImgError(true)}
            className="aspect-[16/9] w-full object-cover"
          />
        ) : (
          <div
            className={cn(
              "flex aspect-[16/9] w-full flex-col items-center justify-center gap-3 bg-gradient-to-br",
              gradient,
            )}
          >
            <span className="text-7xl">{emoji}</span>
            <span className="px-4 text-center text-base font-medium text-foreground/70">
              {name}
            </span>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
            {categoryLabel(place.category, lang)}
          </span>
          <h1 className="mt-2 font-display text-2xl font-bold md:text-3xl">{name}</h1>
          {place.rating && (
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-4 w-4 fill-fruit text-fruit" />
              {Number(place.rating).toFixed(1)}
            </div>
          )}
        </div>
        <button
          onClick={toggle}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            isFav
              ? "border-destructive bg-destructive/10 text-destructive"
              : "border-border bg-card hover:bg-secondary",
          )}
        >
          <Heart className={cn("h-4 w-4", isFav && "fill-destructive")} />
          {isFav ? t("saved") : t("saveToFavorites")}
        </button>
      </div>

      <p className="mt-4 leading-relaxed text-foreground/90">{desc}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {place.opening_hours && (
          <InfoRow icon={Clock} label={t("openingHours")} value={place.opening_hours} />
        )}
        {place.price_info && (
          <InfoRow icon={Tag} label={t("priceInfo")} value={place.price_info} />
        )}
        {place.address && (
          <InfoRow icon={MapPin} label={t("address")} value={place.address} />
        )}
        {place.phone && <InfoRow icon={Phone} label={t("phone")} value={place.phone} />}
      </div>

      {/* Map embed */}
      {place.lat && place.lng && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border shadow-soft">
          <iframe
            title={name}
            className="h-72 w-full"
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${place.lng - 0.02}%2C${place.lat - 0.02}%2C${place.lng + 0.02}%2C${place.lat + 0.02}&layer=mapnik&marker=${place.lat}%2C${place.lng}`}
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <CheckInButton placeId={place.id} />
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <MapPin className="h-4 w-4" /> {t("openInMaps")}
        </a>
        <Link
          to="/chat"
          search={{ q: lang === "th" ? `เล่าเกี่ยวกับ ${place.name_th} หน่อย` : `Tell me about ${place.name_en}` }}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary"
        >
          ✨ {t("askAI")}
        </Link>
      </div>

      {/* Review section */}
      <section className="mt-6">
        <ReviewForm placeId={place.id} />
      </section>

      {nearby.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-lg font-semibold">{t("nearbyPlaces")}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {nearby.map((p: Place) => (
              <PlaceCard key={p.id} place={p} />
            ))}
          </div>
        </section>
      )}
      <div className="h-10" />
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-gradient-card p-3.5">
      <Icon className="mt-0.5 h-4 w-4 text-primary" />
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  );
}
