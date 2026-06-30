// Daily briefing cron — at 11:00 UTC (7am Eastern) sends a morning summary
// push to users with daily_briefing=true and a home location set.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/daily-briefing")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: users } = await supabaseAdmin
            .from("user_preferences")
            .select("user_id, home_lat, home_lon, home_label, units_temp, units_speed")
            .eq("daily_briefing", true)
            .not("home_lat", "is", null)
            .not("home_lon", "is", null);

          if (!users || users.length === 0) {
            return Response.json({ ok: true, sent: 0 });
          }

          const { sendPushNotifications } = await import("@/lib/web-push.server");
          let sent = 0;
          for (const u of users) {
            try {
              const tempUnit = u.units_temp === "C" ? "celsius" : "fahrenheit";
              const windUnit = u.units_speed === "kph" ? "kmh" : "mph";
              const url = `https://api.open-meteo.com/v1/forecast?latitude=${u.home_lat}&longitude=${u.home_lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}&forecast_days=1`;
              const r = await fetch(url);
              if (!r.ok) continue;
              const json: any = await r.json();
              const hi = Math.round(json.daily?.temperature_2m_max?.[0] ?? 0);
              const lo = Math.round(json.daily?.temperature_2m_min?.[0] ?? 0);
              const precip = json.daily?.precipitation_sum?.[0] ?? 0;
              const unit = u.units_temp === "C" ? "°C" : "°F";
              const label = u.home_label || "your area";
              const body = `Today in ${label}: high ${hi}${unit}, low ${lo}${unit}${precip > 0 ? ` · precip likely` : ""}.`;

              const { data: subs } = await supabaseAdmin
                .from("push_subscriptions")
                .select("endpoint, p256dh, auth")
                .eq("user_id", u.user_id);
              if (!subs || subs.length === 0) continue;

              const result = await sendPushNotifications(subs as any, {
                title: "MWA — Morning briefing",
                body,
                url: "/",
                tag: `mwa-briefing-${new Date().toISOString().slice(0, 10)}`,
                severity: "moderate",
              });
              sent += result.sent;
              if (result.gone.length) {
                await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", result.gone);
              }
            } catch (e) {
              console.error("[briefing]", e);
            }
          }
          return Response.json({ ok: true, sent });
        } catch (e) {
          return Response.json({ ok: false, error: String(e) }, { status: 500 });
        }
      },
    },
  },
});
