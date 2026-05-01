import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { getPointsBalance } from "@/lib/local-state";
import { useI18n } from "@/lib/i18n";

export function PointsBadge() {
  const { t } = useI18n();
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    setBalance(getPointsBalance());
    const onChange = () => setBalance(getPointsBalance());
    window.addEventListener("tripchan-state-changed", onChange);
    return () => window.removeEventListener("tripchan-state-changed", onChange);
  }, []);

  return (
    <Link
      to="/rewards"
      className="inline-flex items-center gap-1.5 rounded-full border border-fruit/40 bg-fruit/10 px-3 py-1 text-xs font-semibold text-fruit transition-colors hover:bg-fruit/20"
      title={t("myPoints")}
    >
      <Sparkles className="h-3.5 w-3.5" />
      <span>{balance.toLocaleString()}</span>
      <span className="text-fruit/70">{t("pointsLabel")}</span>
    </Link>
  );
}
