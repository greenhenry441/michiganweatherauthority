import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { redirect } from "@tanstack/react-router";
import type { ManagementSession } from "./session-config.server";

// Timing-safe SHA-256 comparison (Worker-compatible, no node:crypto).
async function safeEqual(a: string, b: string) {
  const enc = new TextEncoder();
  const aHash = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(a) as BufferSource));
  const bHash = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(b) as BufferSource));
  let diff = aHash.length ^ bHash.length;
  for (let i = 0; i < aHash.length; i++) diff |= aHash[i] ^ bHash[i];
  return diff === 0;
}

async function requireManagementSession() {
  const { useSession } = await import("@tanstack/react-start/server");
  const { MANAGEMENT_SESSION } = await import("./session-config.server");
  const session = await useSession<ManagementSession>(MANAGEMENT_SESSION);
  if (!session.data.unlocked) throw redirect({ to: "/management" });
  return session;
}

export const isManagementUnlocked = createServerFn({ method: "GET" }).handler(async () => {
  const { useSession } = await import("@tanstack/react-start/server");
  const { MANAGEMENT_SESSION } = await import("./session-config.server");
  const session = await useSession<ManagementSession>(MANAGEMENT_SESSION);
  return { unlocked: !!session.data.unlocked, unlockedAt: session.data.unlockedAt ?? null };
});

export const unlockManagement = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const expected = process.env.MANAGEMENT_PASSWORD || "TBCI2024";
    const ok = await safeEqual(data.password, expected);
    if (!ok) return { ok: false as const };
    const { useSession } = await import("@tanstack/react-start/server");
    const { MANAGEMENT_SESSION } = await import("./session-config.server");
    const session = await useSession<ManagementSession>(MANAGEMENT_SESSION);
    await session.update({ unlocked: true, unlockedAt: Date.now() });
    return { ok: true as const };
  });

export const lockManagement = createServerFn({ method: "POST" }).handler(async () => {
  const { useSession } = await import("@tanstack/react-start/server");
  const { MANAGEMENT_SESSION } = await import("./session-config.server");
  const session = await useSession<ManagementSession>(MANAGEMENT_SESSION);
  await session.clear();
  return { ok: true };
});

// ----- Status updates CRUD (gated) -----

const KIND = z.enum(["alert", "maintenance", "info"]);
const SEVERITY = z.enum(["info", "warn", "critical"]);

export const listStatusUpdatesAdmin = createServerFn({ method: "GET" }).handler(async () => {
  await requireManagementSession();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("status_updates")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const createStatusUpdate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        kind: KIND,
        severity: SEVERITY.default("info"),
        title: z.string().trim().min(1).max(160),
        message: z.string().trim().max(2000).default(""),
        link_url: z.string().url().max(500).nullable().optional(),
        active: z.boolean().default(true),
        ends_at: z.string().datetime().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireManagementSession();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("status_updates")
      .insert({
        kind: data.kind,
        severity: data.severity,
        title: data.title,
        message: data.message,
        link_url: data.link_url ?? null,
        active: data.active,
        ends_at: data.ends_at ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const toggleStatusUpdate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireManagementSession();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("status_updates")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteStatusUpdate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireManagementSession();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("status_updates")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Public read for the homepage banner — only currently active rows.
export const listActiveStatusUpdates = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await client
    .from("status_updates")
    .select("id, kind, severity, title, message, link_url, starts_at, ends_at")
    .order("starts_at", { ascending: false })
    .limit(10);
  if (error) return [];
  return data ?? [];
});
