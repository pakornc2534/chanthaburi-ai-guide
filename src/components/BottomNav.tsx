import { Link, useLocation } from "@tanstack/react-router";
import { Home, MapPin, MessageSquare, Sparkles, Gift } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const { t } = useI18n();
  const { pathname } = useLocation();

  const items = [
    { to: "/", icon: Home, label: t("navHome") },
    { to: "/places", icon: MapPin, label: t("navPlaces") },
    { to: "/chat", icon: MessageSquare, label: t("navChat") },
    { to: "/planner", icon: Sparkles, label: t("navPlanner") },
    { to: "/rewards", icon: Gift, label: t("navRewards") },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-5">
        {items.map((it) => {
          const active =
            it.to === "/" ? pathname === "/" : pathname === it.to || pathname.startsWith(it.to + "/");
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              <span className={cn(active && "font-medium")}>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
