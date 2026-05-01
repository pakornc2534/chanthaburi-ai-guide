import { useEffect, useState } from "react";
import { Hotel, ChevronLeft, ChevronRight } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { listPartners } from "@/server-fns/places.functions";
import { PartnerCard } from "./PartnerCard";
import { useI18n } from "@/lib/i18n";
import type { Database } from "@/integrations/supabase/types";

type Partner = Database["public"]["Tables"]["partners"]["Row"];

export function HotelPartnerSlider() {
  const { t } = useI18n();
  const fetchPartners = useServerFn(listPartners);
  const [hotels, setHotels] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollerRef, setScrollerRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchPartners()
      .then((rows) => setHotels((rows as Partner[]).filter((p) => p.type === "hotel")))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fetchPartners]);

  const scrollBy = (dx: number) => {
    scrollerRef?.scrollBy({ left: dx, behavior: "smooth" });
  };

  if (loading || hotels.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hotel className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">{t("recommendedHotels")}</h2>
        </div>
        <div className="hidden gap-1 md:flex">
          <button
            onClick={() => scrollBy(-300)}
            className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card hover:bg-secondary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scrollBy(300)}
            className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card hover:bg-secondary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        ref={setScrollerRef}
        className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {hotels.map((h) => (
          <div key={h.id} className="snap-start">
            <PartnerCard partner={h} compact />
          </div>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        💡 {t("pocBadge")}
      </p>
    </section>
  );
}
