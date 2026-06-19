import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MapPin, Bell, LogOut, Save, Search } from "lucide-react";
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
      <div className="flex items-center justify-between">
        <Link to="/" className="text-xs text-muted-foreground hover:text-accent inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Back to MWA
        </Link>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign out
        </Button>
      </div>

      <div>
        <h1 className="font-display text-3xl tracking-tight text-glow">Your Account</h1>
        <p className="text-sm text-muted-foreground">
          {(profile.data as any)?.email ?? "Loading…"}
        </p>
      </div>

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

      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="outline" type="button" onClick={testNotification} size="lg">
          <Bell className="h-4 w-4 mr-2" /> Send test notification
        </Button>
      </div>
      <Toaster />
    </div>
  );
}

async function testNotification() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    toast.error("Your browser doesn't support notifications");
    return;
  }
  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  if (perm !== "granted") {
    toast.error("Notifications are blocked by your browser");
    return;
  }
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null;
    const title = "MWA test notification";
    const body = "If you can read this, your device is set up for MWA alerts.";
    if (reg) reg.showNotification(title, { body, tag: "mwa-test", data: { url: "/" } });
    else new Notification(title, { body, tag: "mwa-test" });
    toast.success("Test notification sent");
  } catch (e) {
    toast.error((e as Error).message);
  }
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
