import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Sends a real Web Push to every push subscription registered for the current user.
// Use this to verify end-to-end delivery on a physical device.
export const sendTestPushToMe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subs, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    if (!subs || subs.length === 0) {
      throw new Error("No registered devices. Enable notifications in Settings first.");
    }

    const { sendPushNotifications } = await import("@/lib/web-push.server");
    const result = await sendPushNotifications(
      subs.map((s) => ({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth })),
      {
        title: "MWA — Test notification",
        body: "If you can see this on your device, push notifications are working.",
        url: "/",
        tag: `mwa-test-${Date.now()}`,
        severity: "moderate",
      },
    );

    // Best-effort: log delivery results.
    try {
      const rows = subs.map((s) => ({
        endpoint: s.endpoint,
        user_id: context.userId,
        ok: !result.gone.includes(s.endpoint),
        status_code: null as number | null,
        error: null as string | null,
      }));
      await supabaseAdmin.from("push_delivery_log").insert(rows);
      // Prune dead endpoints
      if (result.gone.length) {
        await supabaseAdmin
          .from("push_subscriptions")
          .delete()
          .in("endpoint", result.gone);
      }
    } catch (e) {
      console.error("[push] log/prune failed", e);
    }

    return {
      devices: subs.length,
      sent: result.sent,
      failed: result.failed,
      removed: result.gone.length,
    };
  });
