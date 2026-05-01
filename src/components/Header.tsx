import { Link, useLocation } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Palmtree } from "lucide-react";
import { PointsBadge } from "./PointsBadge";

export function Header() {
  const { lang, setLang, t } = useI18n();
  const { pathname } = useLocation();

  const links = [
    { to: "/", label: t("navHome") },
    { to: "/places", label: t("navPlaces") },
    { to: "/chat", label: t("navChat") },
    { to: "/planner", label: t("navPlanner") },
    { to: "/rewards", label: t("navRewards") },
    { to: "/favorites", label: t("navFavorites") },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-hero text-white shadow-soft">
            <Palmtree className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">{t("appName")}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = l.to === "/" ? pathname === "/" : pathname.startsWith(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm transition-colors",
                  active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <PointsBadge />
          <div className="flex items-center gap-1 rounded-full border border-border bg-card p-0.5">
            <button
              onClick={() => setLang("th")}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                lang === "th" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              ไทย
            </button>
            <button
              onClick={() => setLang("en")}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              EN
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
