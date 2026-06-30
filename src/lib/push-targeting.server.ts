// Shared push-targeting filter. Applies per-user preferences (severity,
// counties, alert types, quiet hours) to a set of push subscriptions so that
// every dispatch path — instant issue, scheduled dispatcher, future cron —
// honors the same "only my area" rules. EAS alerts are filtered identically
// to weather alerts; the only carve-out is `severity === "extreme"`, which
// bypasses quiet hours but still respects county / type filters.

const SEV_RANK: Record<string, number> = { minor: 1, moderate: 2, severe: 3, extreme: 4 };

export type AlertForTargeting = {
  severity: string;
  areas: string[];
  typeId?: string | null;
  kind?: string;
};

export type PushSubRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
  min_severity?: string | null;
  user_id?: string | null;
};

export async function filterTargets(
  supabaseAdmin: any,
  subs: PushSubRow[],
  alert: AlertForTargeting,
): Promise<PushSubRow[]> {
  if (!subs.length) return [];
  const sev = SEV_RANK[alert.severity] ?? 2;
  const userIds = Array.from(new Set(subs.map((s) => s.user_id).filter(Boolean) as string[]));
  const { data: prefRows } = userIds.length
    ? await supabaseAdmin
        .from("user_preferences")
        .select("user_id, notify_severity, notify_counties, notify_types, quiet_start, quiet_end")
        .in("user_id", userIds)
    : { data: [] as any[] };
  const prefsMap = new Map<string, any>(((prefRows as any[]) ?? []).map((p) => [p.user_id, p]));
  const areas = alert.areas?.length ? alert.areas : [];
  const isStatewide = areas.length === 0 || areas.some((a) => /statewide/i.test(a));

  return subs.filter((s) => {
    if ((SEV_RANK[s.min_severity ?? "moderate"] ?? 2) > sev) return false;
    const p = s.user_id ? prefsMap.get(s.user_id) : null;
    if (!p) return true;
    if (p.notify_severity?.length && !p.notify_severity.includes(alert.severity)) return false;
    // County gate — applies to EAS, weather, scheduled, all kinds. Statewide
    // alerts pass through (user is in MI either way); targeted alerts must
    // overlap the user's chosen counties when they've configured any.
    if (p.notify_counties?.length && !isStatewide) {
      if (!areas.some((a) => p.notify_counties.includes(a))) return false;
    }
    if (p.notify_types?.length && alert.typeId && !p.notify_types.includes(alert.typeId)) return false;
    if (alert.severity !== "extreme" && p.quiet_start && p.quiet_end) {
      const now = new Date();
      const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
      const [sh, sm] = String(p.quiet_start).split(":").map(Number);
      const [eh, em] = String(p.quiet_end).split(":").map(Number);
      const start = sh * 60 + sm; const end = eh * 60 + em;
      const inQuiet = start <= end ? mins >= start && mins < end : mins >= start || mins < end;
      if (inQuiet) return false;
    }
    return true;
  });
}
