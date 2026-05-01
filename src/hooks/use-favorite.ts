import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getLocalFavorites,
  isLocalFavorite,
  toggleLocalFavorite,
} from "@/lib/local-favorites";

export function useFavorite(placeId: string) {
  const [isFav, setIsFav] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id ?? null;
    setUserId(uid);
    if (uid) {
      const { data: rows } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", uid)
        .eq("place_id", placeId)
        .maybeSingle();
      setIsFav(!!rows);
    } else {
      setIsFav(isLocalFavorite(placeId));
    }
  }, [placeId]);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("favorites-changed", onChange);
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());
    return () => {
      window.removeEventListener("favorites-changed", onChange);
      sub.subscription.unsubscribe();
    };
  }, [refresh]);

  const toggle = useCallback(async () => {
    if (userId) {
      if (isFav) {
        await supabase.from("favorites").delete().eq("user_id", userId).eq("place_id", placeId);
        setIsFav(false);
      } else {
        await supabase.from("favorites").insert({ user_id: userId, place_id: placeId });
        setIsFav(true);
      }
      window.dispatchEvent(new CustomEvent("favorites-changed"));
    } else {
      const added = toggleLocalFavorite(placeId);
      setIsFav(added);
    }
  }, [userId, isFav, placeId]);

  return { isFav, toggle };
}

export function useAllFavorites() {
  const [ids, setIds] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id ?? null;
    if (uid) {
      const { data: rows } = await supabase
        .from("favorites")
        .select("place_id")
        .eq("user_id", uid);
      setIds((rows ?? []).map((r) => r.place_id));
    } else {
      setIds(getLocalFavorites());
    }
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("favorites-changed", onChange);
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());
    return () => {
      window.removeEventListener("favorites-changed", onChange);
      sub.subscription.unsubscribe();
    };
  }, [refresh]);

  return ids;
}
