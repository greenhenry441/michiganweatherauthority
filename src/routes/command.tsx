import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Radio, Send, Trash2, Lock, AlertTriangle, ArrowLeft, Sparkles, Search, X,
  ShieldAlert, Megaphone, Network, Clock, MapPin, Eye, Activity,
  Save, History, Zap, CheckCircle2, Circle, Keyboard, FlaskConical,
  Copy, ListFilter, BarChart3, RefreshCw, Volume2, VolumeX, BookMarked,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { NWS_ALERT_TYPES, getAlertType, type AlertCategory, type AlertSeverity } from "@/lib/nws-alert-types";
import { EAS_ALERT_TYPES, MWA_NETWORK_TYPE, getEasType } from "@/lib/eas-alert-types";
import { MICHIGAN_COUNTIES } from "@/lib/michigan-counties";
import { useSharedAlerts, type SharedAlert } from "@/lib/alerts-store";
import { issueAlert, cancelAlert } from "@/lib/admin-alerts.functions";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/command")({
  head: () => ({
    meta: [
      { title: "MWA Command" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CommandPage,
});

const ACCESS_CODE = "mwa-admin";
type AlertKind = "weather" | "eas" | "mwa-network";

// ---------- Quick-fill presets ----------
interface QuickPreset {
  id: string;
  label: string;
  kind: AlertKind;
  typeId?: string;
  headline: string;
  description: string;
  instruction?: string;
  durationMinutes: number;
}
const QUICK_PRESETS: QuickPreset[] = [
  {
    id: "tor-warn",
    label: "Tornado Warning",
    kind: "weather",
    typeId: "tornado-warning",
    headline: "Tornado Warning in effect — TAKE COVER NOW",
    description: "A tornado has been reported by trained spotters. Significant damage to mobile homes, roofs, windows, and vehicles is possible. Flying debris will be life-threatening to anyone caught without shelter.",
    instruction: "TAKE COVER NOW! Move to a basement or an interior room on the lowest floor of a sturdy building. Avoid windows. If outdoors or in a vehicle, abandon for the closest substantial shelter.",
    durationMinutes: 45,
  },
  {
    id: "svr-warn",
    label: "Severe T-Storm",
    kind: "weather",
    typeId: "severe-thunderstorm-warning",
    headline: "Severe Thunderstorm Warning",
    description: "Damaging winds in excess of 60 mph and quarter-size hail are expected with this storm. Trees and large branches may fall. Sporadic power outages possible.",
    instruction: "Move indoors to an interior room on the lowest floor. Stay away from windows.",
    durationMinutes: 60,
  },
  {
    id: "ff-warn",
    label: "Flash Flood",
    kind: "weather",
    typeId: "flash-flood-warning",
    headline: "Flash Flood Warning",
    description: "Heavy rainfall is producing dangerous flash flooding. Low-lying roads and underpasses are flooding rapidly.",
    instruction: "Turn around, don't drown. Move to higher ground. Do not drive through flooded roadways.",
    durationMinutes: 180,
  },
  {
    id: "wsw",
    label: "Winter Storm",
    kind: "weather",
    typeId: "winter-storm-warning",
    headline: "Winter Storm Warning — heavy snow & blowing snow",
    description: "Heavy snow accumulations of 6 to 12 inches expected with wind gusts to 35 mph causing blowing and drifting snow and near-zero visibility.",
    instruction: "Travel is strongly discouraged. If you must travel, keep an emergency kit in your vehicle.",
    durationMinutes: 720,
  },
  {
    id: "rmt",
    label: "Required Monthly Test",
    kind: "eas",
    typeId: "rmt",
    headline: "This is a Required Monthly Test of the Emergency Alert System",
    description: "This is a test of the MWA emergency notification system. This is only a test. No action is required.",
    durationMinutes: 5,
  },
  {
    id: "amber",
    label: "AMBER Alert",
    kind: "eas",
    typeId: "amber",
    headline: "AMBER Alert — child abduction in progress",
    description: "Law enforcement is searching for a missing child believed to be in imminent danger. Vehicle and suspect details to follow.",
    instruction: "Do not approach. Call 911 with any information.",
    durationMinutes: 360,
  },
  {
    id: "maint",
    label: "Network Maintenance",
    kind: "mwa-network",
    headline: "Scheduled maintenance window",
    description: "MWA will perform scheduled maintenance. Brief interruptions to live data feeds and the alert ticker may occur.",
    durationMinutes: 60,
  },
];

const DRAFT_KEY = "mwa-command-draft-v1";
const HISTORY_KEY = "mwa-command-history-v1";
const SOUND_KEY = "mwa-command-sound-v1";

interface Draft {
  kind: AlertKind;
  mode: "template" | "custom";
  easMode: "template" | "custom";
  typeId: string;
  easTypeId: string;
  customName: string;
  customCategory: AlertCategory;
  customSeverity: AlertSeverity;
  headline: string;
  description: string;
  instruction: string;
  areas: string[];
  duration: number;
  issuer: string;
}

function CommandPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");

  if (!unlocked) {
    return (
      <div className="min-h-screen relative overflow-hidden grid place-items-center px-4">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(1000px 600px at 20% 10%, color-mix(in oklab, var(--severe) 18%, transparent), transparent 60%), radial-gradient(800px 500px at 80% 90%, color-mix(in oklab, var(--amber-alert) 14%, transparent), transparent 60%)",
          }}
        />
        <div className="absolute inset-0 -z-10 opacity-[0.04] [background-image:linear-gradient(var(--foreground)_1px,transparent_1px),linear-gradient(90deg,var(--foreground)_1px,transparent_1px)] [background-size:32px_32px]" />

        <div className="w-full max-w-md glass liquid rounded-2xl p-7 space-y-5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-severe opacity-60 animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-severe" />
            </span>
            <span className="font-mono uppercase tracking-[0.3em] text-[10px] text-severe">
              Restricted Channel
            </span>
          </div>
          <div className="space-y-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              MWA / Operations
            </p>
            <h1 className="font-display text-3xl leading-tight">Command Center</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Operator credentials required to broadcast manual alerts across the network.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (code === ACCESS_CODE) setUnlocked(true);
              else toast.error("Invalid access code");
            }}
            className="space-y-3"
          >
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Access code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full font-display tracking-wider">
              Authenticate
            </Button>
          </form>
          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <p className="text-[10px] font-mono text-muted-foreground">
              Default: <span className="text-accent">mwa-admin</span>
            </p>
            <Link to="/" className="text-xs text-muted-foreground hover:text-accent inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Public site
            </Link>
          </div>
        </div>
        <Toaster />
      </div>
    );
  }

  return <CommandConsole code={code} />;
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    o.start();
    o.stop(ctx.currentTime + 0.36);
    setTimeout(() => ctx.close(), 500);
  } catch {}
}

