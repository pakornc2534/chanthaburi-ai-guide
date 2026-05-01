import { useEffect, useState } from "react";
import { CheckCircle2, MapPin } from "lucide-react";
import { addCheckIn, hasCheckedInToday, POINTS } from "@/lib/local-state";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function CheckInButton({ placeId }: { placeId: string }) {
  const { t } = useI18n();
  const [checkedIn, setCheckedIn] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setCheckedIn(hasCheckedInToday(placeId));
    const onChange = () => setCheckedIn(hasCheckedInToday(placeId));
    window.addEventListener("tripchan-state-changed", onChange);
    return () => window.removeEventListener("tripchan-state-changed", onChange);
  }, [placeId]);

  const handle = () => {
    const result = addCheckIn(placeId);
    if (result.success) {
      setToast(t("earnedPoints").replace("{n}", String(result.pointsEarned)));
      setTimeout(() => setToast(null), 2500);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handle}
        disabled={checkedIn}
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
          checkedIn
            ? "border border-emerald-300 bg-emerald-50 text-emerald-700"
            : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-soft hover:shadow-elevated active:scale-95",
        )}
      >
        {checkedIn ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            {t("checkedInToday")}
          </>
        ) : (
          <>
            <MapPin className="h-4 w-4" />
            {t("checkInBtn")}
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
              +{POINTS.perCheckIn}
            </span>
          </>
        )}
      </button>
      {toast && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-elevated animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  );
}
