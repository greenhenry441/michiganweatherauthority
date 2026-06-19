import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ACCESS_CODE = "mwa-admin";

const alertSchema = z
  .object({
    code: z.string(),
    kind: z.enum(["weather", "eas", "mwa-network"]).default("weather"),
    typeId: z.string().nullable(),
    customName: z.string().nullable(),
    category: z.enum(["warning", "watch", "advisory", "statement", "extreme"]),
    severity: z.enum(["extreme", "severe", "moderate", "minor"]),
    headline: z.string().min(3).max(200),
    description: z.string().min(3).max(4000),
    instruction: z.string().max(2000).nullable(),
    areas: z.array(z.string().min(1).max(80)).max(100),
    issuer: z.string().min(1).max(80),
    durationMinutes: z.number().int().min(1).max(7 * 24 * 60).nullable().optional(),
    startsAt: z.string().datetime().nullable().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    startsImmediately: z.boolean().optional(),
  })
  .refine(
    (d) => d.durationMinutes != null || d.endsAt != null,
    { message: "Provide either durationMinutes or an end time" },
  );

export const issueAlert = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => alertSchema.parse(data))
  .handler(async ({ data }) => {
    if (data.code !== ACCESS_CODE) {
      throw new Error("Invalid access code");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    const issued_at = data.startsImmediately || !data.startsAt ? now : new Date(data.startsAt);
    const expires_at = data.endsAt
      ? new Date(data.endsAt)
      : new Date(issued_at.getTime() + (data.durationMinutes ?? 60) * 60_000);
    if (expires_at <= issued_at) throw new Error("End time must be after start time");

    const { data: row, error } = await supabaseAdmin
      .from("alerts")
      .insert({
        kind: data.kind,
        type_id: data.typeId,
        custom_name: data.customName,
        category: data.category,
        severity: data.severity,
        headline: data.headline,
        description: data.description,
        instruction: data.instruction,
        areas: data.areas.length ? data.areas : ["Statewide"],
        issuer: data.issuer,
        issued_at: issued_at.toISOString(),
        expires_at: expires_at.toISOString(),
        source: "manual",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const cancelSchema = z.object({ code: z.string(), id: z.string().uuid() });

export const cancelAlert = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => cancelSchema.parse(data))
  .handler(async ({ data }) => {
    if (data.code !== ACCESS_CODE) throw new Error("Invalid access code");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("alerts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
