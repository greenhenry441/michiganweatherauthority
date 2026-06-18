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

  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    display_name: "",
    home_zip: "",
    home_city: "",
    home_lat: null as number | null,
    home_lon: null as number | null,
    notify_alerts: true,
    notify_forecast: false,
    notify_marine: false,
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
        notify_alerts: !!p.notify_alerts,
        notify_forecast: !!p.notify_forecast,
        notify_marine: !!p.notify_marine,
        min_severity: p.min_severity ?? "moderate",
      });
    }
  }, [profile.data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return MICHIGAN_CITIES.filter((c) =>
      (c.name + " " + c.county + " " + c.zip).toLowerCase().includes(q),
    ).slice(0, 8);
  }, [search]);

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
          <h2 className="font-display tracking-wider uppercase text-sm">Home Location</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-mono uppercase tracking-wider">Display name</Label>
            <Input value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-mono uppercase tracking-wider">Saved city</Label>
            <Input readOnly value={form.home_city ? `${form.home_city} (${form.home_zip})` : "— none selected —"} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-mono uppercase tracking-wider">Search & set your home city</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type a Michigan city, ZIP, or county…"
              className="pl-9"
            />
          </div>
          {filtered.length > 0 && (
            <div className="rounded-md border border-border bg-popover divide-y divide-border/60 max-h-64 overflow-y-auto">
              {filtered.map((c) => (
                <button
                  key={c.zip}
                  type="button"
                  onClick={() => {
                    setForm((f) => ({ ...f, home_zip: c.zip, home_city: c.name, home_lat: c.lat, home_lon: c.lon }));
                    setSearch("");
                    toast.message(`${c.name} selected — click Save to remember it.`);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent/10 flex justify-between gap-2"
                >
                  <span className="flex items-center gap-2"><MapPin className="h-3 w-3 text-muted-foreground" />{c.name}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{c.county} · {c.zip}</span>
                </button>
              ))}
            </div>
          )}
        </div>
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
          label="Marine alerts (Great Lakes)"
          desc="Gale, small craft, and beach hazards for Michigan waters."
          checked={form.notify_marine}
          onChange={(v) => setForm((f) => ({ ...f, notify_marine: v }))}
        />

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
            Browser push delivery coming soon — your preferences are stored now and used as soon as it's enabled.
          </p>
        </div>
      </section>

      <div className="flex gap-2 justify-end">
        <Button onClick={() => save.mutate(form)} disabled={save.isPending} size="lg">
          <Save className="h-4 w-4 mr-2" /> {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
      <Toaster />
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
