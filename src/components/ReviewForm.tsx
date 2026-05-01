import { useEffect, useState } from "react";
import { Star, Edit2, Save, X } from "lucide-react";
import { getReviewForPlace, upsertReview, POINTS, type LocalReview } from "@/lib/local-state";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function ReviewForm({ placeId }: { placeId: string }) {
  const { t } = useI18n();
  const [existing, setExisting] = useState<LocalReview | null>(null);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const r = getReviewForPlace(placeId);
    setExisting(r);
    if (r) {
      setRating(r.rating);
      setComment(r.comment);
    }
    const onChange = () => {
      const fresh = getReviewForPlace(placeId);
      setExisting(fresh);
    };
    window.addEventListener("tripchan-state-changed", onChange);
    return () => window.removeEventListener("tripchan-state-changed", onChange);
  }, [placeId]);

  const submit = () => {
    const result = upsertReview(placeId, rating, comment);
    setEditing(false);
    if (result.isNew && result.pointsEarned > 0) {
      setToast(t("earnedPoints").replace("{n}", String(result.pointsEarned)));
      setTimeout(() => setToast(null), 2500);
    }
  };

  // Display existing review (non-editing)
  if (existing && !editing) {
    return (
      <div className="rounded-2xl border border-border bg-gradient-card p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold">{t("reviewSection")}</h3>
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Edit2 className="h-3 w-3" /> {t("editReview")}
          </button>
        </div>
        <div className="mt-2 flex gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={cn(
                "h-4 w-4",
                n <= existing.rating
                  ? "fill-fruit text-fruit"
                  : "fill-muted text-muted-foreground/30",
              )}
            />
          ))}
        </div>
        {existing.comment && (
          <p className="mt-2 text-sm text-foreground/90">{existing.comment}</p>
        )}
      </div>
    );
  }

  // Edit / Create form
  return (
    <div className="relative rounded-2xl border border-border bg-gradient-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold">
          {existing ? t("editReview") : t("writeReview")}
        </h3>
        {!existing && (
          <span className="rounded-full bg-fruit/15 px-2 py-0.5 text-[10px] font-bold text-fruit">
            +{POINTS.perReview} {t("pointsLabel")}
          </span>
        )}
      </div>

      <div className="mt-3">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("rating")}</div>
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(n)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  "h-7 w-7 transition-colors",
                  n <= (hoverRating || rating)
                    ? "fill-fruit text-fruit"
                    : "fill-muted text-muted-foreground/30",
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("comment")}</div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder={t("commentPlaceholder")}
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="mt-3 flex justify-end gap-2">
        {existing && (
          <button
            onClick={() => {
              setEditing(false);
              setRating(existing.rating);
              setComment(existing.comment);
            }}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-xs"
          >
            <X className="h-3 w-3" /> {t("cancel")}
          </button>
        )}
        <button
          onClick={submit}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          <Save className="h-3 w-3" /> {existing ? t("saveReview") : t("submitReview")}
        </button>
      </div>

      {toast && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-elevated animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  );
}
