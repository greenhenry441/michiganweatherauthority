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

    // Fan out push notifications, applying per-user preferences before sending.
    try {
      const { data: subs } = await supabaseAdmin
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth, min_severity, user_id");
      if (subs && subs.length) {
        const SEV_RANK: Record<string, number> = { minor: 1, moderate: 2, severe: 3, extreme: 4 };
        const sev = SEV_RANK[data.severity] ?? 2;
        const userIds = Array.from(new Set((subs as any[]).map((s) => s.user_id).filter(Boolean)));
        const { data: prefRows } = userIds.length
          ? await supabaseAdmin
              .from("user_preferences")
              .select("user_id, notify_severity, notify_counties, notify_types, quiet_start, quiet_end")
              .in("user_id", userIds)
          : { data: [] as any[] };
        const prefsMap = new Map<string, any>(((prefRows as any[]) ?? []).map((p) => [p.user_id, p]));

        const targets = (subs as any[]).filter((s) => {
          if ((SEV_RANK[s.min_severity ?? "moderate"] ?? 2) > sev) return false;
          const p = s.user_id ? prefsMap.get(s.user_id) : null;
          if (!p) return true;
          if (p.notify_severity?.length && !p.notify_severity.includes(data.severity)) return false;
          if (p.notify_counties?.length && data.areas.length && !data.areas.some((a) => p.notify_counties.includes(a))) return false;
          if (p.notify_types?.length && data.typeId && !p.notify_types.includes(data.typeId)) return false;
          if (data.severity !== "extreme" && p.quiet_start && p.quiet_end) {
            const now = new Date();
            const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
            const [sh, sm] = String(p.quiet_start).split(":").map(Number);
            const [eh, em] = String(p.quiet_end).split(":").map(Number);
            const start = sh * 60 + sm; const end = eh * 60 + em;
            const inQuiet = start <= end ? mins >= start && mins < end : mins >= start || mins < end;
            if (inQuiet) return false;
          }
          return true;
        });

        if (targets.length) {
          const { sendPushNotifications } = await import("@/lib/web-push.server");
          const title =
            data.customName ||
            (data.kind === "eas"
              ? "EAS Alert"
              : data.kind === "mwa-network"
                ? "MWA Network Notification"
                : data.headline);
          const result = await sendPushNotifications(
            targets.map((s: any) => ({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth })),
            {
              title,
              body: `${(data.areas.length ? data.areas : ["Statewide"]).join(", ")} — ${data.headline}`,
              url: "/",
              id: row.id,
              tag: `mwa-${row.id}`,
              severity: data.severity,
            },
          );
          // Log delivery + prune dead endpoints.
          try {
            const goneSet = new Set(result.gone);
            await supabaseAdmin.from("push_delivery_log").insert(
              targets.map((s: any) => ({
                alert_id: row.id,
                endpoint: s.endpoint,
                user_id: s.user_id,
                ok: !goneSet.has(s.endpoint),
                status_code: null,
                error: null,
              })),
            );
            if (result.gone.length) {
              await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", result.gone);
            }
          } catch (logErr) {
            console.error("[push] log/prune failed", logErr);
          }
        }
      }
    } catch (e) {
      console.error("[push] fanout failed", e);
    }

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
