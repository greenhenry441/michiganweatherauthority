import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ACCESS_CODE = "mwa-admin";

const alertSchema = z.object({
  code: z.string(),
  typeId: z.string().nullable(),
  customName: z.string().nullable(),
  category: z.enum(["warning", "watch", "advisory", "statement", "extreme"]),
  severity: z.enum(["extreme", "severe", "moderate", "minor"]),
  headline: z.string().min(3).max(200),
  description: z.string().min(3).max(4000),
  instruction: z.string().max(2000).nullable(),
  areas: z.array(z.string().min(1).max(80)).max(50),
  issuer: z.string().min(1).max(80),
  durationMinutes: z.number().int().min(1).max(2880),
});

export const issueAlert = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => alertSchema.parse(data))
  .handler(async ({ data }) => {
    if (data.code !== ACCESS_CODE) {
      throw new Error("Invalid access code");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const expires_at = new Date(Date.now() + data.durationMinutes * 60_000).toISOString();
    const { data: row, error } = await supabaseAdmin
      .from("alerts")
      .insert({
        type_id: data.typeId,
        custom_name: data.customName,
        category: data.category,
        severity: data.severity,
        headline: data.headline,
        description: data.description,
        instruction: data.instruction,
        areas: data.areas.length ? data.areas : ["Statewide"],
        issuer: data.issuer,
        expires_at,
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
