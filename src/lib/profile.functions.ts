import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: { context: any }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const updateSchema = z.object({
  data: z.object({
    display_name: z.string().max(80).optional(),
    home_zip: z.string().max(10).nullable().optional(),
    home_city: z.string().max(120).nullable().optional(),
    home_lat: z.number().nullable().optional(),
    home_lon: z.number().nullable().optional(),
    notify_alerts: z.boolean().optional(),
    notify_forecast: z.boolean().optional(),
    notify_marine: z.boolean().optional(),
    min_severity: z.enum(["extreme", "severe", "moderate", "minor"]).optional(),
  }),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateSchema.parse(data))
  .handler(async ({ data, context }: { data: any; context: any }) => {
    const { data: row, error } = await context.supabase
      .from("profiles")
      .update(data.data)
      .eq("id", context.userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
