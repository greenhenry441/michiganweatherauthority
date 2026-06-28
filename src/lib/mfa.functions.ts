import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SigninMfaSession } from "./session-config.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Purpose = "signin" | "command";
type Method = "totp" | "email";

export const listMyFactors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_mfa_factors")
      .select("purpose, method, confirmed_at, last_used_at")
      .eq("user_id", context.userId);
    return { factors: data ?? [] };
  });

// Begin TOTP enrollment: generate secret, store unconfirmed, return otpauth uri + manual key.
export const startTotpEnroll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ purpose: z.enum(["signin", "command"]) }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.purpose === "command") {
      const { data: roleRow } = await context.supabase
        .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
      if (!roleRow) throw new Error("Only admins can enroll Command 2FA");
    }
    const { generateBase32Secret, buildOtpauthUri } = await import("./totp.server");
    const secret = generateBase32Secret(20);

    const email = context.claims?.email ?? "user@mwa";
    const account = `${email}-${data.purpose}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_mfa_factors").upsert(
      { user_id: context.userId, purpose: data.purpose, method: "totp", secret, confirmed_at: null },
      { onConflict: "user_id,purpose" },
    );
    const uri = buildOtpauthUri({ issuer: "MWA", account, secret });
    return { secret, uri };
  });

export const confirmTotpEnroll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ purpose: z.enum(["signin", "command"]), code: z.string().regex(/^\d{6}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("user_mfa_factors").select("secret, method").eq("user_id", context.userId).eq("purpose", data.purpose).maybeSingle();
    if (!row || row.method !== "totp" || !row.secret) return { ok: false as const, error: "no_pending_enroll" };
    const { verifyTotp } = await import("./totp.server");
    const ok = await verifyTotp(row.secret, data.code);
    if (!ok) return { ok: false as const, error: "invalid_code" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_mfa_factors")
      .update({ confirmed_at: new Date().toISOString() })
      .eq("user_id", context.userId).eq("purpose", data.purpose);
    return { ok: true as const };
  });

export const disableFactor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ purpose: z.enum(["signin", "command"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_mfa_factors")
      .delete()
      .eq("user_id", context.userId).eq("purpose", data.purpose);
    return { ok: true };
  });

// Begin email enrollment: marks pending, sends a code.
export const startEmailEnroll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ purpose: z.enum(["signin"]) }).parse(d)) // email blocked for command
  .handler(async ({ data, context }) => {
    const email = context.claims?.email;
    if (!email) throw new Error("No email on this account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_mfa_factors").upsert(
      { user_id: context.userId, purpose: data.purpose, method: "email", secret: null, confirmed_at: null },
      { onConflict: "user_id,purpose" },
    );
    return await issueAndSendCode(context.userId, email, "enroll");
  });

export const confirmEmailEnroll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().regex(/^\d{6}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const ok = await consumeCode(context.userId, "enroll", data.code, context.supabase);
    if (!ok) return { ok: false as const, error: "invalid_code" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_mfa_factors")
      .update({ confirmed_at: new Date().toISOString() })
      .eq("user_id", context.userId).eq("purpose", "signin").eq("method", "email");
    return { ok: true as const };
  });

// ----- Sign-in MFA verify -----
export const sendSigninCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = context.claims?.email;
    if (!email) throw new Error("No email");
    const { data: factor } = await context.supabase
      .from("user_mfa_factors").select("method, confirmed_at").eq("user_id", context.userId).eq("purpose", "signin").maybeSingle();
    if (!factor?.confirmed_at || factor.method !== "email") return { ok: false as const, error: "no_email_factor" };
    return await issueAndSendCode(context.userId, email, "signin");
  });

export const verifySigninMfa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().regex(/^\d{6}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: factor } = await context.supabase
      .from("user_mfa_factors").select("method, secret, confirmed_at").eq("user_id", context.userId).eq("purpose", "signin").maybeSingle();
    if (!factor?.confirmed_at) return { ok: false as const, error: "no_factor" };

    let ok = false;
    if (factor.method === "totp" && factor.secret) {
      const { verifyTotp } = await import("./totp.server");
      ok = await verifyTotp(factor.secret, data.code);
    } else if (factor.method === "email") {
      ok = await consumeCode(context.userId, "signin", data.code, context.supabase);
    }
    if (!ok) return { ok: false as const, error: "invalid_code" };

    const { useSession } = await import("@tanstack/react-start/server");
    const { SIGNIN_MFA_SESSION } = await import("./session-config.server");
    const session = await useSession<SigninMfaSession>(SIGNIN_MFA_SESSION);
    await session.update({ verifiedUserId: context.userId, verifiedAt: Date.now() });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_mfa_factors")
      .update({ last_used_at: new Date().toISOString() })
      .eq("user_id", context.userId).eq("purpose", "signin");
    return { ok: true as const };
  });

export const isSigninMfaVerified = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: factor } = await context.supabase
      .from("user_mfa_factors").select("method, confirmed_at").eq("user_id", context.userId).eq("purpose", "signin").maybeSingle();
    const enrolled = !!factor?.confirmed_at;
    if (!enrolled) return { enrolled: false, verified: true };
    const { useSession } = await import("@tanstack/react-start/server");
    const { SIGNIN_MFA_SESSION } = await import("./session-config.server");
    const session = await useSession<SigninMfaSession>(SIGNIN_MFA_SESSION);
    return { enrolled: true, verified: session.data.verifiedUserId === context.userId };
  });

// ----- helpers -----
async function issueAndSendCode(userId: string, email: string, purpose: "signin" | "command" | "enroll") {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code) as BufferSource);
  const hash = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("mfa_email_codes").insert({
    user_id: userId, purpose, code_hash: hash,
    expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  });
  try {
    const { sendMfaEmail } = await import("./mfa-email.server");
    await sendMfaEmail(email, code, purpose);
    return { ok: true as const, channel: "email" as const };
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "EMAIL_NOT_CONFIGURED") {
      return { ok: false as const, error: "email_not_configured" };
    }
    return { ok: false as const, error: "send_failed" };
  }
}

async function consumeCode(userId: string, purpose: string, code: string, supabase: any) {
  const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code) as BufferSource);
  const hash = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  const { data } = await supabase
    .from("mfa_email_codes")
    .select("id, expires_at, consumed_at")
    .eq("user_id", userId).eq("purpose", purpose).eq("code_hash", hash)
    .is("consumed_at", null)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("mfa_email_codes").update({ consumed_at: new Date().toISOString() }).eq("id", data.id);
  return true;
}
