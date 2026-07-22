import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2, Thermometer, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const thresholdSchema = z.object({
  metric: z.enum(["temp_f", "wind_mph", "gust_mph", "precip_in", "humidity", "uv", "pressure_mb"]),
  op: z.enum([">", "<", ">=", "<=", "="]),
  value: z.number(),
  label: z.string().max(120).nullable().optional(),
  location_id: z.string().uuid().nullable().optional(),
  enabled: z.boolean().optional(),
});

const listThresholds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("alert_thresholds").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
const addThreshold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => thresholdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("alert_thresholds").insert({ user_id: context.userId, ...data }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });
const removeThreshold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("alert_thresholds").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
const toggleThreshold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("alert_thresholds").update({ enabled: data.enabled }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const Route = createFileRoute("/thresholds")({
  head: () => ({ meta: [{ title: "Custom alert thresholds — MWA" }, { name: "robots", content: "noindex" }] }),
  component: ThresholdsPage,
});

type MetricDef = {
  id: string;
  label: string;
  short: string;
  unit: string;
  tip: string;
  suggested: { op: string; value: number; note: string }[];
};

const METRICS: MetricDef[] = [
  { id: "temp_f",     label: "Temperature (°F)",   short: "Temperature",  unit: "°F",  tip: "Air temperature at your home city. Ping when it crosses a threshold — great for freeze/heat alerts.",
    suggested: [ { op: "<=", value: 32, note: "Freeze warning" }, { op: ">=", value: 90, note: "Heat advisory" }, { op: "<=", value: 0, note: "Extreme cold" } ] },
  { id: "wind_mph",   label: "Wind speed (mph)",   short: "Sustained wind", unit: "mph", tip: "Sustained wind speed (1-minute average). Not the same as gusts — pick 'gust' for peak spikes.",
    suggested: [ { op: ">=", value: 30, note: "Breezy" }, { op: ">=", value: 45, note: "High-wind advisory range" } ] },
  { id: "gust_mph",   label: "Wind gust (mph)",    short: "Wind gust",     unit: "mph", tip: "Peak wind gust in the last hour. Damaging wind starts around 58 mph (severe thunderstorm criteria).",
    suggested: [ { op: ">=", value: 50, note: "Downed branches likely" }, { op: ">=", value: 58, note: "Severe criteria" } ] },
  { id: "precip_in",  label: "Precipitation (in)", short: "Precip / hour", unit: "in",  tip: "Liquid precipitation in the last hour. Flash flood guidance is often 1–2 in/hr depending on terrain.",
    suggested: [ { op: ">=", value: 0.5, note: "Heavy rain" }, { op: ">=", value: 1, note: "Flash flood risk" } ] },
  { id: "humidity",   label: "Humidity (%)",       short: "Humidity",      unit: "%",   tip: "Relative humidity. Below 30% dries fuels for fire weather; above 70% amplifies heat index.",
    suggested: [ { op: "<=", value: 25, note: "Fire-weather dry" }, { op: ">=", value: 80, note: "Muggy" } ] },
  { id: "uv",         label: "UV index",           short: "UV index",      unit: "",    tip: "0–11+ scale. 6+ is high, 8+ very high, 11+ extreme — sunscreen and shade strongly recommended.",
    suggested: [ { op: ">=", value: 6, note: "High UV" }, { op: ">=", value: 8, note: "Very high UV" } ] },
  { id: "pressure_mb",label: "Pressure (mb)",      short: "Pressure",      unit: "mb",  tip: "Sea-level pressure. Rapid drops (< 1000 mb, or > 3 mb/hr fall) often precede storms.",
    suggested: [ { op: "<=", value: 1000, note: "Storm approaching" }, { op: ">=", value: 1030, note: "Strong high" } ] },
];

const METRIC_MAP: Record<string, MetricDef> = Object.fromEntries(METRICS.map((m) => [m.id, m]));

const OP_TIPS: Record<string, string> = {
  ">":  "Trigger when the measured value is strictly greater than your threshold.",
  "<":  "Trigger when the measured value is strictly less than your threshold.",
  ">=": "Trigger when the value reaches or exceeds your threshold.",
  "<=": "Trigger when the value drops to or below your threshold.",
  "=":  "Trigger when the value equals your threshold exactly (rarely useful for continuous metrics).",
};

function ThresholdsPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listThresholds);
  const add = useServerFn(addThreshold);
  const rem = useServerFn(removeThreshold);
  const tog = useServerFn(toggleThreshold);

  const list = useQuery({ queryKey: ["thresholds"], queryFn: () => fetchList() });
  const [form, setForm] = useState({ metric: "wind_mph", op: ">", value: 50, label: "" });

  const addMut = useMutation({
    mutationFn: () => add({ data: { ...form, value: Number(form.value), label: form.label || null } as any }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["thresholds"] }); toast.success("Added"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Link to="/settings" className="text-xs text-muted-foreground hover:text-accent inline-flex items-center gap-1.5 min-h-11 px-2">
        <ArrowLeft className="h-4 w-4" /> Settings
      </Link>
      <div>
        <h1 className="font-display text-3xl tracking-tight text-glow">Custom Alert Thresholds</h1>
        <p className="text-sm text-muted-foreground">Get notified when conditions at your home city cross a value you pick. Checked every 15 minutes.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="col-span-2">
            <Label className="text-xs">Metric</Label>
            <Select value={form.metric} onValueChange={(v) => setForm((f) => ({ ...f, metric: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{METRICS.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Op</Label>
            <Select value={form.op} onValueChange={(v) => setForm((f) => ({ ...f, op: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[">", "<", ">=", "<=", "="].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Value</Label>
            <Input type="number" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))} />
          </div>
        </div>
        <Input
          placeholder='Label (optional, e.g. "Big wind warning")'
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
        />
        <Button onClick={() => addMut.mutate()} disabled={addMut.isPending}>
          <Plus className="h-4 w-4 mr-1.5" /> Add threshold
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {list.data?.length === 0 && <p className="p-4 text-sm text-muted-foreground">No thresholds yet.</p>}
        {list.data?.map((t: any) => (
          <div key={t.id} className="flex items-center gap-3 p-3">
            <Thermometer className="h-4 w-4 text-accent" />
            <div className="flex-1">
              <div className="text-sm font-medium">{t.label || t.metric.replace("_", " ")}</div>
              <div className="text-[11px] text-muted-foreground font-mono">{t.metric} {t.op} {t.value}</div>
            </div>
            <Switch
              checked={t.enabled}
              onCheckedChange={(v) => tog({ data: { id: t.id, enabled: v } }).then(() => qc.invalidateQueries({ queryKey: ["thresholds"] }))}
            />
            <Button size="icon" variant="ghost" onClick={() => rem({ data: { id: t.id } }).then(() => qc.invalidateQueries({ queryKey: ["thresholds"] }))}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      <Toaster />
    </div>
  );
}
