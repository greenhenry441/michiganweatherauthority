// Threshold-check cron — every 15 minutes, for each enabled threshold
// fetches current conditions at the location and pushes if the condition is met.
// last_fired_at debounces to once per hour.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/check-thresholds")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { sendPushNotifications } = await import("@/lib/web-push.server");
          const { data: thresholds } = await supabaseAdmin
            .from("alert_thresholds")
            .select("id, user_id, metric, op, value, label, last_fired_at, location_id")
            .eq("enabled", true)
            .limit(500);
          if (!thresholds || thresholds.length === 0) return Response.json({ ok: true, fired: 0 });

          // Group by user to fetch locations + prefs once.
          const userIds = Array.from(new Set(thresholds.map((t: any) => t.user_id)));
          const [{ data: locs }, { data: prefs }] = await Promise.all([
            supabaseAdmin.from("saved_locations").select("id, user_id, lat, lon, label, is_home").in("user_id", userIds),
            supabaseAdmin.from("user_preferences").select("user_id, home_lat, home_lon, home_label").in("user_id", userIds),
          ]);

          let fired = 0;
          const now = Date.now();
          for (const t of thresholds) {
            const lastFired = t.last_fired_at ? new Date(t.last_fired_at).getTime() : 0;
            if (now - lastFired < 60 * 60 * 1000) continue;
            // Resolve location
            let lat: number | null = null;
            let lon: number | null = null;
            let label = "your area";
            if (t.location_id) {
              const l = locs?.find((x: any) => x.id === t.location_id);
              if (l) { lat = l.lat; lon = l.lon; label = l.label; }
            }
            if (lat == null) {
              const p = prefs?.find((x: any) => x.user_id === t.user_id);
              if (p?.home_lat && p?.home_lon) { lat = p.home_lat; lon = p.home_lon; label = p.home_label || label; }
            }
            if (lat == null || lon == null) continue;

            try {
              const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_gusts_10m,relative_humidity_2m,surface_pressure,precipitation,uv_index&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`;
              const r = await fetch(url);
              if (!r.ok) continue;
              const json: any = await r.json();
              const c = json.current ?? {};
              const v: number | undefined =
                t.metric === "temp_f" ? c.temperature_2m :
                t.metric === "wind_mph" ? c.wind_speed_10m :
                t.metric === "gust_mph" ? c.wind_gusts_10m :
                t.metric === "precip_in" ? c.precipitation :
                t.metric === "humidity" ? c.relative_humidity_2m :
                t.metric === "pressure_mb" ? c.surface_pressure :
                t.metric === "uv" ? c.uv_index : undefined;
              if (v == null || Number.isNaN(v)) continue;
              const target = Number(t.value);
              const met =
                t.op === ">" ? v > target :
                t.op === "<" ? v < target :
                t.op === ">=" ? v >= target :
                t.op === "<=" ? v <= target :
                Math.abs(v - target) < 0.01;
              if (!met) continue;

              const { data: subs } = await supabaseAdmin
                .from("push_subscriptions")
                .select("endpoint, p256dh, auth")
                .eq("user_id", t.user_id);
              if (subs && subs.length) {
                const niceMetric = t.metric.replace("_", " ");
                await sendPushNotifications(subs as any, {
                  title: t.label || `${niceMetric} threshold`,
                  body: `${label}: ${niceMetric} is ${Math.round(v * 10) / 10} (${t.op} ${target}).`,
                  url: "/",
                  tag: `mwa-thr-${t.id}`,
                  severity: "moderate",
                });
                fired++;
              }
              await supabaseAdmin
                .from("alert_thresholds")
                .update({ last_fired_at: new Date().toISOString() })
                .eq("id", t.id);
            } catch (e) {
              console.error("[thresholds]", e);
            }
          }
          return Response.json({ ok: true, fired });
        } catch (e) {
          return Response.json({ ok: false, error: String(e) }, { status: 500 });
        }
      },
    },
  },
});