function CommandConsole({ code }: { code: string }) {
  const { alerts } = useSharedAlerts();
  const issueFn = useServerFn(issueAlert);
  const cancelFn = useServerFn(cancelAlert);

  const [kind, setKind] = useState<AlertKind>("weather");
  const [mode, setMode] = useState<"template" | "custom">("template");
  const [easMode, setEasMode] = useState<"template" | "custom">("template");

  const [headline, setHeadline] = useState("");
  const [areas, setAreas] = useState<string[]>(["Statewide"]);
  const [description, setDescription] = useState("");
  const [instruction, setInstruction] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"duration" | "window">("duration");
  const [duration, setDuration] = useState(60);
  const [startsImmediately, setStartsImmediately] = useState(true);
  const [startsAtLocal, setStartsAtLocal] = useState("");
  const [endsAtLocal, setEndsAtLocal] = useState("");
  const [issuer, setIssuer] = useState("MWA Operations");
  const [submitting, setSubmitting] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [filter, setFilter] = useState<"all" | "warning" | "watch" | "advisory" | "statement">("all");
  const [showShortcuts, setShowShortcuts] = useState(false);

  const [typeId, setTypeId] = useState(NWS_ALERT_TYPES[0].id);
  const [easTypeId, setEasTypeId] = useState(EAS_ALERT_TYPES[0].id);

  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState<AlertCategory>("statement");
  const [customSeverity, setCustomSeverity] = useState<AlertSeverity>("moderate");

  const [history, setHistory] = useState<Array<{ id: string; at: string; payload: Draft & { headline: string } }>>([]);
  const [hasDraft, setHasDraft] = useState(false);
  const draftRestoredRef = useRef(false);

  const selectedTemplate = getAlertType(typeId);
  const selectedEas = getEasType(easTypeId);

  // Load sound pref + history + draft on mount
  useEffect(() => {
    try {
      const s = localStorage.getItem(SOUND_KEY);
      if (s != null) setSoundOn(s === "1");
      const h = localStorage.getItem(HISTORY_KEY);
      if (h) setHistory(JSON.parse(h));
      const d = localStorage.getItem(DRAFT_KEY);
      if (d) setHasDraft(true);
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch {}
  }, [soundOn]);

  // Autosave draft (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const draft: Draft = {
          kind, mode, easMode, typeId, easTypeId, customName,
          customCategory, customSeverity, headline, description, instruction,
          areas, duration, issuer,
        };
        if (headline || description || instruction) {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
          setHasDraft(true);
        }
      } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [kind, mode, easMode, typeId, easTypeId, customName, customCategory, customSeverity, headline, description, instruction, areas, duration, issuer]);

  const restoreDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Draft;
      setKind(d.kind); setMode(d.mode); setEasMode(d.easMode);
      setTypeId(d.typeId); setEasTypeId(d.easTypeId);
      setCustomName(d.customName); setCustomCategory(d.customCategory); setCustomSeverity(d.customSeverity);
      setHeadline(d.headline); setDescription(d.description); setInstruction(d.instruction);
      setAreas(d.areas); setDuration(d.duration); setIssuer(d.issuer);
      toast.success("Draft restored");
      draftRestoredRef.current = true;
    } catch { toast.error("Could not restore draft"); }
  };
  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); setHasDraft(false); toast.message("Draft cleared"); } catch {}
  };
  const resetForm = () => {
    setHeadline(""); setDescription(""); setInstruction("");
    setCustomName(""); setAreas(["Statewide"]); setDuration(60);
    setTestMode(false);
  };

  const applyPreset = (p: QuickPreset) => {
    setKind(p.kind);
    if (p.kind === "weather") { setMode("template"); if (p.typeId) setTypeId(p.typeId); }
    else if (p.kind === "eas") { setEasMode("template"); if (p.typeId) setEasTypeId(p.typeId); }
    else { setCustomName(p.label); setCustomCategory("statement"); setCustomSeverity("minor"); }
    setHeadline(p.headline); setDescription(p.description);
    setInstruction(p.instruction ?? "");
    setDuration(p.durationMinutes);
    setScheduleMode("duration");
    toast.message(`Loaded preset: ${p.label}`);
  };

  // ---------- live preview values ----------
  const previewName = useMemo(() => {
    if (kind === "weather") return mode === "template" ? selectedTemplate?.name ?? "Alert" : customName || "Custom Alert";
    if (kind === "eas") return easMode === "template" ? selectedEas?.name ?? "EAS Alert" : customName || "Custom EAS";
    return customName || "MWA Network Notification";
  }, [kind, mode, easMode, selectedTemplate, selectedEas, customName]);

  const previewCategory: AlertCategory = useMemo(() => {
    if (kind === "weather") return mode === "template" ? (selectedTemplate?.category ?? "statement") : customCategory;
    if (kind === "eas") return easMode === "template" ? (selectedEas?.category ?? "statement") : customCategory;
    return customCategory;
  }, [kind, mode, easMode, selectedTemplate, selectedEas, customCategory]);

  const previewSeverity: AlertSeverity = useMemo(() => {
    if (kind === "weather") return mode === "template" ? (selectedTemplate?.severity ?? "minor") : customSeverity;
    if (kind === "eas") return easMode === "template" ? (selectedEas?.severity ?? "minor") : customSeverity;
    return customSeverity;
  }, [kind, mode, easMode, selectedTemplate, selectedEas, customSeverity]);

  // Pre-flight checks
  const checks = useMemo(() => {
    const list = [
      { ok: headline.trim().length >= 8, label: "Headline (≥ 8 chars)" },
      { ok: description.trim().length >= 20, label: "Description (≥ 20 chars)" },
      { ok: areas.length > 0, label: "Area selected" },
      { ok: issuer.trim().length > 0, label: "Issuer set" },
      { ok: kind !== "weather" || mode !== "custom" || !!customName.trim(), label: "Custom name (if custom)" },
      { ok: scheduleMode === "duration" ? duration >= 5 : !!endsAtLocal, label: "Schedule valid" },
    ];
    return list;
  }, [headline, description, areas, issuer, kind, mode, customName, scheduleMode, duration, endsAtLocal]);
  const checkPass = checks.filter((c) => c.ok).length;
  const formProgress = Math.round((checkPass / checks.length) * 100);

  // Stats
  const stats = useMemo(() => {
    const byCat = { warning: 0, watch: 0, advisory: 0, statement: 0, extreme: 0 } as Record<string, number>;
    const byKind = { weather: 0, eas: 0, "mwa-network": 0 } as Record<string, number>;
    let expiringSoon = 0;
    const now = Date.now();
    for (const a of alerts) {
      byCat[a.category] = (byCat[a.category] ?? 0) + 1;
      byKind[a.kind] = (byKind[a.kind] ?? 0) + 1;
      if (new Date(a.expires_at).getTime() - now < 15 * 60_000) expiringSoon++;
    }
    return { byCat, byKind, expiringSoon, total: alerts.length };
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    if (filter === "all") return alerts;
    return alerts.filter((a) => a.category === filter);
  }, [alerts, filter]);

  const issue = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!headline.trim() || !description.trim()) {
      toast.error("Headline and description are required");
      return;
    }
    if (kind === "weather" && mode === "custom" && !customName.trim()) {
      toast.error("Custom alert name is required");
      return;
    }
    if (kind === "eas" && easMode === "custom" && !customName.trim()) {
      toast.error("Custom EAS alert name is required");
      return;
    }
    if (areas.length === 0) {
      toast.error("Select at least one area");
      return;
    }
    setSubmitting(true);
    try {
      let payload: any;
      if (kind === "weather") {
        payload = mode === "template"
          ? {
              kind, code, typeId, customName: null,
              category: (selectedTemplate?.category ?? "statement") as AlertCategory,
              severity: (selectedTemplate?.severity ?? "minor") as AlertSeverity,
            }
          : {
              kind, code, typeId: null, customName: customName.trim(),
              category: customCategory, severity: customSeverity,
            };
      } else if (kind === "eas") {
        payload = easMode === "template"
          ? {
              kind, code, typeId: easTypeId, customName: null,
              category: (selectedEas?.category ?? "statement") as AlertCategory,
              severity: (selectedEas?.severity ?? "minor") as AlertSeverity,
            }
          : {
              kind, code, typeId: null, customName: customName.trim(),
              category: customCategory, severity: customSeverity,
            };
      } else {
        payload = {
          kind, code, typeId: MWA_NETWORK_TYPE.id, customName: customName.trim() || "MWA Network Notification",
          category: customCategory, severity: customSeverity,
        };
      }

      const effDuration = testMode ? 5 : duration;
      const effHeadline = testMode ? `[TEST] ${headline.trim()}` : headline.trim();

      const schedule =
        scheduleMode === "duration" || testMode
          ? { durationMinutes: Number(effDuration), startsImmediately: true, startsAt: null, endsAt: null }
          : {
              startsImmediately,
              startsAt: startsImmediately || !startsAtLocal ? null : new Date(startsAtLocal).toISOString(),
              endsAt: endsAtLocal ? new Date(endsAtLocal).toISOString() : null,
              durationMinutes: null,
            };
      if (scheduleMode === "window" && !testMode && !endsAtLocal) {
        toast.error("Pick an end date/time, or switch to Duration mode");
        setSubmitting(false);
        return;
      }
      await issueFn({
        data: {
          ...payload,
          headline: effHeadline,
          description: description.trim(),
          instruction: instruction.trim() || null,
          areas,
          issuer: issuer.trim() || "MWA",
          ...schedule,
        },
      });
      toast.success(testMode ? "TEST broadcast sent (5min expiry)" : "Alert broadcast to all visitors");
      if (soundOn) playBeep();

      // Save to history
      try {
        const entry = {
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          payload: {
            kind, mode, easMode, typeId, easTypeId, customName,
            customCategory, customSeverity,
            headline: effHeadline, description: description.trim(),
            instruction: instruction.trim(), areas, duration: effDuration, issuer,
          },
        };
        const next = [entry, ...history].slice(0, 25);
        setHistory(next);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {}

      resetForm();
      try { localStorage.removeItem(DRAFT_KEY); setHasDraft(false); } catch {}
    } catch (err) {
      toast.error((err as Error).message || "Failed to issue alert");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await cancelFn({ data: { code, id } });
      toast.message("Alert cancelled");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const copyAsJson = async (a: SharedAlert) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(a, null, 2));
      toast.success("Alert JSON copied");
    } catch { toast.error("Copy failed"); }
  };

  const replayHistory = (h: typeof history[number]) => {
    const p = h.payload;
    setKind(p.kind); setMode(p.mode); setEasMode(p.easMode);
    setTypeId(p.typeId); setEasTypeId(p.easTypeId);
    setCustomName(p.customName); setCustomCategory(p.customCategory); setCustomSeverity(p.customSeverity);
    setHeadline(p.headline.replace(/^\[TEST\]\s*/, "")); setDescription(p.description); setInstruction(p.instruction);
    setAreas(p.areas); setDuration(p.duration); setIssuer(p.issuer);
    setScheduleMode("duration");
    toast.message("Loaded from history — review & broadcast");
  };

  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
    toast.message("History cleared");
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "Enter") { e.preventDefault(); issue(); }
      else if (meta && e.key.toLowerCase() === "k") { e.preventDefault(); setTestMode((v) => !v); }
      else if (meta && e.key === "/") { e.preventDefault(); setShowShortcuts((v) => !v); }
      else if (e.key === "Escape") { setShowShortcuts(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headline, description, areas, kind, mode, easMode, typeId, easTypeId, customName, customCategory, customSeverity, instruction, duration, scheduleMode, startsImmediately, startsAtLocal, endsAtLocal, issuer, testMode]);

  const allReady = checks.every((c) => c.ok);

  return (
    <div className="min-h-screen relative">
      {/* Ambient backdrop, tinted by current severity */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 pointer-events-none transition-all duration-700"
        style={{
          background:
            previewCategory === "warning"
              ? "radial-gradient(1100px 700px at 10% -10%, color-mix(in oklab, var(--warning) 18%, transparent), transparent 60%), radial-gradient(900px 600px at 110% 110%, color-mix(in oklab, var(--severe) 14%, transparent), transparent 60%)"
              : previewCategory === "watch"
              ? "radial-gradient(1100px 700px at 10% -10%, color-mix(in oklab, var(--watch) 16%, transparent), transparent 60%), radial-gradient(900px 600px at 110% 110%, color-mix(in oklab, var(--accent) 10%, transparent), transparent 60%)"
              : "radial-gradient(1100px 700px at 10% -10%, color-mix(in oklab, var(--accent) 12%, transparent), transparent 60%), radial-gradient(900px 600px at 110% 110%, color-mix(in oklab, var(--statement) 10%, transparent), transparent 60%)",
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 backdrop-blur-xl bg-background/70">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-xl glass grid place-items-center">
              <Radio className="h-4 w-4 text-severe alert-pulse" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-severe shadow-[0_0_10px_var(--severe)]" />
            </div>
            <div className="leading-tight">
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-severe">
                Live · Broadcast Channel
              </p>
              <h1 className="font-display text-lg tracking-wider">MWA Operations Console</h1>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <Activity className="h-3.5 w-3.5 text-accent" />
            <span>{alerts.length} active</span>
            <span className="text-border">/</span>
            <span>operator: {issuer}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={testMode ? "default" : "ghost"}
              size="sm"
              onClick={() => setTestMode((v) => !v)}
              className={cn("gap-1.5", testMode && "bg-amber-alert text-background hover:bg-amber-alert/90")}
              title="Toggle TEST mode (⌘K) — adds [TEST] prefix and 5-minute expiry"
            >
              <FlaskConical className="h-3.5 w-3.5" /> {testMode ? "TEST" : "Test"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundOn((v) => !v)}
              title={soundOn ? "Sound on" : "Sound off"}
            >
              {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowShortcuts((v) => !v)}
              title="Keyboard shortcuts (⌘/)"
            >
              <Keyboard className="h-4 w-4" />
            </Button>
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" /> Public
              </Button>
            </Link>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-px bg-border/40 relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent via-amber-alert to-severe transition-all duration-500"
            style={{ width: `${formProgress}%` }}
          />
        </div>
        {/* Stats strip */}
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2 flex-wrap text-[10px] font-mono uppercase tracking-wider">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <BarChart3 className="h-3 w-3" /> live
          </span>
          <StatPill label="Total" value={stats.total} />
          <StatPill label="Warn" value={stats.byCat.warning ?? 0} tone="warning" />
          <StatPill label="Watch" value={stats.byCat.watch ?? 0} tone="watch" />
          <StatPill label="Advisory" value={stats.byCat.advisory ?? 0} tone="advisory" />
          <StatPill label="Stmt" value={stats.byCat.statement ?? 0} tone="statement" />
          <span className="text-border">·</span>
          <StatPill label="WX" value={stats.byKind.weather ?? 0} />
          <StatPill label="EAS" value={stats.byKind.eas ?? 0} />
          <StatPill label="NET" value={stats.byKind["mwa-network"] ?? 0} />
          {stats.expiringSoon > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-amber-alert/60 bg-amber-alert/10 text-amber-alert">
              <Clock className="h-3 w-3" /> {stats.expiringSoon} expiring &lt;15m
            </span>
          )}
        </div>
      </header>

      {/* Shortcuts overlay */}
      {showShortcuts && (
        <div
          onClick={() => setShowShortcuts(false)}
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm grid place-items-center px-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass liquid rounded-2xl p-6 max-w-sm w-full space-y-3"
          >
            <h3 className="font-display tracking-wider uppercase text-sm flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-accent" /> Shortcuts
            </h3>
            <KbdRow keys={["⌘", "Enter"]} label="Broadcast alert" />
            <KbdRow keys={["⌘", "K"]} label="Toggle TEST mode" />
            <KbdRow keys={["⌘", "/"]} label="Show this overlay" />
            <KbdRow keys={["Esc"]} label="Close overlay" />
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-[1fr_380px] gap-6">
        <form onSubmit={issue} className="space-y-6">
          {/* Editorial title */}
          <div className="flex items-end justify-between border-b border-border/60 pb-4 gap-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground">
                Section 01 — Compose
              </p>
              <h2 className="font-display text-3xl md:text-4xl tracking-wide flex items-center gap-3">
                <AlertTriangle className="h-7 w-7 text-amber-alert" />
                Issue Alert
              </h2>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {hasDraft && (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={restoreDraft} className="gap-1.5">
                    <Save className="h-3.5 w-3.5" /> Restore draft
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={clearDraft} className="text-muted-foreground">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={resetForm} className="gap-1.5 text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          </div>

          {/* Quick presets */}
          <section className="glass liquid rounded-2xl p-5 space-y-3">
            <SectionLabel n="00" title="Quick Presets" hint="One-click templates for common alerts" icon={<Zap className="h-3.5 w-3.5" />} />
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="text-[11px] font-mono px-2.5 py-1 rounded-md border border-border/60 hover:border-accent hover:bg-accent/10 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          {/* Channel selector */}
          <section className="glass liquid rounded-2xl p-5 space-y-4">
            <SectionLabel n="01" title="Channel" hint="Where this alert is delivered" />
            <Tabs value={kind} onValueChange={(v) => setKind(v as AlertKind)}>
              <TabsList className="grid grid-cols-3 w-full h-auto p-1">
                <ChannelTab value="weather" icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Weather" sub="WX ticker" />
                <ChannelTab value="eas" icon={<ShieldAlert className="h-3.5 w-3.5" />} label="EAS" sub="Emergency" />
                <ChannelTab value="mwa-network" icon={<Network className="h-3.5 w-3.5" />} label="Network" sub="System status" />
              </TabsList>
            </Tabs>
          </section>

          {/* Product/Type */}
          <section className="glass liquid rounded-2xl p-5 space-y-4">
            <SectionLabel n="02" title="Product" hint="Choose a template or roll your own" />
            {kind === "weather" && (
              <Tabs value={mode} onValueChange={(v) => setMode(v as "template" | "custom")}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="template">NWS Template</TabsTrigger>
                  <TabsTrigger value="custom" className="gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Custom Alert
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="template" className="space-y-4 pt-4">
                  <div className="space-y-1.5">
                    <Label>Alert Product</Label>
                    <Select value={typeId} onValueChange={setTypeId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-[320px]">
                        {NWS_ALERT_TYPES.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTemplate && (
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="outline" className="capitalize">{selectedTemplate.category}</Badge>
                        <Badge variant="outline" className="capitalize">{selectedTemplate.severity}</Badge>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="custom" className="space-y-4 pt-4">
                  <CustomFields
                    name={customName} onName={setCustomName}
                    cat={customCategory} onCat={setCustomCategory}
                    sev={customSeverity} onSev={setCustomSeverity}
                    namePlaceholder="e.g. Sudden Lake Effect Whiteout"
                  />
                </TabsContent>
              </Tabs>
            )}

            {kind === "eas" && (
              <Tabs value={easMode} onValueChange={(v) => setEasMode(v as "template" | "custom")}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="template">EAS Template</TabsTrigger>
                  <TabsTrigger value="custom" className="gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Custom EAS
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="template" className="space-y-4 pt-4">
                  <div className="space-y-1.5">
                    <Label>EAS Product</Label>
                    <Select value={easTypeId} onValueChange={setEasTypeId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-[320px]">
                        {EAS_ALERT_TYPES.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedEas && (
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="outline" className="capitalize">{selectedEas.category}</Badge>
                        <Badge variant="outline" className="capitalize">{selectedEas.severity}</Badge>
                        <Badge variant="outline" className="font-mono">{selectedEas.code}</Badge>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="custom" className="space-y-4 pt-4">
                  <CustomFields
                    name={customName} onName={setCustomName}
                    cat={customCategory} onCat={setCustomCategory}
                    sev={customSeverity} onSev={setCustomSeverity}
                    namePlaceholder="e.g. County-wide Boil Water Order"
                    hint="Broadcasts on the EAS / Emergency ticker."
                  />
                </TabsContent>
              </Tabs>
            )}

            {kind === "mwa-network" && (
              <CustomFields
                name={customName} onName={setCustomName}
                cat={customCategory} onCat={setCustomCategory}
                sev={customSeverity} onSev={setCustomSeverity}
                namePlaceholder="e.g. Scheduled maintenance window"
                hint="Defaults to 'MWA Network Notification' if left blank."
              />
            )}
          </section>

          {/* Scheduling */}
          <section className="glass liquid rounded-2xl p-5 space-y-4">
            <SectionLabel n="03" title="Scheduling" hint="How long the alert stays live" icon={<Clock className="h-3.5 w-3.5" />} />
            <Tabs value={scheduleMode} onValueChange={(v) => setScheduleMode(v as "duration" | "window")}>
              <TabsList className="h-8">
                <TabsTrigger value="duration" className="text-xs h-7">Duration</TabsTrigger>
                <TabsTrigger value="window" className="text-xs h-7">Specific times</TabsTrigger>
              </TabsList>
            </Tabs>

            {scheduleMode === "duration" ? (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Active for (minutes)</Label>
                  <Input
                    type="number" min={5} max={10080}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[15, 30, 60, 120, 360, 720].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDuration(m)}
                        className={cn(
                          "text-[10px] font-mono px-2 py-0.5 rounded border transition-colors",
                          duration === m
                            ? "border-accent bg-accent/15 text-accent"
                            : "border-border/60 text-muted-foreground hover:border-accent/60",
                        )}
                      >
                        {m < 60 ? `${m}m` : `${m / 60}h`}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Expires {new Date(Date.now() + duration * 60_000).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Issued by</Label>
                  <Input value={issuer} onChange={(e) => setIssuer(e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={startsImmediately} onCheckedChange={(v) => setStartsImmediately(!!v)} />
                  Starts immediately
                </label>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Start</Label>
                    <Input
                      type="datetime-local"
                      disabled={startsImmediately}
                      value={startsAtLocal}
                      onChange={(e) => setStartsAtLocal(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>End</Label>
                    <Input
                      type="datetime-local"
                      value={endsAtLocal}
                      onChange={(e) => setEndsAtLocal(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Issued by</Label>
                  <Input value={issuer} onChange={(e) => setIssuer(e.target.value)} />
                </div>
              </div>
            )}
          </section>

          {/* Areas */}
          <section className="glass liquid rounded-2xl p-5 space-y-4">
            <SectionLabel n="04" title="Areas" hint="Where this alert applies" icon={<MapPin className="h-3.5 w-3.5" />} />
            <AreaPicker areas={areas} onChange={setAreas} />
          </section>

          {/* Message */}
          <section className="glass liquid rounded-2xl p-5 space-y-4">
            <SectionLabel n="05" title="Message" hint="Headline, description, and call to action" icon={<Megaphone className="h-3.5 w-3.5" />} />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Headline</Label>
                <span className="text-[10px] font-mono text-muted-foreground">{headline.length}/200</span>
              </div>
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Tornado spotted near Pontiac, take shelter immediately"
                maxLength={200}
              />
              <CharBar value={headline.length} max={200} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Description</Label>
                <span className="text-[10px] font-mono text-muted-foreground">{description.length}/4000</span>
              </div>
              <Textarea
                rows={5} value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="At 4:32 PM EDT, a severe thunderstorm capable of producing a tornado was located..."
                maxLength={4000}
              />
              <CharBar value={description.length} max={4000} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Instruction (optional)</Label>
                <span className="text-[10px] font-mono text-muted-foreground">{instruction.length}/2000</span>
              </div>
              <Textarea
                rows={3} value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="TAKE COVER NOW! Move to an interior room on the lowest floor..."
                maxLength={2000}
              />
            </div>
          </section>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              size="lg"
              disabled={submitting || !allReady}
              className={cn(
                "flex-1 font-display tracking-wider h-12 text-base transition-all",
                testMode
                  ? "bg-amber-alert text-background hover:bg-amber-alert/90"
                  : "bg-gradient-to-r from-severe via-amber-alert to-severe bg-[length:200%_100%] hover:bg-[position:100%_0]",
              )}
              title="Broadcast (⌘+Enter)"
            >
              <Send className="h-4 w-4 mr-2" />
              {submitting ? "Broadcasting…" : testMode ? "Broadcast TEST" : "Broadcast Alert"}
              <span className="ml-3 hidden sm:inline opacity-70 font-mono text-[10px]">⌘↵</span>
            </Button>
          </div>
          {!allReady && (
            <p className="text-[11px] text-muted-foreground text-center">
              {checks.length - checkPass} pre-flight check{checks.length - checkPass === 1 ? "" : "s"} remaining
            </p>
          )}
        </form>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto pr-1 -mr-1">
          {/* Pre-flight checklist */}
          <div className="glass liquid rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display tracking-wider text-xs uppercase text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-accent" /> Pre-flight
              </h3>
              <span className="text-[10px] font-mono text-muted-foreground">
                {checkPass}/{checks.length}
              </span>
            </div>
            <ul className="space-y-1">
              {checks.map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-xs">
                  {c.ok
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                    : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className={cn(c.ok ? "" : "text-muted-foreground")}>{c.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Live preview */}
          <div className="glass liquid rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-accent" />
              <h3 className="font-display tracking-wider text-xs uppercase text-muted-foreground">
                Live Preview
              </h3>
            </div>
            <div
              className={cn(
                "relative rounded-lg overflow-hidden border bg-background/40",
                previewCategory === "warning" && "border-warning/60",
                previewCategory === "watch" && "border-watch/60",
                previewCategory === "advisory" && "border-advisory/50",
                previewCategory === "statement" && "border-statement/50",
              )}
            >
              <div
                className={cn(
                  "absolute inset-y-0 left-0 w-1",
                  previewCategory === "warning" && "bg-warning",
                  previewCategory === "watch" && "bg-watch",
                  previewCategory === "advisory" && "bg-advisory",
                  previewCategory === "statement" && "bg-statement",
                )}
              />
              <div className="p-3 pl-4 space-y-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-display font-bold uppercase tracking-wider text-xs">
                    {testMode && <span className="text-amber-alert">[TEST] </span>}
                    {previewName}
                  </span>
                  <Badge variant="outline" className="text-[9px] font-mono uppercase">
                    {kind === "eas" ? "EAS" : kind === "mwa-network" ? "NET" : "WX"}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] font-mono uppercase capitalize">
                    {previewSeverity}
                  </Badge>
                </div>
                <p className="text-sm font-medium leading-snug">
                  {headline || <span className="text-muted-foreground italic">Your headline will appear here…</span>}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {description || "Description preview appears as you type."}
                </p>
                <div className="flex items-center justify-between pt-1 font-mono text-[10px] text-muted-foreground">
                  <span className="truncate">{areas.join(", ") || "—"}</span>
                  <span>{issuer || "MWA"}</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground text-center">
              Updates in real-time as you compose
            </p>
          </div>

          {/* Active alerts */}
          <div className="glass liquid rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display tracking-wider text-xs uppercase text-muted-foreground">
                Active Broadcasts
              </h3>
              <Badge variant="outline" className="text-[10px] font-mono">
                {filteredAlerts.length}/{alerts.length}
              </Badge>
            </div>
            <div className="flex items-center gap-1 mb-3 flex-wrap">
              <ListFilter className="h-3 w-3 text-muted-foreground" />
              {(["all", "warning", "watch", "advisory", "statement"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "text-[10px] font-mono uppercase px-2 py-0.5 rounded border transition-colors",
                    filter === f
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border/60 text-muted-foreground hover:border-accent/60",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            {filteredAlerts.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <div className="mx-auto h-10 w-10 rounded-full glass grid place-items-center">
                  <Radio className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {alerts.length === 0 ? "No manual alerts active." : "None match this filter."}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 -mr-1">
                {filteredAlerts.map((a) => {
                  const t = a.type_id
                    ? (getAlertType(a.type_id) ?? getEasType(a.type_id))
                    : undefined;
                  return (
                    <div
                      key={a.id}
                      className={cn(
                        "relative rounded-md border p-3 pl-4 text-xs space-y-1 overflow-hidden group transition-colors",
                        a.category === "warning" && "border-warning/60 bg-warning/10",
                        a.category === "watch" && "border-watch/60 bg-watch/10",
                        a.category === "advisory" && "border-advisory/40 bg-advisory/5",
                        a.category === "statement" && "border-statement/40 bg-statement/10",
                      )}
                    >
                      <div
                        className={cn(
                          "absolute inset-y-0 left-0 w-1",
                          a.category === "warning" && "bg-warning",
                          a.category === "watch" && "bg-watch",
                          a.category === "advisory" && "bg-advisory",
                          a.category === "statement" && "bg-statement",
                        )}
                      />
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-display font-bold uppercase tracking-wider">
                            {t?.name ?? a.custom_name ?? "Alert"}
                          </span>
                          <Badge variant="outline" className="text-[9px] font-mono uppercase">
                            {a.kind === "eas" ? "EAS" : a.kind === "mwa-network" ? "NET" : "WX"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => copyAsJson(a)}
                            className="text-muted-foreground hover:text-accent"
                            aria-label="Copy as JSON"
                            title="Copy JSON"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(a.id)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Cancel alert"
                            title="Cancel"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="font-medium">{a.headline}</p>
                      <p className="text-muted-foreground line-clamp-2">{a.description}</p>
                      <div className="flex items-center justify-between pt-1 font-mono text-[10px] text-muted-foreground">
                        <span className="truncate">{a.areas.join(", ")}</span>
                        <span>exp {new Date(a.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Broadcast history */}
          <div className="glass liquid rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display tracking-wider text-xs uppercase text-muted-foreground flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-accent" /> Recent Broadcasts
              </h3>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-[10px] font-mono text-muted-foreground hover:text-destructive"
                >
                  Clear
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Your last 25 sent alerts will appear here.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1 -mr-1">
                {history.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => replayHistory(h)}
                    className="w-full text-left rounded-md border border-border/60 p-2 hover:border-accent hover:bg-accent/5 transition-colors group"
                    title="Load into form to re-broadcast"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase text-muted-foreground">
                        {h.payload.kind === "eas" ? "EAS" : h.payload.kind === "mwa-network" ? "NET" : "WX"} · {new Date(h.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <BookMarked className="h-3 w-3 text-muted-foreground group-hover:text-accent" />
                    </div>
                    <p className="text-xs font-medium line-clamp-1">{h.payload.headline}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </main>
      <Toaster />
    </div>
  );
}

function StatPill({ label, value, tone }: { label: string; value: number; tone?: "warning" | "watch" | "advisory" | "statement" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded border",
        tone === "warning" && "border-warning/60 bg-warning/10 text-warning",
        tone === "watch" && "border-watch/60 bg-watch/10 text-watch",
        tone === "advisory" && "border-advisory/60 bg-advisory/10",
        tone === "statement" && "border-statement/60 bg-statement/10",
        !tone && "border-border/60 text-muted-foreground",
      )}
    >
      {label}: <span className="text-foreground font-bold">{value}</span>
    </span>
  );
}

function CharBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="h-0.5 rounded-full bg-border/40 overflow-hidden">
      <div
        className={cn(
          "h-full transition-all",
          pct > 90 ? "bg-severe" : pct > 70 ? "bg-amber-alert" : "bg-accent",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function KbdRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-1">
        {keys.map((k) => (
          <kbd key={k} className="px-1.5 py-0.5 rounded border border-border/60 bg-muted/40 text-[10px] font-mono">
            {k}
          </kbd>
        ))}
      </span>
    </div>
  );
}

function SectionLabel({
  n, title, hint, icon,
}: { n: string; title: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 border-b border-border/40 pb-2">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] tracking-[0.3em] text-accent">{n}</span>
        <h3 className="font-display text-base tracking-wider uppercase flex items-center gap-1.5">
          {icon}{title}
        </h3>
      </div>
      {hint && <p className="text-[10px] text-muted-foreground hidden sm:block">{hint}</p>}
    </div>
  );
}

function ChannelTab({
  value, icon, label, sub,
}: { value: string; icon: React.ReactNode; label: string; sub: string }) {
  return (
    <TabsTrigger value={value} className="flex flex-col items-center gap-0.5 py-2 h-auto data-[state=active]:bg-accent/15">
      <span className="flex items-center gap-1.5 text-sm font-display tracking-wider">
        {icon}{label}
      </span>
      <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{sub}</span>
    </TabsTrigger>
  );
}

function CustomFields({
  name, onName, cat, onCat, sev, onSev, namePlaceholder, hint,
}: {
  name: string; onName: (v: string) => void;
  cat: AlertCategory; onCat: (v: AlertCategory) => void;
  sev: AlertSeverity; onSev: (v: AlertSeverity) => void;
  namePlaceholder: string; hint?: string;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label>Alert Name</Label>
        <Input value={name} onChange={(e) => onName(e.target.value)} placeholder={namePlaceholder} maxLength={80} />
        {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={cat} onValueChange={(v) => onCat(v as AlertCategory)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="watch">Watch</SelectItem>
              <SelectItem value="advisory">Advisory</SelectItem>
              <SelectItem value="statement">Statement</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Severity</Label>
          <Select value={sev} onValueChange={(v) => onSev(v as AlertSeverity)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="extreme">Extreme</SelectItem>
              <SelectItem value="severe">Severe</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="minor">Minor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}

const MARINE_ZONES: string[] = [
  "Lake Superior – Whitefish Bay",
  "Lake Superior – Eastern (Munising → Whitefish Pt)",
  "Lake Superior – Central (Marquette → Munising)",
  "Lake Superior – Western (Ontonagon → Marquette)",
  "Lake Superior – Keweenaw nearshore",
  "Lake Michigan – Green Bay south of Sturgeon Bay",
  "Lake Michigan – North (Seul Choix Pt → Sleeping Bear)",
  "Lake Michigan – Grand Traverse Bay",
  "Lake Michigan – Central (Sleeping Bear → Pt Betsie)",
  "Lake Michigan – South-central (Pt Betsie → Holland)",
  "Lake Michigan – Southern (Holland → St. Joseph)",
  "Lake Huron – Straits of Mackinac",
  "Lake Huron – Northern (DeTour → Presque Isle)",
  "Lake Huron – Saginaw Bay",
  "Lake Huron – Central (Presque Isle → Harbor Beach)",
  "Lake Huron – Southern (Harbor Beach → Port Huron)",
  "St. Marys River",
  "St. Clair River",
  "Lake St. Clair",
  "Detroit River",
  "Lake Erie – Western basin (off MI)",
];

const MARINE_GROUPS: Record<string, string[]> = {
  "All Great Lakes (MI)": MARINE_ZONES,
  "Lake Superior": MARINE_ZONES.filter((z) => z.startsWith("Lake Superior")),
  "Lake Michigan": MARINE_ZONES.filter((z) => z.startsWith("Lake Michigan")),
  "Lake Huron": MARINE_ZONES.filter((z) => z.startsWith("Lake Huron") || z === "Saginaw Bay"),
  "Lake Erie": MARINE_ZONES.filter((z) => z.startsWith("Lake Erie")),
};

function AreaPicker({ areas, onChange }: { areas: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"land" | "marine">("land");
  const isStatewide = areas.includes("Statewide");
  const selected = new Set(areas);

  const matches = useMemo(() => {
    const pool = tab === "land" ? MICHIGAN_COUNTIES : MARINE_ZONES;
    if (!q.trim()) return pool.slice(0, tab === "land" ? 12 : MARINE_ZONES.length);
    const term = q.toLowerCase();
    return pool.filter((c) => c.toLowerCase().includes(term)).slice(0, 25);
  }, [q, tab]);

  const toggle = (name: string) => {
    if (selected.has(name)) onChange(areas.filter((a) => a !== name));
    else onChange([...areas.filter((a) => a !== "Statewide"), name]);
  };

  const REGIONS: Record<string, string[]> = {
    "SE Michigan": ["Wayne", "Oakland", "Macomb", "Washtenaw", "Monroe", "Livingston", "St. Clair"],
    "West MI": ["Kent", "Ottawa", "Muskegon", "Allegan", "Kalamazoo", "Berrien"],
    "Mid MI": ["Ingham", "Eaton", "Clinton", "Jackson", "Calhoun"],
    "Northern LP": ["Grand Traverse", "Leelanau", "Antrim", "Charlevoix", "Emmet", "Cheboygan"],
    "UP": ["Marquette", "Houghton", "Chippewa", "Delta", "Dickinson", "Gogebic"],
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm cursor-pointer rounded-md border border-border/60 px-3 py-2 hover:border-accent/60 transition-colors">
        <Checkbox
          checked={isStatewide}
          onCheckedChange={(v) => onChange(v ? ["Statewide"] : [])}
        />
        <span className="font-display tracking-wider uppercase text-xs">Statewide</span>
        <span className="text-[10px] text-muted-foreground ml-auto">all of Michigan</span>
      </label>

      {!isStatewide && (
        <>
          <Tabs value={tab} onValueChange={(v) => { setTab(v as "land" | "marine"); setQ(""); }}>
            <TabsList className="h-8">
              <TabsTrigger value="land" className="text-xs h-7">Land · counties</TabsTrigger>
              <TabsTrigger value="marine" className="text-xs h-7">Marine · Great Lakes</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap gap-1.5">
            {tab === "land"
              ? Object.entries(REGIONS).map(([name, list]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      const merged = Array.from(new Set([...areas.filter((a) => a !== "Statewide"), ...list]));
                      onChange(merged);
                    }}
                    className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-border/60 text-muted-foreground hover:border-accent hover:text-accent transition-colors"
                  >
                    + {name}
                  </button>
                ))
              : Object.entries(MARINE_GROUPS).map(([name, list]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      const merged = Array.from(new Set([...areas.filter((a) => a !== "Statewide"), ...list]));
                      onChange(merged);
                    }}
                    className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-watch/40 text-watch hover:border-watch hover:bg-watch/10 transition-colors"
                  >
                    + {name}
                  </button>
                ))}
            {areas.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-border/60 text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tab === "land" ? "Search Michigan counties…" : "Search Great Lakes marine zones…"}
              className="pl-9"
            />
          </div>

          {areas.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {areas.map((a) => {
                const isMarine = MARINE_ZONES.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => onChange(areas.filter((x) => x !== a))}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-mono",
                      isMarine
                        ? "border-watch/60 bg-watch/10 text-watch hover:bg-watch/20"
                        : "border-accent/60 bg-accent/10 text-accent hover:bg-accent/20",
                    )}
                  >
                    {a} <X className="h-3 w-3" />
                  </button>
                );
              })}
            </div>
          )}

          <div className="max-h-56 overflow-y-auto rounded-md border border-border/60 divide-y divide-border/40">
            {matches.map((c) => (
              <label
                key={c}
                className="flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer hover:bg-accent/10"
              >
                <Checkbox checked={selected.has(c)} onCheckedChange={() => toggle(c)} />
                <span className="flex-1">{tab === "land" ? `${c} County` : c}</span>
              </label>
            ))}
            {matches.length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-4 text-center">No matches.</p>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {tab === "marine"
              ? "Marine zones cover Great Lakes waters touching Michigan. Use for marine warnings, small craft advisories, gales, etc."
              : "Selected counties appear as chips above. Pick as many as you need."}
          </p>
        </>
      )}
    </div>
  );
}
