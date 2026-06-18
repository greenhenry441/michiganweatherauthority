import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const updateSchema = z.object({
  display_name: z.string().max(80).optional(),
  home_zip: z.string().max(10).nullable().optional(),
  home_city: z.string().max(120).nullable().optional(),
  home_lat: z.number().nullable().optional(),
  home_lon: z.number().nullable().optional(),
  notify_alerts: z.boolean().optional(),
  notify_forecast: z.boolean().optional(),
  notify_hourly_forecast: z.boolean().optional(),
  notify_marine: z.boolean().optional(),
  notify_only_my_area: z.boolean().optional(),
  notify_categories: z.array(z.enum(["warning", "watch", "advisory", "statement"])).max(4).optional(),
  notify_event_types: z.array(z.string().max(120)).max(60).optional(),
  min_severity: z.enum(["extreme", "severe", "moderate", "minor"]).optional(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("profiles")
      .update(data)
      .eq("id", context.userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
