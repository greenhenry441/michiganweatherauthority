// Unit tests for filterTargets. These pin down the "only my area" contract
// for EAS + weather alerts: county overlap, statewide pass-through, severity
// floor, quiet hours, and the extreme-severity override that bypasses quiet
// hours but still respects the county gate.
import { describe, it, expect } from "vitest";
import { filterTargets, type PushSubRow } from "@/lib/push-targeting.server";

type Pref = {
  user_id: string;
  notify_severity?: string[] | null;
  notify_counties?: string[] | null;
  notify_types?: string[] | null;
  quiet_start?: string | null;
  quiet_end?: string | null;
};

// Minimal Supabase stub. The function only calls
// `supabase.from('user_preferences').select(...).in('user_id', ids)`.
function makeSupabase(prefs: Pref[]) {
  return {
    from(_table: string) {
      return {
        select(_cols: string) {
          return {
            in(_col: string, ids: string[]) {
              return Promise.resolve({ data: prefs.filter((p) => ids.includes(p.user_id)) });
            },
          };
        },
      };
    },
  };
}

const sub = (user_id: string, extras: Partial<PushSubRow> = {}): PushSubRow => ({
  endpoint: `https://push/${user_id}`,
  p256dh: "x",
  auth: "y",
  user_id,
  min_severity: "moderate",
  ...extras,
});

describe("filterTargets", () => {
  it("drops users whose min_severity floor is above the alert", async () => {
    const subs = [sub("a", { min_severity: "extreme" }), sub("b", { min_severity: "minor" })];
    const out = await filterTargets(makeSupabase([]) as any, subs, {
      severity: "severe", areas: ["Statewide"],
    });
    expect(out.map((s) => s.user_id)).toEqual(["b"]);
  });

  it("only delivers EAS county alerts to users in that county", async () => {
    const subs = [sub("inCounty"), sub("outCounty"), sub("noPrefs")];
    const prefs: Pref[] = [
      { user_id: "inCounty", notify_counties: ["Wayne"] },
      { user_id: "outCounty", notify_counties: ["Kent"] },
    ];
    const out = await filterTargets(makeSupabase(prefs) as any, subs, {
      severity: "severe", areas: ["Wayne"], kind: "eas",
    });
    // noPrefs has no row → pass-through. outCounty filtered. inCounty matches.
    expect(out.map((s) => s.user_id).sort()).toEqual(["inCounty", "noPrefs"]);
  });

  it("statewide alerts pass through the county gate", async () => {
    const subs = [sub("a")];
    const prefs: Pref[] = [{ user_id: "a", notify_counties: ["Kent"] }];
    const out = await filterTargets(makeSupabase(prefs) as any, subs, {
      severity: "severe", areas: ["Statewide"],
    });
    expect(out).toHaveLength(1);
  });

  it("respects quiet hours for non-extreme alerts", async () => {
    const subs = [sub("a")];
    // Build a window that always includes "now" (UTC) by anchoring to current minute.
    const now = new Date();
    const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
    const fmt = (m: number) => {
      const mm = ((m % 1440) + 1440) % 1440;
      return `${String(Math.floor(mm / 60)).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`;
    };
    const prefs: Pref[] = [{ user_id: "a", quiet_start: fmt(mins - 30), quiet_end: fmt(mins + 30) }];
    const supa = makeSupabase(prefs);
    const muted = await filterTargets(supa as any, subs, { severity: "severe", areas: ["Statewide"] });
    expect(muted).toHaveLength(0);
    // Extreme always punches through quiet hours.
    const wakeUp = await filterTargets(supa as any, subs, { severity: "extreme", areas: ["Statewide"] });
    expect(wakeUp).toHaveLength(1);
  });

  it("drops users whose notify_severity excludes this severity", async () => {
    const subs = [sub("a")];
    const prefs: Pref[] = [{ user_id: "a", notify_severity: ["extreme"] }];
    const out = await filterTargets(makeSupabase(prefs) as any, subs, {
      severity: "severe", areas: ["Statewide"],
    });
    expect(out).toHaveLength(0);
  });

  it("respects notify_types when the alert has a typeId", async () => {
    const subs = [sub("a"), sub("b")];
    const prefs: Pref[] = [
      { user_id: "a", notify_types: ["tornado-warning"] },
      { user_id: "b", notify_types: ["flood-warning"] },
    ];
    const out = await filterTargets(makeSupabase(prefs) as any, subs, {
      severity: "severe", areas: ["Statewide"], typeId: "tornado-warning",
    });
    expect(out.map((s) => s.user_id)).toEqual(["a"]);
  });
});
