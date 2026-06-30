import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { CommandSession } from "./session-config.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const isCommandUnlocked = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { useSession } = await import("@tanstack/react-start/server");
    const { COMMAND_SESSION } = await import("./session-config.server");
    const session = await useSession<CommandSession>(COMMAND_SESSION);
    return {
      unlocked: !!session.data.unlocked && session.data.userId === context.userId,
      unlockedAt: session.data.unlockedAt ?? null,
    };
  });

export const unlockCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. admin role check
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return { ok: false as const, error: "not_authorized" };

    // 2. rate limit (5 failed in 15 min)
    const { data: recent } = await supabase
      .from("command_unlock_attempts")
      .select("success, attempted_at")
      .gte("attempted_at", new Date(Date.now() - 15 * 60_000).toISOString())
      .order("attempted_at", { ascending: false })
      .limit(10);
    const failures = (recent ?? []).filter((r) => !r.success).length;
    if (failures >= 5) return { ok: false as const, error: "rate_limited" };

    const recordAttempt = async (success: boolean) => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("command_unlock_attempts").insert({ user_id: userId, success });
    };

    // 3. password compare (timing safe)
    const expected = process.env.COMMAND_PASSWORD || "";
    const a = new TextEncoder().encode(data.password);
    const b = new TextEncoder().encode(expected);
    const aHash = new Uint8Array(await crypto.subtle.digest("SHA-256", a as BufferSource));
    const bHash = new Uint8Array(await crypto.subtle.digest("SHA-256", b as BufferSource));
    let diff = aHash.length ^ bHash.length;
    for (let i = 0; i < aHash.length; i++) diff |= aHash[i] ^ bHash[i];
    if (diff !== 0) {
      await recordAttempt(false);
      return { ok: false as const, error: "invalid_credentials" };
    }

    // 4. set session
    const { useSession } = await import("@tanstack/react-start/server");
    const { COMMAND_SESSION } = await import("./session-config.server");
    const session = await useSession<CommandSession>(COMMAND_SESSION);
    await session.update({ unlocked: true, userId, unlockedAt: Date.now() });

    await recordAttempt(true);
    return { ok: true as const };
  });

export const lockCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { useSession } = await import("@tanstack/react-start/server");
    const { COMMAND_SESSION } = await import("./session-config.server");
    const session = await useSession<CommandSession>(COMMAND_SESSION);
    await session.clear();
    return { ok: true };
  });
