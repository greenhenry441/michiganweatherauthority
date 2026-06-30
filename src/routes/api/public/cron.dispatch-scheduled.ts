// Cron-driven dispatcher for scheduled alerts.
// Called every 5 minutes by pg_cron; processes any pending alert whose send_at has passed.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/dispatch-scheduled")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const nowIso = new Date().toISOString();
          const { data: due, error } = await supabaseAdmin
            .from("scheduled_alerts")
            .select("*")
            .eq("status", "pending")
            .lte("send_at", nowIso)
            .limit(25);
          if (error) throw error;
          if (!due || due.length === 0) {
            return Response.json({ ok: true, processed: 0 });
          }

          const { sendPushNotifications } = await import("@/lib/web-push.server");
          let processed = 0;
          for (const sch of due) {
            const p = sch.payload as any;
            try {
              const issued = new Date();
              const expires = new Date(issued.getTime() + (p.durationMinutes ?? 60) * 60_000);
              const { data: row, error: insErr } = await supabaseAdmin
                .from("alerts")
                .insert({
                  kind: p.kind,
                  type_id: p.typeId,
                  custom_name: p.customName,
                  category: p.category,
                  severity: p.severity,
                  headline: p.headline,
                  description: p.description,
                  instruction: p.instruction,
                  areas: p.areas?.length ? p.areas : ["Statewide"],
                  issuer: p.issuer,
                  issued_at: issued.toISOString(),
                  expires_at: expires.toISOString(),
                  source: "scheduled",
                })
                .select()
                .single();
              if (insErr) throw insErr;

              const { data: subs } = await supabaseAdmin
                .from("push_subscriptions")
                .select("endpoint, p256dh, auth, min_severity, user_id");
              const { filterTargets } = await import("@/lib/push-targeting.server");
              const targets = await filterTargets(supabaseAdmin, (subs ?? []) as any[], {
                severity: p.severity,
                areas: p.areas ?? [],
                typeId: p.typeId,
                kind: p.kind,
              });


              if (targets.length) {
                const result = await sendPushNotifications(
                  targets as any,
                  {
                    title: p.customName || p.headline,
                    body: `${(p.areas?.length ? p.areas : ["Statewide"]).join(", ")} — ${p.headline}`,
                    url: "/",
                    id: row.id,
                    tag: `mwa-${row.id}`,
                    severity: p.severity,
                  },
                );
                if (result.gone.length) {
                  await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", result.gone);
                }
              }

              await supabaseAdmin
                .from("scheduled_alerts")
                .update({ status: "sent", sent_at: new Date().toISOString() })
                .eq("id", sch.id);
              processed++;
            } catch (e) {
              await supabaseAdmin
                .from("scheduled_alerts")
                .update({ status: "failed", error: String(e).slice(0, 500) })
                .eq("id", sch.id);
            }
          }
          return Response.json({ ok: true, processed });
        } catch (e) {
          return Response.json({ ok: false, error: String(e) }, { status: 500 });
        }
      },
    },
  },
});
