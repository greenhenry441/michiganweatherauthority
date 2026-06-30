import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyLocations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("saved_locations")
      .select("*")
      .order("is_home", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const addSchema = z.object({
  label: z.string().min(1).max(120),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  is_home: z.boolean().optional(),
});

export const addLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => addSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.is_home) {
      await supabase.from("saved_locations").update({ is_home: false }).eq("user_id", userId);
    }
    const { data: row, error } = await supabase
      .from("saved_locations")
      .insert({ user_id: userId, ...data })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("saved_locations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setHomeLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("saved_locations").update({ is_home: false }).eq("user_id", userId);
    const { error } = await supabase
      .from("saved_locations")
      .update({ is_home: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Open-Meteo geocoder — public, no key required.
export const geocodeLocation = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ query: z.string().min(1).max(120) }).parse(data),
  )
  .handler(async ({ data }) => {
    const url = `https://geocoding-api.open-meteo.com/v1/search?count=8&language=en&format=json&name=${encodeURIComponent(data.query)}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error("Geocoder unavailable");
    const json = (await r.json()) as { results?: Array<{ name: string; admin1?: string; country_code?: string; latitude: number; longitude: number }> };
    return (json.results ?? [])
      .filter((r) => r.country_code === "US")
      .map((r) => ({
        label: r.admin1 ? `${r.name}, ${r.admin1}` : r.name,
        lat: r.latitude,
        lon: r.longitude,
      }));
  });
