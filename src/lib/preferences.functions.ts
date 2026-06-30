import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const prefsSchema = z.object({
  units_temp: z.enum(["F", "C"]).optional(),
  units_speed: z.enum(["mph", "kph"]).optional(),
  units_precip: z.enum(["in", "mm"]).optional(),
  clock_24h: z.boolean().optional(),
  notify_severity: z.array(z.enum(["extreme", "severe", "moderate", "minor"])).optional(),
  notify_counties: z.array(z.string().min(1).max(80)).max(200).optional(),
  notify_types: z.array(z.string().min(1).max(120)).max(200).optional(),
  quiet_start: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  quiet_end: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  quiet_tz: z.string().max(64).optional(),
  daily_briefing: z.boolean().optional(),
  lightning_radius_mi: z.number().int().min(0).max(100).optional(),
  home_lat: z.number().min(-90).max(90).nullable().optional(),
  home_lon: z.number().min(-180).max(180).nullable().optional(),
  home_label: z.string().max(120).nullable().optional(),
  default_map: z.enum(["radar", "alerts", "lightning", "satellite"]).optional(),
});

export const getMyPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data;
    // Seed defaults on first read so the UI always has a row.
    const { data: inserted, error: insErr } = await supabase
      .from("user_preferences")
      .insert({ user_id: userId })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);
    return inserted;
  });

export const updateMyPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => prefsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("user_preferences")
      .upsert({ user_id: userId, ...data }, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
