import { useState } from "react";
import { Star, MapPin, Hotel as HotelIcon, ShoppingBag, ExternalLink } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Partner = Database["public"]["Tables"]["partners"]["Row"];

export function PartnerCard({
  partner,
  compact = false,
}: {
  partner: Partner;
  compact?: boolean;
}) {
  const { lang } = useI18n();
  const [imgError, setImgError] = useState(false);
  const name = lang === "th" ? partner.name_th : partner.name_en;
  const desc = lang === "th" ? partner.description_th : partner.description_en;

  const Icon = partner.type === "hotel" ? HotelIcon : ShoppingBag;
  const gradient =
    partner.type === "hotel"
      ? "from-sky-200 to-indigo-300"
      : "from-amber-200 to-orange-300";

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-gradient-card shadow-soft",
        compact ? "w-64" : "",
      )}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {partner.image_url && !imgError ? (
          <img
            src={partner.image_url}
            alt={name}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className={cn(
              "flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br",
              gradient,
            )}
          >
            <Icon className="h-9 w-9 text-foreground/60" />
            <span className="px-3 text-center text-xs font-medium text-foreground/70 line-clamp-2">
              {name}
            </span>
          </div>
        )}
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[10px] font-medium backdrop-blur">
          <Icon className="h-3 w-3" />
          {partner.type === "hotel" ? "Hotel" : "Shop"}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-display text-sm font-semibold leading-tight">
            {name}
          </h3>
          {partner.rating && (
            <div className="flex shrink-0 items-center gap-0.5 text-[11px] text-muted-foreground">
              <Star className="h-3 w-3 fill-fruit text-fruit" />
              {Number(partner.rating).toFixed(1)}
            </div>
          )}
        </div>
        {!compact && desc && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{desc}</p>
        )}
        {partner.district && (
          <div className="mt-auto flex items-center gap-1 pt-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" /> {partner.district}
          </div>
        )}
        {partner.url && (
          <a
            href={partner.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> เว็บไซต์
          </a>
        )}
      </div>
    </div>
  );
}
