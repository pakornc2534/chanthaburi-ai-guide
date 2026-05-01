import { Link } from "@tanstack/react-router";
import { Heart, MapPin, Star } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { useI18n, categoryLabel } from "@/lib/i18n";
import { useFavorite } from "@/hooks/use-favorite";
import { cn } from "@/lib/utils";

type Place = Database["public"]["Tables"]["places"]["Row"];

export function PlaceCard({ place }: { place: Place }) {
  const { lang, t } = useI18n();
  const { isFav, toggle } = useFavorite(place.id);

  const name = lang === "th" ? place.name_th : place.name_en;
  const desc = lang === "th" ? place.description_th : place.description_en;

  return (
    <Link
      to="/places/$id"
      params={{ id: place.id }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-gradient-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {place.image_url && (
          <img
            src={place.image_url}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggle();
          }}
          aria-label={t("saveToFavorites")}
          className="absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full bg-background/90 backdrop-blur transition-colors hover:bg-background"
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              isFav ? "fill-destructive text-destructive" : "text-foreground",
            )}
          />
        </button>
        <span className="absolute bottom-2.5 left-2.5 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
          {categoryLabel(place.category, lang)}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-semibold leading-tight">{name}</h3>
          {place.rating && (
            <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Star className="h-3.5 w-3.5 fill-fruit text-fruit" />
              {Number(place.rating).toFixed(1)}
            </div>
          )}
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">{desc}</p>
        {place.district && (
          <div className="mt-auto flex items-center gap-1 pt-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" /> {place.district}
          </div>
        )}
      </div>
    </Link>
  );
}
