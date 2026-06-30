import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MapPin, Bell, LogOut, Save, Search, Palette, Sun, Moon, Settings2, Cloud, Crosshair, Calendar, BarChart3, Users, Activity, Zap, Trophy, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { getMyProfile, updateMyProfile } from "@/lib/profile.functions";
import { MICHIGAN_CITIES } from "@/lib/michigan-cities";
import { NWS_ALERT_TYPES } from "@/lib/nws-alert-types";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { THEMES, MODES, applyTheme, getTheme, getMode, type ThemeName, type ThemeMode } from "@/lib/theme";
import { usePrefs } from "@/lib/prefs";
import { MfaManager } from "@/components/MfaManager";
import { sendTestPushToMe } from "@/lib/test-push.functions";
import { getMyPreferences, updateMyPreferences } from "@/lib/preferences.functions";
import { useIsAdmin } from "@/hooks/useIsAdmin";



export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — MWA" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const saveProfile = useServerFn(updateMyProfile);

  const profile = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const save = useMutation({
    mutationFn: (data: any) => saveProfile({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [searchHome, setSearchHome] = useState("");
  const [searchWork, setSearchWork] = useState("");
  const [form, setForm] = useState({
    display_name: "",
    home_zip: "",
    home_city: "",
    home_lat: null as number | null,
    home_lon: null as number | null,
    work_zip: "",
    work_city: "",
    work_lat: null as number | null,
    work_lon: null as number | null,
    notify_alerts: true,
    notify_forecast: false,
    notify_hourly_forecast: false,
    notify_marine: false,
    notify_eas: true,
    notify_only_my_area: true,
    notify_categories: ["warning", "watch", "advisory", "statement"] as Array<"warning" | "watch" | "advisory" | "statement">,
    notify_event_types: [] as string[],
    min_severity: "moderate" as "extreme" | "severe" | "moderate" | "minor",
  });

  useEffect(() => {
    if (profile.data) {
      const p = profile.data as any;
      setForm({
        display_name: p.display_name ?? "",
        home_zip: p.home_zip ?? "",
        home_city: p.home_city ?? "",
        home_lat: p.home_lat ?? null,
        home_lon: p.home_lon ?? null,
        work_zip: p.work_zip ?? "",
        work_city: p.work_city ?? "",
        work_lat: p.work_lat ?? null,
        work_lon: p.work_lon ?? null,
        notify_alerts: !!p.notify_alerts,
        notify_forecast: !!p.notify_forecast,
        notify_hourly_forecast: !!p.notify_hourly_forecast,
        notify_marine: !!p.notify_marine,
        notify_eas: p.notify_eas ?? true,
        notify_only_my_area: p.notify_only_my_area ?? true,
        notify_categories: (p.notify_categories ?? ["warning", "watch", "advisory", "statement"]) as any,
        notify_event_types: (p.notify_event_types ?? []) as string[],
        min_severity: p.min_severity ?? "moderate",
      });
    }
  }, [profile.data]);

  const filteredHome = useMemo(() => filterCities(searchHome), [searchHome]);
  const filteredWork = useMemo(() => filterCities(searchWork), [searchWork]);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Link to="/" className="text-xs text-muted-foreground hover:text-accent inline-flex items-center gap-1.5 min-h-11 px-2">
          <ArrowLeft className="h-4 w-4" /> Back to MWA
        </Link>
        <Button variant="ghost" size="sm" onClick={signOut} className="min-h-11">
          <LogOut className="h-4 w-4 mr-1.5" /> Sign out
        </Button>
      </div>


      <div>
        <h1 className="font-display text-3xl tracking-tight text-glow">Your Account</h1>
        <p className="text-sm text-muted-foreground">
          {(profile.data as any)?.email ?? "Loading…"}
        </p>
      </div>

      <AppearanceSection />
      <PreferencesSection />

      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-accent">
          <MapPin className="h-4 w-4" />
          <h2 className="font-display tracking-wider uppercase text-sm">Your Locations</h2>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-mono uppercase tracking-wider">Display name</Label>
          <Input value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} />
        </div>

        <CitySearchField
          label="Home city"
          saved={form.home_city ? `${form.home_city} (${form.home_zip})` : null}
          search={searchHome}
          onSearch={setSearchHome}
          results={filteredHome}
          onPick={(c) => {
            setForm((f) => ({ ...f, home_zip: c.zip, home_city: c.name, home_lat: c.lat, home_lon: c.lon }));
            setSearchHome("");
            toast.message(`${c.name} set as home — click Save to remember it.`);
          }}
          onClear={() => setForm((f) => ({ ...f, home_zip: "", home_city: "", home_lat: null, home_lon: null }))}
        />

        <CitySearchField
          label="Work city (optional)"
          saved={form.work_city ? `${form.work_city} (${form.work_zip})` : null}
          search={searchWork}
          onSearch={setSearchWork}
          results={filteredWork}
          onPick={(c) => {
            setForm((f) => ({ ...f, work_zip: c.zip, work_city: c.name, work_lat: c.lat, work_lon: c.lon }));
            setSearchWork("");
            toast.message(`${c.name} set as work — click Save to remember it.`);
          }}
          onClear={() => setForm((f) => ({ ...f, work_zip: "", work_city: "", work_lat: null, work_lon: null }))}
        />
        <p className="text-[10px] text-muted-foreground">
          When "Only my area" is on, you get alerts for both your home and work city / county.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-accent">
          <Bell className="h-4 w-4" />
          <h2 className="font-display tracking-wider uppercase text-sm">Notifications</h2>
        </div>

        <ToggleRow
          label="Weather alerts"
          desc="Get notified the moment a watch/warning is issued for your area."
          checked={form.notify_alerts}
          onChange={(v) => setForm((f) => ({ ...f, notify_alerts: v }))}
        />
        <ToggleRow
          label="Daily forecast digest"
          desc="A morning summary for your home city with the day's outlook."
          checked={form.notify_forecast}
          onChange={(v) => setForm((f) => ({ ...f, notify_forecast: v }))}
        />
        <ToggleRow
          label="Hourly forecast pings"
          desc="A short ping at the top of each hour with the next-hour outlook."
          checked={form.notify_hourly_forecast}
          onChange={(v) => setForm((f) => ({ ...f, notify_hourly_forecast: v }))}
        />
        <ToggleRow
          label="Marine alerts (Great Lakes)"
          desc="Gale, small craft, and beach hazards for Michigan waters."
          checked={form.notify_marine}
          onChange={(v) => setForm((f) => ({ ...f, notify_marine: v }))}
        />
        <ToggleRow
          label="EAS / Emergency broadcasts"
          desc="AMBER, civil emergency, evacuation, and EAS tests on the separate EAS ticker."
          checked={form.notify_eas}
          onChange={(v) => setForm((f) => ({ ...f, notify_eas: v }))}
        />
        <ToggleRow
          label="Only my area"
          desc="Only notify when your home or work city / county is in the affected area."
          checked={form.notify_only_my_area}
          onChange={(v) => setForm((f) => ({ ...f, notify_only_my_area: v }))}
        />

        <div className="pt-2 space-y-2">
          <Label className="text-xs font-mono uppercase tracking-wider">Alert categories to notify on</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(["warning", "watch", "advisory", "statement"] as const).map((c) => {
              const on = form.notify_categories.includes(c);
              return (
                <label key={c} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm cursor-pointer hover:border-accent">
                  <Checkbox
                    checked={on}
                    onCheckedChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        notify_categories: v
                          ? Array.from(new Set([...f.notify_categories, c]))
                          : f.notify_categories.filter((x) => x !== c),
                      }))
                    }
                  />
                  <span className="capitalize">{c}s</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="pt-2 space-y-2">
          <Label className="text-xs font-mono uppercase tracking-wider">
            Specific alert products (optional — leave empty for all)
          </Label>
          <div className="max-h-56 overflow-y-auto rounded-md border border-border divide-y divide-border/60">
            {NWS_ALERT_TYPES.map((t) => {
              const on = form.notify_event_types.includes(t.name);
              return (
                <label key={t.id} className="flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer hover:bg-accent/10">
                  <Checkbox
                    checked={on}
                    onCheckedChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        notify_event_types: v
                          ? Array.from(new Set([...f.notify_event_types, t.name]))
                          : f.notify_event_types.filter((x) => x !== t.name),
                      }))
                    }
                  />
                  <span className="flex-1">{t.name}</span>
                  <span className="text-[10px] text-muted-foreground capitalize">{t.category}</span>
                </label>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Selecting one or more limits notifications to just those products. Empty = every product in your chosen categories.
          </p>
        </div>

        <div className="pt-2 space-y-2">
          <Label className="text-xs font-mono uppercase tracking-wider">Minimum severity to notify</Label>
          <RadioGroup
            value={form.min_severity}
            onValueChange={(v) => setForm((f) => ({ ...f, min_severity: v as any }))}
            className="grid grid-cols-2 sm:grid-cols-4 gap-2"
          >
            {(["minor", "moderate", "severe", "extreme"] as const).map((s) => (
              <label key={s} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm cursor-pointer hover:border-accent">
                <RadioGroupItem value={s} /> <span className="capitalize">{s}</span>
              </label>
            ))}
          </RadioGroup>
          <p className="text-[10px] text-muted-foreground">
            Notifications fire while MWA is open in any tab on this device. Make sure you've turned them on in the header.
          </p>
        </div>
      </section>

      <MfaManager />

      <CloudPrefsSection />
      <MoreSection />

      <div className="flex flex-wrap gap-2 justify-end">
        <TestPushButton />
        <Button onClick={() => save.mutate(form)} disabled={save.isPending} size="lg">
          <Save className="h-4 w-4 mr-2" /> {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
      <Toaster />
    </div>
  );
}

function TestPushButton() {
  const sendTest = useServerFn(sendTestPushToMe);
  const m = useMutation({
    mutationFn: () => sendTest(),
    onSuccess: (r: any) => {
      if (r.sent > 0) toast.success(`Sent to ${r.sent}/${r.devices} device${r.devices === 1 ? "" : "s"}`);
      else toast.warning(`No deliveries succeeded (${r.failed} failed, ${r.removed} pruned). Re-enable notifications and try again.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const localTest = async () => {
    if (!("Notification" in window)) { toast.error("Notifications not supported"); return; }
    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    if (perm !== "granted") { toast.error("Notifications blocked"); return; }
    try {
      const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null;
      const t = "MWA local test";
      const body = "Local notification (no server roundtrip).";
      if (reg) reg.showNotification(t, { body, tag: "mwa-local-test" });
      else new Notification(t, { body, tag: "mwa-local-test" });
      toast.success("Local notification fired");
    } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <div className="flex gap-2">
      <Button variant="outline" type="button" onClick={localTest} size="lg">
        <Bell className="h-4 w-4 mr-2" /> Local test
      </Button>
      <Button variant="outline" type="button" onClick={() => m.mutate()} disabled={m.isPending} size="lg">
        <Bell className="h-4 w-4 mr-2" /> {m.isPending ? "Sending…" : "Send real push to my devices"}
      </Button>
    </div>
  );
}

function CloudPrefsSection() {
  const qc = useQueryClient();
  const fetchPrefs = useServerFn(getMyPreferences);
  const updatePrefs = useServerFn(updateMyPreferences);
  const q = useQuery({ queryKey: ["cloud-prefs"], queryFn: () => fetchPrefs() });
  const m = useMutation({
    mutationFn: (data: any) => updatePrefs({ data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cloud-prefs"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const p: any = q.data ?? {};
  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2 text-accent">
        <Cloud className="h-4 w-4" />
        <h2 className="font-display tracking-wider uppercase text-sm">Cloud Preferences</h2>
        <span className="text-[10px] text-muted-foreground ml-auto">Synced across devices</span>
      </div>
      <ToggleRow
        label="Daily morning briefing push (7am ET)"
        desc="Get a daily push at 7am with today's high/low and precipitation for your home city."
        checked={!!p.daily_briefing}
        onChange={(v) => m.mutate({ daily_briefing: v })}
      />
      <div className="space-y-1.5">
        <Label className="text-xs font-mono uppercase tracking-wider">Lightning radius alerts (miles, 0 = off)</Label>
        <Input
          type="number" min={0} max={100}
          value={p.lightning_radius_mi ?? 0}
          onChange={(e) => m.mutate({ lightning_radius_mi: Math.max(0, Math.min(100, Number(e.target.value))) })}
        />
        <p className="text-[10px] text-muted-foreground">Push when lightning strikes within this radius of your home location.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-mono uppercase tracking-wider">Quiet from</Label>
          <Input type="time" value={p.quiet_start ?? ""} onChange={(e) => m.mutate({ quiet_start: e.target.value || null })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-mono uppercase tracking-wider">Quiet until</Label>
          <Input type="time" value={p.quiet_end ?? ""} onChange={(e) => m.mutate({ quiet_end: e.target.value || null })} />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">Extreme alerts always break quiet hours. Other alerts are suppressed.</p>
    </section>
  );
}

function MoreSection() {
  const { isAdmin } = useIsAdmin();
  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-3">
      <h2 className="font-display tracking-wider uppercase text-sm text-accent">More</h2>
      <div className="grid sm:grid-cols-2 gap-2">
        <NavTile to="/locations" icon={Crosshair} label="Saved locations" desc="Home + favorites" />
        <NavTile to="/thresholds" icon={Zap} label="Custom thresholds" desc="Notify on temp/wind/etc" />
        <NavTile to="/reports" icon={Trophy} label="Spotter reports" desc="Community storm feed" />
        <NavTile to="/spotter" icon={Camera} label="Submit a report" desc="Log a sighting" />
        <NavTile to="/chase" icon={Activity} label="Storm chase mode" desc="Full-screen dashboard" />
        {isAdmin && (
          <>
            <NavTile to="/admin-analytics" icon={BarChart3} label="Admin · Analytics" desc="Usage + delivery" />
            <NavTile to="/admin-scheduler" icon={Calendar} label="Admin · Scheduler" desc="Queue alerts" />
            <NavTile to="/admin-audit" icon={Activity} label="Admin · Audit log" desc="Action history" />
            <NavTile to="/admin-subscribers" icon={Users} label="Admin · Subscribers" desc="Push devices" />
          </>
        )}
      </div>
    </section>
  );
}
function NavTile({ to, icon: Icon, label, desc }: any) {
  return (
    <Link to={to} className="rounded-lg border border-border p-3 hover:border-accent transition-colors flex items-start gap-3">
      <div className="h-9 w-9 rounded-md bg-accent/10 grid place-items-center shrink-0">
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
    </Link>
  );
}


function filterCities(q: string) {
  if (!q.trim()) return [];
  const term = q.toLowerCase();
  return MICHIGAN_CITIES.filter((c) =>
    (c.name + " " + c.county + " " + c.zip).toLowerCase().includes(term),
  ).slice(0, 8);
}

function CitySearchField({
  label, saved, search, onSearch, results, onPick, onClear,
}: {
  label: string;
  saved: string | null;
  search: string;
  onSearch: (v: string) => void;
  results: ReturnType<typeof filterCities>;
  onPick: (c: ReturnType<typeof filterCities>[number]) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-mono uppercase tracking-wider">{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={saved ?? "— none selected —"} />
        {saved && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>Clear</Button>
        )}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Type a Michigan city, ZIP, or county…"
          className="pl-9"
        />
      </div>
      {results.length > 0 && (
        <div className="rounded-md border border-border bg-popover divide-y divide-border/60 max-h-64 overflow-y-auto">
          {results.map((c) => (
            <button
              key={c.zip}
              type="button"
              onClick={() => onPick(c)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent/10 flex justify-between gap-2"
            >
              <span className="flex items-center gap-2"><MapPin className="h-3 w-3 text-muted-foreground" />{c.name}</span>
              <span className="text-[10px] font-mono text-muted-foreground">{c.county} · {c.zip}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function AppearanceSection() {
  const [theme, setThemeState] = useState<ThemeName>("noir");
  const [mode, setModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    setThemeState(getTheme());
    setModeState(getMode());
  }, []);

  const update = (t: ThemeName, m: ThemeMode) => {
    setThemeState(t);
    setModeState(m);
    applyTheme(t, m);
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-center gap-2 text-accent">
        <Palette className="h-4 w-4" />
        <h2 className="font-display tracking-wider uppercase text-sm">Appearance</h2>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-mono uppercase tracking-wider">Design</Label>
        <div className="grid sm:grid-cols-3 gap-2">
          {THEMES.map((t) => {
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => update(t.id, mode)}
                className={`text-left rounded-lg border p-3 transition-colors ${
                  active
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/60"
                }`}
              >
                <div className="font-display text-lg leading-tight">{t.label}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{t.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-mono uppercase tracking-wider">Mode</Label>
        <div className="grid grid-cols-2 gap-2 max-w-xs">
          {MODES.map((m) => {
            const active = mode === m.id;
            const Icon = m.id === "light" ? Sun : Moon;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => update(theme, m.id)}
                className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  active
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border hover:border-accent/60"
                }`}
              >
                <Icon className="h-4 w-4" /> {m.label}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Saved to this device. Applies instantly across MWA.
        </p>
      </div>
    </section>
  );
}

function PreferencesSection() {
  const [prefs, patch] = usePrefs();

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-center gap-2 text-accent">
        <Settings2 className="h-4 w-4" />
        <h2 className="font-display tracking-wider uppercase text-sm">Preferences</h2>
      </div>

      <PrefRow label="Temperature">
        <SegGroup
          value={prefs.tempUnit}
          options={[{ v: "F", l: "°F" }, { v: "C", l: "°C" }]}
          onChange={(v) => patch({ tempUnit: v as any })}
        />
      </PrefRow>

      <PrefRow label="Wind speed">
        <SegGroup
          value={prefs.windUnit}
          options={[{ v: "mph", l: "mph" }, { v: "kph", l: "kph" }, { v: "knots", l: "kt" }]}
          onChange={(v) => patch({ windUnit: v as any })}
        />
      </PrefRow>

      <PrefRow label="Pressure">
        <SegGroup
          value={prefs.pressureUnit}
          options={[{ v: "inHg", l: "inHg" }, { v: "mb", l: "mb" }]}
          onChange={(v) => patch({ pressureUnit: v as any })}
        />
      </PrefRow>

      <PrefRow label="Clock">
        <SegGroup
          value={prefs.show24Hour ? "24" : "12"}
          options={[{ v: "12", l: "12-hour" }, { v: "24", l: "24-hour" }]}
          onChange={(v) => patch({ show24Hour: v === "24" })}
        />
      </PrefRow>

      <PrefRow label="Density">
        <SegGroup
          value={prefs.density}
          options={[{ v: "comfortable", l: "Comfortable" }, { v: "compact", l: "Compact" }]}
          onChange={(v) => patch({ density: v as any })}
        />
      </PrefRow>

      <PrefRow label="Ticker speed">
        <SegGroup
          value={prefs.tickerSpeed}
          options={[
            { v: "off", l: "Off" },
            { v: "slow", l: "Slow" },
            { v: "normal", l: "Normal" },
            { v: "fast", l: "Fast" },
          ]}
          onChange={(v) => patch({ tickerSpeed: v as any })}
        />
      </PrefRow>

      <PrefRow label="Auto-refresh">
        <SegGroup
          value={String(prefs.autoRefreshMin)}
          options={[
            { v: "0", l: "Off" },
            { v: "1", l: "1m" },
            { v: "5", l: "5m" },
            { v: "15", l: "15m" },
          ]}
          onChange={(v) => patch({ autoRefreshMin: Number(v) })}
        />
      </PrefRow>

      <div className="pt-2 space-y-3">
        <Label className="text-xs font-mono uppercase tracking-wider">Home page panels</Label>
        <ToggleRow
          label="Show radar"
          desc="Display the live radar panel on the home page."
          checked={prefs.showRadarOnHome}
          onChange={(v) => patch({ showRadarOnHome: v })}
        />
        <ToggleRow
          label="Show hourly meteogram"
          desc="Show the 36-hour temperature and precipitation chart."
          checked={prefs.showMeteogramOnHome}
          onChange={(v) => patch({ showMeteogramOnHome: v })}
        />
        <ToggleRow
          label="Show alert history"
          desc="Show the last 30 days of Michigan alerts on the home page."
          checked={prefs.showAlertHistoryOnHome}
          onChange={(v) => patch({ showAlertHistoryOnHome: v })}
        />
        <ToggleRow
          label="Reduce motion"
          desc="Pause tickers, sweeps, and aurora animations."
          checked={prefs.reduceMotion}
          onChange={(v) => patch({ reduceMotion: v })}
        />
      </div>

      <div className="pt-4 border-t border-border/60 space-y-4">
        <Label className="text-xs font-mono uppercase tracking-wider">Liquid Glass</Label>
        <PrefRow label="Glass intensity">
          <SegGroup
            value={prefs.glassIntensity}
            options={[{ v: "low", l: "Subtle" }, { v: "med", l: "Default" }, { v: "high", l: "Heavy" }]}
            onChange={(v) => patch({ glassIntensity: v as any })}
          />
        </PrefRow>
        <PrefRow label="Compact navigation">
          <Switch checked={prefs.compactNav} onCheckedChange={(v) => patch({ compactNav: v })} />
        </PrefRow>
      </div>

      <div className="pt-4 border-t border-border/60 space-y-4">
        <Label className="text-xs font-mono uppercase tracking-wider">Alert sounds &amp; haptics</Label>
        <PrefRow label="Warning tone">
          <SegGroup
            value={prefs.toneWarning}
            options={[{ v: "siren", l: "Siren" }, { v: "chime", l: "Chime" }, { v: "blip", l: "Blip" }, { v: "duck", l: "Duck" }, { v: "off", l: "Off" }]}
            onChange={(v) => { patch({ toneWarning: v as any }); import("@/lib/prefs").then((m) => m.playTone(v as any)); }}
          />
        </PrefRow>
        <PrefRow label="EAS tone">
          <SegGroup
            value={prefs.toneEAS}
            options={[{ v: "chime", l: "Chime" }, { v: "siren", l: "Siren" }, { v: "blip", l: "Blip" }, { v: "off", l: "Off" }]}
            onChange={(v) => { patch({ toneEAS: v as any }); import("@/lib/prefs").then((m) => m.playTone(v as any)); }}
          />
        </PrefRow>
        <PrefRow label="Test tone">
          <SegGroup
            value={prefs.toneTest}
            options={[{ v: "blip", l: "Blip" }, { v: "chime", l: "Chime" }, { v: "duck", l: "Duck" }, { v: "off", l: "Off" }]}
            onChange={(v) => { patch({ toneTest: v as any }); import("@/lib/prefs").then((m) => m.playTone(v as any)); }}
          />
        </PrefRow>
        <PrefRow label="Haptics (mobile)">
          <Switch checked={prefs.hapticsOn} onCheckedChange={(v) => patch({ hapticsOn: v })} />
        </PrefRow>
      </div>

      <div className="pt-4 border-t border-border/60 space-y-4">
        <Label className="text-xs font-mono uppercase tracking-wider">Quiet hours</Label>
        <PrefRow label="Enable quiet hours">
          <Switch checked={prefs.quiet.enabled} onCheckedChange={(v) => patch({ quiet: { ...prefs.quiet, enabled: v } })} />
        </PrefRow>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-mono uppercase tracking-wider">From</Label>
            <Input type="time" value={prefs.quiet.start} onChange={(e) => patch({ quiet: { ...prefs.quiet, start: e.target.value } })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-mono uppercase tracking-wider">Until</Label>
            <Input type="time" value={prefs.quiet.end} onChange={(e) => patch({ quiet: { ...prefs.quiet, end: e.target.value } })} />
          </div>
        </div>
        <PrefRow label="Allow extreme alerts to break quiet hours">
          <Switch checked={prefs.quiet.allowExtreme} onCheckedChange={(v) => patch({ quiet: { ...prefs.quiet, allowExtreme: v } })} />
        </PrefRow>
      </div>

      <div className="pt-4 border-t border-border/60 space-y-4">
        <Label className="text-xs font-mono uppercase tracking-wider">Data</Label>
        <PrefRow label="Refresh interval (seconds)">
          <SegGroup
            value={String(prefs.dataRefreshSec)}
            options={[{ v: "0", l: "Auto" }, { v: "30", l: "30s" }, { v: "60", l: "1m" }, { v: "120", l: "2m" }, { v: "300", l: "5m" }]}
            onChange={(v) => patch({ dataRefreshSec: Number(v) })}
          />
        </PrefRow>
        <PrefRow label="Show storm reports banner">
          <Switch checked={prefs.showStormReportsBanner} onCheckedChange={(v) => patch({ showStormReportsBanner: v })} />
        </PrefRow>
        <PrefRow label="Enable experimental features">
          <Switch checked={prefs.experimentalFeatures} onCheckedChange={(v) => patch({ experimentalFeatures: v })} />
        </PrefRow>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Preferences are saved to this device only. They apply instantly across MWA.
      </p>
    </section>
  );
}

function PrefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Label className="text-xs font-mono uppercase tracking-wider">{label}</Label>
      <div>{children}</div>
    </div>
  );
}

function SegGroup({
  value, options, onChange,
}: {
  value: string;
  options: { v: string; l: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-border bg-storm/60 p-1">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={
            "px-3 py-1 text-[11px] font-mono uppercase tracking-wider rounded-full transition-colors " +
            (value === o.v ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")
          }
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}
