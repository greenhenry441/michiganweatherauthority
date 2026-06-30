// Nightly dispatcher self-test. Exercises filterTargets against synthetic
// subscriber/preference fixtures and writes a pass/fail row to
// dispatcher_test_runs so admins can see a green/red history.
//
// Safe to invoke ad-hoc from the admin UI as well — does NOT touch real
// push_subscriptions, alerts, or send any actual push. Stateless except for
// the audit row it inserts.
import { createFileRoute } from "@tanstack/react-router";

type Scenario = { name: string; ok: boolean; detail?: string };

async function runScenarios(): Promise<Scenario[]> {
  const { filterTargets } = await import("@/lib/push-targeting.server");
  const sub = (user_id: string, min_severity = "moderate") => ({
    endpoint: `https://t/${user_id}`, p256dh: "x", auth: "y", user_id, min_severity,
  });
  const supa = (prefs: any[]) => ({
    from: () => ({ select: () => ({ in: (_c: string, ids: string[]) =>
      Promise.resolve({ data: prefs.filter((p) => ids.includes(p.user_id)) }),
    }) }),
  });

  const out: Scenario[] = [];
  const check = (name: string, ok: boolean, detail?: string) =>
    out.push({ name, ok, detail: ok ? undefined : detail });

  // 1. County gate filters out-of-area subscribers on EAS alerts.
  {
    const t = await filterTargets(
      supa([
        { user_id: "in", notify_counties: ["Wayne"] },
        { user_id: "out", notify_counties: ["Kent"] },
      ]) as any,
      [sub("in"), sub("out")],
      { severity: "severe", areas: ["Wayne"], kind: "eas" },
    );
    check("eas-county-gate", t.length === 1 && t[0].user_id === "in",
      `got ${t.map((x) => x.user_id).join(",")}`);
  }
  // 2. Statewide alerts pass through the county gate.
  {
    const t = await filterTargets(
      supa([{ user_id: "a", notify_counties: ["Kent"] }]) as any,
      [sub("a")],
      { severity: "severe", areas: ["Statewide"] },
    );
    check("statewide-passthrough", t.length === 1);
  }
  // 3. Severity floor on the subscription is honored.
  {
    const t = await filterTargets(
      supa([]) as any,
      [sub("a", "extreme"), sub("b", "minor")],
      { severity: "severe", areas: ["Statewide"] },
    );
    check("severity-floor", t.length === 1 && t[0].user_id === "b");
  }
  // 4. Extreme severity overrides quiet hours but still respects county gate.
  {
    const now = new Date();
    const m = now.getUTCHours() * 60 + now.getUTCMinutes();
    const fmt = (x: number) => {
      const mm = ((x % 1440) + 1440) % 1440;
      return `${String(Math.floor(mm / 60)).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`;
    };
    const prefs = [{ user_id: "a", quiet_start: fmt(m - 30), quiet_end: fmt(m + 30) }];
    const muted = await filterTargets(supa(prefs) as any, [sub("a")],
      { severity: "severe", areas: ["Statewide"] });
    const wake = await filterTargets(supa(prefs) as any, [sub("a")],
      { severity: "extreme", areas: ["Statewide"] });
    check("extreme-overrides-quiet", muted.length === 0 && wake.length === 1);
  }
  // 5. notify_types narrows by typeId.
  {
    const t = await filterTargets(
      supa([
        { user_id: "a", notify_types: ["tornado-warning"] },
        { user_id: "b", notify_types: ["flood-warning"] },
      ]) as any,
      [sub("a"), sub("b")],
      { severity: "severe", areas: ["Statewide"], typeId: "tornado-warning" },
    );
    check("type-filter", t.length === 1 && t[0].user_id === "a");
  }

  return out;
}

export const Route = createFileRoute("/api/public/cron/dispatcher-self-test")({
  server: {
    handlers: {
      POST: async () => {
        const started = Date.now();
        let scenarios: Scenario[] = [];
        let err: string | null = null;
        try {
          scenarios = await runScenarios();
        } catch (e) {
          err = String(e).slice(0, 500);
        }
        const passed = scenarios.filter((s) => s.ok).length;
        const failed = scenarios.length - passed;
        const ok = !err && failed === 0 && scenarios.length > 0;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("dispatcher_test_runs").insert({
            source: "cron",
            ok,
            total: scenarios.length,
            passed,
            failed,
            duration_ms: Date.now() - started,
            details: scenarios,
            error: err,
          });
        } catch (logErr) {
          console.error("[self-test] log failed", logErr);
        }
        return Response.json({ ok, passed, failed, scenarios, error: err });
      },
      // GET surfaces the same result for manual admin use — useful for "run now".
      GET: async () => {
        const started = Date.now();
        const scenarios = await runScenarios().catch(() => []);
        return Response.json({
          ok: scenarios.length > 0 && scenarios.every((s) => s.ok),
          passed: scenarios.filter((s) => s.ok).length,
          failed: scenarios.filter((s) => !s.ok).length,
          duration_ms: Date.now() - started,
          scenarios,
        });
      },
    },
  },
});
