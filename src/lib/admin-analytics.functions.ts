import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const getAdminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [subs, alerts, deliveries, reports] = await Promise.all([
      supabaseAdmin.from("push_subscriptions").select("id, user_id, created_at"),
      supabaseAdmin.from("alerts").select("id, severity, issued_at, areas").gte("issued_at", since),
      supabaseAdmin.from("push_delivery_log").select("ok, status_code, created_at").gte("created_at", since),
      supabaseAdmin.from("spotter_reports").select("id, kind, created_at").gte("created_at", since),
    ]);

    const subCount = subs.data?.length ?? 0;
    const uniqueUsers = new Set((subs.data ?? []).map((s: any) => s.user_id).filter(Boolean)).size;
    const alertsByDay = bucketByDay((alerts.data ?? []).map((a: any) => a.issued_at));
    const reportsByDay = bucketByDay((reports.data ?? []).map((r: any) => r.created_at));
    const deliveryOk = (deliveries.data ?? []).filter((d: any) => d.ok).length;
    const deliveryFail = (deliveries.data ?? []).length - deliveryOk;

    // Top counties from alert areas
    const countyCounts = new Map<string, number>();
    for (const a of alerts.data ?? []) {
      for (const area of (a.areas as string[] | null) ?? []) {
        countyCounts.set(area, (countyCounts.get(area) ?? 0) + 1);
      }
    }
    const topCounties = Array.from(countyCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return {
      subs: { total: subCount, uniqueUsers },
      alertsByDay,
      reportsByDay,
      delivery: { ok: deliveryOk, failed: deliveryFail },
      topCounties,
      reportsTotal: reports.data?.length ?? 0,
      alertsTotal: alerts.data?.length ?? 0,
    };
  });

function bucketByDay(timestamps: string[]) {
  const out = new Map<string, number>();
  for (const t of timestamps) {
    const d = new Date(t).toISOString().slice(0, 10);
    out.set(d, (out.get(d) ?? 0) + 1);
  }
  return Array.from(out.entries())
    .sort()
    .map(([day, count]) => ({ day, count }));
}

export const getAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // admin_audit_log may or may not exist as a real table; we read from alerts as the canonical action log.
    const [alerts, sched] = await Promise.all([
      supabaseAdmin.from("alerts").select("id, source, severity, headline, issuer, issued_at, expires_at").order("issued_at", { ascending: false }).limit(100),
      supabaseAdmin.from("scheduled_alerts").select("id, status, send_at, sent_at, created_at, created_by, error").order("created_at", { ascending: false }).limit(100),
    ]);
    return { alerts: alerts.data ?? [], scheduled: sched.data ?? [] };
  });

export const listPushSubscribers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, user_id, user_agent, min_severity, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const revokeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("push_subscriptions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
