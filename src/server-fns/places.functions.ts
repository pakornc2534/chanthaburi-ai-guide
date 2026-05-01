import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

export const listPlaces = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("places")
    .select("*")
    .order("featured", { ascending: false })
    .order("rating", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getPlaceById = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { data: place, error } = await supabaseAdmin
      .from("places")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return place;
  });

export const getTripByShareId = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ shareId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { data: trip, error } = await supabaseAdmin
      .from("trips")
      .select("*")
      .eq("share_id", data.shareId)
      .eq("is_public", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return trip;
  });

export const saveTrip = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        title: z.string(),
        params: z.any(),
        plan: z.any(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { data: trip, error } = await supabaseAdmin
      .from("trips")
      .insert({
        title: data.title,
        params: data.params,
        plan: data.plan,
        is_public: true,
      })
      .select("share_id")
      .single();
    if (error) throw new Error(error.message);
    return trip;
  });

export const listPartners = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("partners")
    .select("*")
    .order("rating", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listRewards = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("rewards")
    .select("*, partners(*)")
    .eq("active", true)
    .order("point_cost", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});
