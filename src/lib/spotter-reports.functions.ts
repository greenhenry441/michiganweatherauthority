import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const KIND = z.enum([
  "tornado",
  "funnel",
  "wall_cloud",
  "hail",
  "wind_damage",
  "flooding",
  "heavy_snow",
  "ice",
  "other",
]);

const reportSchema = z.object({
  kind: KIND,
  measurement: z.string().max(80).nullable().optional(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  location_label: z.string().max(160).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  photo_url: z.string().max(2000).nullable().optional(),
});

export const listReports = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z
      .object({ limit: z.number().int().min(1).max(100).optional(), kind: KIND.optional() })
      .optional()
      .parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    const client = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    let q = client
      .from("spotter_reports")
      .select("id, kind, measurement, lat, lon, location_label, notes, photo_url, status, confirmed_count, doubt_count, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(data?.limit ?? 50);
    if (data?.kind) q = q.eq("kind", data.kind);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => reportSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("spotter_reports")
      .insert({ user_id: userId, ...data })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const reactToReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ report_id: z.string().uuid(), kind: z.enum(["confirm", "doubt"]) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Toggle: remove if same, replace if different.
    const { data: existing } = await supabase
      .from("report_reactions")
      .select("id, kind")
      .eq("report_id", data.report_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      if (existing.kind === data.kind) {
        await supabase.from("report_reactions").delete().eq("id", existing.id);
        return { state: "removed" };
      }
      await supabase.from("report_reactions").update({ kind: data.kind }).eq("id", existing.id);
      return { state: "changed" };
    }
    const { error } = await supabase
      .from("report_reactions")
      .insert({ report_id: data.report_id, user_id: userId, kind: data.kind });
    if (error) throw new Error(error.message);
    return { state: "added" };
  });

export const commentOnReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ report_id: z.string().uuid(), body: z.string().trim().min(1).max(2000) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("report_comments")
      .insert({ report_id: data.report_id, user_id: userId, body: data.body })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getReportThread = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ report_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const client = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const [{ data: report }, { data: comments }] = await Promise.all([
      client
        .from("spotter_reports")
        .select("id, kind, measurement, lat, lon, location_label, notes, photo_url, status, confirmed_count, doubt_count, created_at, user_id")
        .eq("id", data.report_id)
        .maybeSingle(),
      client
        .from("report_comments")
        .select("id, body, created_at, user_id")
        .eq("report_id", data.report_id)
        .order("created_at", { ascending: true }),
    ]);
    return { report, comments: comments ?? [] };
  });

export const leaderboardThisMonth = createServerFn({ method: "GET" }).handler(async () => {
  const client = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { data, error } = await client
    .from("spotter_reports")
    .select("user_id, confirmed_count")
    .gte("created_at", start.toISOString());
  if (error) throw new Error(error.message);
  const map = new Map<string, { user_id: string; reports: number; confirms: number }>();
  for (const r of data ?? []) {
    const e = map.get(r.user_id) ?? { user_id: r.user_id, reports: 0, confirms: 0 };
    e.reports += 1;
    e.confirms += r.confirmed_count ?? 0;
    map.set(r.user_id, e);
  }
  return Array.from(map.values())
    .sort((a, b) => b.confirms - a.confirms || b.reports - a.reports)
    .slice(0, 25);
});
