import { useEffect, useMemo, useState } from "react";
import {
  BookMarked, Calendar, Layers, Hexagon, Plus, Trash2, Play, Save,
  Pause, CheckCircle2, Loader2, Clock, ListPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Generic snapshot of every field the command form cares about.
// We deliberately use `any` here for the issueFn payload to avoid coupling.
export interface CommandSnapshot {
  kind: "weather" | "eas" | "mwa-network";
  mode: "template" | "custom";
  easMode: "template" | "custom";
  typeId: string;
  easTypeId: string;
  customName: string;
  customCategory: "warning" | "watch" | "advisory" | "statement";
  customSeverity: "extreme" | "severe" | "moderate" | "minor";
  headline: string;
  description: string;
  instruction: string;
  areas: string[];
  duration: number;
  issuer: string;
}

interface SavedTemplate { id: string; name: string; at: string; snap: CommandSnapshot; }
interface ScheduledItem { id: string; fireAt: string; snap: CommandSnapshot; status: "pending" | "fired" | "failed"; }
interface BatchItem { id: string; snap: CommandSnapshot; status: "queued" | "sending" | "sent" | "failed"; }

const TPL_KEY = "mwa-command-templates-v1";
const SCH_KEY = "mwa-command-scheduled-v1";

export function CommandExtras({
  getSnapshot, applySnapshot, issueRaw,
}: {
  getSnapshot: () => CommandSnapshot;
  applySnapshot: (s: CommandSnapshot) => void;
  issueRaw: (s: CommandSnapshot) => Promise<void>;
}) {
  return (
    <section className="glass liquid rounded-2xl p-5 space-y-4">
      <div className="flex items-end justify-between gap-3 border-b border-border/40 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] tracking-[0.3em] text-accent">06</span>
          <h3 className="font-display text-base tracking-wider uppercase flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Power Tools
          </h3>
        </div>
        <p className="text-[10px] text-muted-foreground hidden sm:block">
          Templates · Schedule · Batch · Polygon
        </p>
      </div>
      <Tabs defaultValue="templates">
        <TabsList className="grid grid-cols-4 w-full h-auto">
          <TabsTrigger value="templates" className="text-xs gap-1.5"><BookMarked className="h-3 w-3" /> Templates</TabsTrigger>
          <TabsTrigger value="schedule" className="text-xs gap-1.5"><Calendar className="h-3 w-3" /> Schedule</TabsTrigger>
          <TabsTrigger value="batch" className="text-xs gap-1.5"><ListPlus className="h-3 w-3" /> Batch</TabsTrigger>
          <TabsTrigger value="polygon" className="text-xs gap-1.5"><Hexagon className="h-3 w-3" /> Polygon</TabsTrigger>
        </TabsList>
        <TabsContent value="templates" className="pt-4">
          <TemplatesPanel getSnapshot={getSnapshot} applySnapshot={applySnapshot} />
        </TabsContent>
        <TabsContent value="schedule" className="pt-4">
          <SchedulePanel getSnapshot={getSnapshot} applySnapshot={applySnapshot} issueRaw={issueRaw} />
        </TabsContent>
        <TabsContent value="batch" className="pt-4">
          <BatchPanel getSnapshot={getSnapshot} applySnapshot={applySnapshot} issueRaw={issueRaw} />
        </TabsContent>
        <TabsContent value="polygon" className="pt-4">
          <PolygonPanel getSnapshot={getSnapshot} applySnapshot={applySnapshot} />
        </TabsContent>
      </Tabs>
    </section>
  );
}

/* ---------- Templates ---------- */
function TemplatesPanel({
  getSnapshot, applySnapshot,
}: {
  getSnapshot: () => CommandSnapshot;
  applySnapshot: (s: CommandSnapshot) => void;
}) {
  const [items, setItems] = useState<SavedTemplate[]>([]);
  const [name, setName] = useState("");
  useEffect(() => {
    try { const r = localStorage.getItem(TPL_KEY); if (r) setItems(JSON.parse(r)); } catch {}
  }, []);
  const persist = (next: SavedTemplate[]) => {
    setItems(next);
    try { localStorage.setItem(TPL_KEY, JSON.stringify(next)); } catch {}
  };
  const save = () => {
    if (!name.trim()) { toast.error("Name your template"); return; }
    const snap = getSnapshot();
    if (!snap.headline.trim()) { toast.error("Compose an alert first"); return; }
    persist([{ id: crypto.randomUUID(), name: name.trim(), at: new Date().toISOString(), snap }, ...items].slice(0, 30));
    setName("");
    toast.success(`Template "${name}" saved`);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name (e.g. SE MI Tornado)" />
        <Button type="button" size="sm" onClick={save} className="gap-1.5"><Save className="h-3.5 w-3.5" /> Save current</Button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No templates yet. Compose, then save.</p>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 -mr-1">
          {items.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-md border border-border/60 p-2 hover:border-accent/60 transition-colors">
              <button
                type="button"
                onClick={() => { applySnapshot(t.snap); toast.success(`Loaded "${t.name}"`); }}
                className="flex-1 text-left"
              >
                <div className="text-xs font-medium">{t.name}</div>
                <div className="text-[10px] font-mono text-muted-foreground line-clamp-1">{t.snap.headline}</div>
              </button>
              <Badge variant="outline" className="text-[9px] uppercase font-mono">{t.snap.kind}</Badge>
              <button
                type="button"
                onClick={() => persist(items.filter((x) => x.id !== t.id))}
                className="text-muted-foreground hover:text-destructive"
                title="Delete template"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Schedule ---------- */
function SchedulePanel({
  getSnapshot, applySnapshot, issueRaw,
}: {
  getSnapshot: () => CommandSnapshot;
  applySnapshot: (s: CommandSnapshot) => void;
  issueRaw: (s: CommandSnapshot) => Promise<void>;
}) {
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [when, setWhen] = useState("");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    try { const r = localStorage.getItem(SCH_KEY); if (r) setItems(JSON.parse(r)); } catch {}
  }, []);
  const persist = (next: ScheduledItem[]) => {
    setItems(next);
    try { localStorage.setItem(SCH_KEY, JSON.stringify(next)); } catch {}
  };

  // Polling: fire any due item
  useEffect(() => {
    if (paused) return;
    const tick = async () => {
      const now = Date.now();
      const due = items.find((i) => i.status === "pending" && new Date(i.fireAt).getTime() <= now);
      if (!due) return;
      try {
        await issueRaw(due.snap);
        persist(items.map((i) => i.id === due.id ? { ...i, status: "fired" } : i));
        toast.success(`Scheduled alert fired: ${due.snap.headline.slice(0, 60)}`);
      } catch (e) {
        persist(items.map((i) => i.id === due.id ? { ...i, status: "failed" } : i));
        toast.error(`Scheduled fire failed: ${(e as Error).message}`);
      }
    };
    tick();
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, [items, paused, issueRaw]);

  const add = () => {
    if (!when) { toast.error("Pick a time"); return; }
    const snap = getSnapshot();
    if (!snap.headline.trim()) { toast.error("Compose an alert first"); return; }
    const fireAt = new Date(when);
    if (fireAt.getTime() <= Date.now() + 5_000) { toast.error("Pick a time at least 5s in the future"); return; }
    persist([{ id: crypto.randomUUID(), fireAt: fireAt.toISOString(), snap, status: "pending" }, ...items]);
    setWhen("");
    toast.success(`Scheduled for ${fireAt.toLocaleString()}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <Label className="text-[10px] font-mono uppercase tracking-wider">Fire at</Label>
          <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <Button type="button" size="sm" onClick={add} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Schedule</Button>
        <Button
          type="button" size="sm" variant={paused ? "default" : "outline"}
          onClick={() => setPaused((v) => !v)} title={paused ? "Resume scheduler" : "Pause scheduler"}
        >
          {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Scheduler runs while this tab is open. Polls every 20s. Browser-side — close the tab and it stops.
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Nothing scheduled.</p>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-2 rounded-md border border-border/60 p-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase">
                  <Clock className="h-3 w-3 text-accent" />
                  {new Date(it.fireAt).toLocaleString()}
                  <StatusBadge status={it.status} />
                </div>
                <div className="text-xs truncate">{it.snap.headline}</div>
              </div>
              <button type="button" onClick={() => { applySnapshot(it.snap); toast.message("Loaded into form"); }} className="text-muted-foreground hover:text-accent" title="Load">
                <BookMarked className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => persist(items.filter((x) => x.id !== it.id))} className="text-muted-foreground hover:text-destructive" title="Remove">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ScheduledItem["status"] | BatchItem["status"] }) {
  const map: Record<string, string> = {
    pending: "border-amber-alert/60 text-amber-alert",
    queued:  "border-amber-alert/60 text-amber-alert",
    sending: "border-watch/60 text-watch",
    fired:   "border-accent/60 text-accent",
    sent:    "border-accent/60 text-accent",
    failed:  "border-severe/60 text-severe",
  };
  return (
    <span className={cn("px-1.5 py-0.5 rounded border font-mono text-[9px]", map[status])}>
      {status}
    </span>
  );
}

/* ---------- Batch ---------- */
function BatchPanel({
  getSnapshot, applySnapshot, issueRaw,
}: {
  getSnapshot: () => CommandSnapshot;
  applySnapshot: (s: CommandSnapshot) => void;
  issueRaw: (s: CommandSnapshot) => Promise<void>;
}) {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [running, setRunning] = useState(false);
  const [delaySec, setDelaySec] = useState(2);

  const add = () => {
    const snap = getSnapshot();
    if (!snap.headline.trim()) { toast.error("Compose an alert first"); return; }
    setItems((x) => [...x, { id: crypto.randomUUID(), snap, status: "queued" }]);
    toast.message("Added to batch");
  };
  const remove = (id: string) => setItems((x) => x.filter((i) => i.id !== id));
  const clear = () => setItems([]);

  const fireAll = async () => {
    setRunning(true);
    let local = [...items];
    for (let i = 0; i < local.length; i++) {
      if (local[i].status !== "queued") continue;
      local = local.map((b, idx) => idx === i ? { ...b, status: "sending" } : b);
      setItems(local);
      try {
        await issueRaw(local[i].snap);
        local = local.map((b, idx) => idx === i ? { ...b, status: "sent" } : b);
      } catch (e) {
        local = local.map((b, idx) => idx === i ? { ...b, status: "failed" } : b);
        toast.error(`Item ${i + 1} failed: ${(e as Error).message}`);
      }
      setItems(local);
      if (i < local.length - 1) await new Promise((r) => setTimeout(r, delaySec * 1000));
    }
    setRunning(false);
    toast.success("Batch complete");
  };

  const sent = items.filter((i) => i.status === "sent").length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={add} className="gap-1.5" disabled={running}>
          <Plus className="h-3.5 w-3.5" /> Add current
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={fireAll} disabled={running || items.length === 0} className="gap-1.5">
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Fire all ({items.filter((i) => i.status === "queued").length})
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={clear} disabled={running || items.length === 0}>
          Clear
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Label className="text-[10px] font-mono uppercase tracking-wider">Spacing</Label>
          <Input type="number" min={0} max={60} value={delaySec} onChange={(e) => setDelaySec(Number(e.target.value))} className="h-8 w-16" />
          <span className="text-[10px] font-mono text-muted-foreground">sec</span>
        </div>
      </div>
      {items.length > 0 && (
        <div className="text-[10px] font-mono text-muted-foreground">
          {sent}/{items.length} sent
        </div>
      )}
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Queue is empty. Compose, click "Add current", repeat — then fire them all sequentially.
        </p>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {items.map((b, idx) => (
            <div key={b.id} className="flex items-center gap-2 rounded-md border border-border/60 p-2">
              <span className="text-[10px] font-mono text-muted-foreground w-5 text-center">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={b.status} />
                  <Badge variant="outline" className="text-[9px] uppercase font-mono">{b.snap.kind}</Badge>
                </div>
                <div className="text-xs truncate">{b.snap.headline}</div>
              </div>
              <button type="button" onClick={() => applySnapshot(b.snap)} className="text-muted-foreground hover:text-accent" title="Load"><BookMarked className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => remove(b.id)} disabled={running} className="text-muted-foreground hover:text-destructive" title="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Polygon (lightweight coordinate-based area) ---------- */
function PolygonPanel({
  getSnapshot, applySnapshot,
}: {
  getSnapshot: () => CommandSnapshot;
  applySnapshot: (s: CommandSnapshot) => void;
}) {
  const [raw, setRaw] = useState("");

  const points = useMemo(() => {
    return raw
      .split(/[;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[,\s]+/).map(Number);
        return parts.length >= 2 && parts.every(Number.isFinite) ? { lat: parts[0], lon: parts[1] } : null;
      })
      .filter((p): p is { lat: number; lon: number } => p !== null);
  }, [raw]);

  const centroid = useMemo(() => {
    if (points.length === 0) return null;
    const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const lon = points.reduce((s, p) => s + p.lon, 0) / points.length;
    return { lat, lon };
  }, [points]);

  const apply = () => {
    if (points.length < 3) { toast.error("Need at least 3 points to form a polygon"); return; }
    const label = `Polygon · ${points.length} pts · centroid ${centroid!.lat.toFixed(3)},${centroid!.lon.toFixed(3)}`;
    const cur = getSnapshot();
    applySnapshot({ ...cur, areas: [label] });
    toast.success("Polygon set as alert area");
  };

  // Build a small SVG preview, normalized to viewport
  const svg = useMemo(() => {
    if (points.length < 2) return null;
    const lats = points.map((p) => p.lat); const lons = points.map((p) => p.lon);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const w = 240, h = 160, pad = 12;
    const sx = (lon: number) => pad + ((lon - minLon) / Math.max(0.0001, maxLon - minLon)) * (w - 2 * pad);
    const sy = (lat: number) => pad + (1 - (lat - minLat) / Math.max(0.0001, maxLat - minLat)) * (h - 2 * pad);
    const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.lon)} ${sy(p.lat)}`).join(" ") + " Z";
    return { d, w, h, dots: points.map((p) => ({ x: sx(p.lon), y: sy(p.lat) })) };
  }, [points]);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-[10px] font-mono uppercase tracking-wider">Polygon points (lat, lon — one per line)</Label>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={5}
          placeholder={"42.33, -83.04\n42.50, -83.10\n42.45, -82.95"}
          className="w-full font-mono text-xs rounded-md border border-input bg-transparent px-3 py-2 outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" size="sm" onClick={apply} className="gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Use as area</Button>
        <span className="text-[10px] font-mono text-muted-foreground">
          {points.length} pt{points.length === 1 ? "" : "s"}
          {centroid && ` · centroid ${centroid.lat.toFixed(3)}, ${centroid.lon.toFixed(3)}`}
        </span>
      </div>
      {svg && (
        <div className="rounded-md border border-border/60 bg-background/40 p-2 grid place-items-center">
          <svg viewBox={`0 0 ${svg.w} ${svg.h}`} className="w-full max-w-[280px]" aria-label="Polygon preview">
            <path d={svg.d} fill="color-mix(in oklab, var(--accent) 20%, transparent)" stroke="var(--accent)" strokeWidth={1.5} />
            {svg.dots.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="var(--accent)" />
            ))}
          </svg>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">
        Polygon-based areas store as a centroid label. Use this when no county/marine zone fits — e.g. a custom storm box.
      </p>
    </div>
  );
}
