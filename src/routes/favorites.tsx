import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { listPlaces } from "@/server-fns/places.functions";
import { useAllFavorites } from "@/hooks/use-favorite";
import { useI18n } from "@/lib/i18n";
import { PlaceCard } from "@/components/PlaceCard";
import type { Database } from "@/integrations/supabase/types";

type Place = Database["public"]["Tables"]["places"]["Row"];

export const Route = createFileRoute("/favorites")({
  loader: () => listPlaces(),
  component: FavoritesPage,
  head: () => ({
    meta: [{ title: "รายการโปรด — Saved places" }],
  }),
});

function FavoritesPage() {
  const all = Route.useLoaderData() as Place[];
  const { t } = useI18n();
  const ids = useAllFavorites();
  const places = all.filter((p) => ids.includes(p.id));

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4">
      <h1 className="font-display text-2xl font-bold md:text-3xl">{t("favoritesTitle")}</h1>

      {places.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
            <Heart className="h-6 w-6" />
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">{t("emptyFavorites")}</p>
          <Link
            to="/places"
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
          >
            {t("allPlaces")}
          </Link>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {places.map((p) => (
            <PlaceCard key={p.id} place={p} />
          ))}
        </div>
      )}
      <div className="h-10" />
    </div>
  );
}
