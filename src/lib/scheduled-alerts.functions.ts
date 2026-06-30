import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const payloadSchema = z.object({
  kind: z.enum(["weather", "eas", "mwa-network"]),
  typeId: z.string().nullable(),
  customName: z.string().nullable(),
  category: z.enum(["warning", "watch", "advisory", "statement", "extreme"]),
  severity: z.enum(["extreme", "severe", "moderate", "minor"]),
  headline: z.string().min(3).max(200),
  description: z.string().min(3).max(4000),
  instruction: z.string().max(2000).nullable(),
  areas: z.array(z.string().min(1).max(80)).max(100),
  issuer: z.string().min(1).max(80),
  durationMinutes: z.number().int().min(1).max(7 * 24 * 60),
});

async function requireAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const listScheduledAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("scheduled_alerts")
      .select("*")
      .order("send_at", { ascending: true })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createScheduledAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ send_at: z.string().datetime(), payload: payloadSchema })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("scheduled_alerts")
      .insert({ created_by: context.userId, send_at: data.send_at, payload: data.payload })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const cancelScheduledAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("scheduled_alerts")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
