import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Radio, Send, Trash2, Lock, AlertTriangle, ArrowLeft, Sparkles, Search, X,
  ShieldAlert, Megaphone, Network, Clock, MapPin, Eye, Activity,
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
import { useSharedAlerts } from "@/lib/alerts-store";
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

function CommandPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");

  if (!unlocked) {
    return (
      <div className="min-h-screen relative overflow-hidden grid place-items-center px-4">
        {/* Ambient backdrop */}
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

  const [typeId, setTypeId] = useState(NWS_ALERT_TYPES[0].id);
  const [easTypeId, setEasTypeId] = useState(EAS_ALERT_TYPES[0].id);

  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState<AlertCategory>("statement");
  const [customSeverity, setCustomSeverity] = useState<AlertSeverity>("moderate");

  const selectedTemplate = getAlertType(typeId);
  const selectedEas = getEasType(easTypeId);

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

  const formProgress = useMemo(() => {
    let s = 0;
    if (headline.trim()) s++;
    if (description.trim()) s++;
    if (areas.length > 0) s++;
    if (issuer.trim()) s++;
    return Math.round((s / 4) * 100);
  }, [headline, description, areas, issuer]);

  const issue = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const schedule =
        scheduleMode === "duration"
          ? { durationMinutes: Number(duration), startsImmediately: true, startsAt: null, endsAt: null }
          : {
              startsImmediately,
              startsAt: startsImmediately || !startsAtLocal ? null : new Date(startsAtLocal).toISOString(),
              endsAt: endsAtLocal ? new Date(endsAtLocal).toISOString() : null,
              durationMinutes: null,
            };
      if (scheduleMode === "window" && !endsAtLocal) {
        toast.error("Pick an end date/time, or switch to Duration mode");
        setSubmitting(false);
        return;
      }
      await issueFn({
        data: {
          ...payload,
          headline: headline.trim(),
          description: description.trim(),
          instruction: instruction.trim() || null,
          areas,
          issuer: issuer.trim() || "MWA",
          ...schedule,
        },
      });
      toast.success("Alert broadcast to all visitors");
      setHeadline(""); setDescription(""); setInstruction("");
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

  return (
    <div className="min-h-screen relative">
      {/* Ambient backdrop */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(1100px 700px at 10% -10%, color-mix(in oklab, var(--severe) 14%, transparent), transparent 60%), radial-gradient(900px 600px at 110% 110%, color-mix(in oklab, var(--accent) 10%, transparent), transparent 60%)",
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
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" /> Public site
            </Button>
          </Link>
        </div>
        {/* Progress bar */}
        <div className="h-px bg-border/40 relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent via-amber-alert to-severe transition-all duration-500"
            style={{ width: `${formProgress}%` }}
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-[1fr_380px] gap-6">
        <form onSubmit={issue} className="space-y-6">
          {/* Editorial title */}
          <div className="flex items-end justify-between border-b border-border/60 pb-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground">
                Section 01 — Compose
              </p>
              <h2 className="font-display text-3xl md:text-4xl tracking-wide flex items-center gap-3">
                <AlertTriangle className="h-7 w-7 text-amber-alert" />
                Issue Alert
              </h2>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono hidden sm:inline-flex">
              Broadcasts live · all visitors
            </Badge>
          </div>

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
                    {[15, 30, 60, 120, 360].map((m) => (
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

          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="w-full font-display tracking-wider h-12 text-base bg-gradient-to-r from-severe via-amber-alert to-severe bg-[length:200%_100%] hover:bg-[position:100%_0] transition-all"
          >
            <Send className="h-4 w-4 mr-2" /> {submitting ? "Broadcasting…" : "Broadcast Alert"}
          </Button>
        </form>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
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
                {alerts.length}
              </Badge>
            </div>
            {alerts.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <div className="mx-auto h-10 w-10 rounded-full glass grid place-items-center">
                  <Radio className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  No manual alerts active.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 -mr-1">
                {alerts.map((a) => {
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
                        <button
                          onClick={() => remove(a.id)}
                          className="text-muted-foreground hover:text-destructive opacity-60 group-hover:opacity-100 transition-opacity"
                          aria-label="Cancel alert"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
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
        </aside>
      </main>
      <Toaster />
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

function AreaPicker({ areas, onChange }: { areas: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const isStatewide = areas.includes("Statewide");
  const selected = new Set(areas);

  const matches = useMemo(() => {
    if (!q.trim()) return MICHIGAN_COUNTIES.slice(0, 12);
    const term = q.toLowerCase();
    return MICHIGAN_COUNTIES.filter((c) => c.toLowerCase().includes(term)).slice(0, 20);
  }, [q]);

  const toggle = (county: string) => {
    if (selected.has(county)) onChange(areas.filter((a) => a !== county));
    else onChange([...areas.filter((a) => a !== "Statewide"), county]);
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search Michigan counties…"
              className="pl-9"
            />
          </div>

          {areas.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {areas.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => onChange(areas.filter((x) => x !== a))}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-accent/60 bg-accent/10 text-accent text-[11px] font-mono hover:bg-accent/20"
                >
                  {a} <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}

          <div className="max-h-48 overflow-y-auto rounded-md border border-border/60 divide-y divide-border/40">
            {matches.map((c) => (
              <label
                key={c}
                className="flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer hover:bg-accent/10"
              >
                <Checkbox checked={selected.has(c)} onCheckedChange={() => toggle(c)} />
                <span className="flex-1">{c} County</span>
              </label>
            ))}
            {matches.length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-4 text-center">No matches.</p>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Selected counties appear as chips above. Pick as many as you need.
          </p>
        </>
      )}
    </div>
  );
}
