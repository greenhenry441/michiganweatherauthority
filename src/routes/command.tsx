import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Radio, Send, Trash2, Lock, AlertTriangle, ArrowLeft, Sparkles, Search, X } from "lucide-react";
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
      <div className="min-h-screen grid place-items-center px-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-accent">
            <Lock className="h-4 w-4" />
            <span className="font-mono uppercase tracking-wider text-xs">Restricted</span>
          </div>
          <h1 className="font-display text-2xl">MWA Command Center</h1>
          <p className="text-sm text-muted-foreground">
            Enter operator access code to issue manual alerts.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (code === ACCESS_CODE) setUnlocked(true);
              else toast.error("Invalid access code");
            }}
            className="space-y-3"
          >
            <Input
              type="password"
              placeholder="Access code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
            />
            <Button type="submit" className="w-full">Authenticate</Button>
          </form>
          <p className="text-[10px] font-mono text-muted-foreground">
            Default: <span className="text-accent">mwa-admin</span>
          </p>
          <Link to="/" className="text-xs text-muted-foreground hover:text-accent inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Back to public site
          </Link>
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
    if (kind === "mwa-network" && !customName.trim()) {
      // OK — defaults handled below
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
    <div className="min-h-screen">
      <header className="border-b border-border bg-storm-deep/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-severe/20 border border-severe grid place-items-center">
              <Radio className="h-4 w-4 text-severe alert-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-severe">
                Command Center
              </p>
              <h1 className="font-display text-lg tracking-wider">MWA Operations Console</h1>
            </div>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" /> Public site
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-[1fr_360px] gap-6">
        <form onSubmit={issue} className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-alert" />
            <h2 className="font-display text-xl tracking-wider">Issue Alert</h2>
            <Badge variant="outline" className="ml-auto text-[10px] font-mono">
              Broadcasts live to all visitors
            </Badge>
          </div>

          <div className="space-y-1.5">
            <Label>Alert Channel</Label>
            <Tabs value={kind} onValueChange={(v) => setKind(v as AlertKind)}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="weather">Weather</TabsTrigger>
                <TabsTrigger value="eas">EAS</TabsTrigger>
                <TabsTrigger value="mwa-network">MWA Network</TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-[10px] text-muted-foreground">
              Weather → main weather ticker. EAS → separate Emergency ticker (tests, AMBER, civil). MWA Network → system status to all visitors.
            </p>
          </div>

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

          <div className="space-y-3 rounded-lg border border-border/60 bg-storm/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Scheduling</Label>
              <Tabs value={scheduleMode} onValueChange={(v) => setScheduleMode(v as "duration" | "window")}>
                <TabsList className="h-8">
                  <TabsTrigger value="duration" className="text-xs h-7">Duration</TabsTrigger>
                  <TabsTrigger value="window" className="text-xs h-7">Specific times</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {scheduleMode === "duration" ? (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Active for (minutes)</Label>
                  <Input
                    type="number" min={5} max={10080}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Starts now, expires {new Date(Date.now() + duration * 60_000).toLocaleString()}
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
          </div>

          <AreaPicker areas={areas} onChange={setAreas} />

          <div className="space-y-1.5">
            <Label>Headline</Label>
            <Input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Tornado spotted near Pontiac, take shelter immediately"
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={5} value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="At 4:32 PM EDT, a severe thunderstorm capable of producing a tornado was located..."
              maxLength={4000}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Instruction (optional)</Label>
            <Textarea
              rows={3} value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="TAKE COVER NOW! Move to an interior room on the lowest floor..."
              maxLength={2000}
            />
          </div>

          <Button type="submit" size="lg" disabled={submitting} className="w-full font-display tracking-wider">
            <Send className="h-4 w-4 mr-2" /> {submitting ? "Broadcasting…" : "Broadcast Alert"}
          </Button>
        </form>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-display tracking-wider text-sm uppercase text-muted-foreground mb-3">
              Active Manual Alerts ({alerts.length})
            </h3>
            {alerts.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No manual alerts active.
              </p>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {alerts.map((a) => {
                  const t = a.type_id
                    ? (getAlertType(a.type_id) ?? getEasType(a.type_id))
                    : undefined;
                  return (
                    <div
                      key={a.id}
                      className={cn(
                        "rounded-md border p-3 text-xs space-y-1",
                        a.category === "warning" && "border-warning/60 bg-warning/10",
                        a.category === "watch" && "border-watch/60 bg-watch/10",
                        a.category === "advisory" && "border-advisory/40 bg-advisory/5",
                        a.category === "statement" && "border-statement/40 bg-statement/10",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-display font-bold uppercase tracking-wider">
                            {t?.name ?? a.custom_name ?? "Alert"}
                          </span>
                          <Badge variant="outline" className="text-[9px] font-mono uppercase">
                            {a.kind === "eas" ? "EAS" : a.kind === "mwa-network" ? "Network" : "WX"}
                          </Badge>
                        </div>
                        <button
                          onClick={() => remove(a.id)}
                          className="text-muted-foreground hover:text-destructive"
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
    <div className="space-y-2 rounded-lg border border-border/60 bg-storm/30 p-3">
      <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Affected Areas</Label>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <Checkbox
          checked={isStatewide}
          onCheckedChange={(v) => onChange(v ? ["Statewide"] : [])}
        />
        Statewide (all of Michigan)
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
            <div className="flex flex-wrap gap-1.5 pt-1">
              {areas.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => onChange(areas.filter((x) => x !== a))}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-accent/60 bg-accent/10 text-accent text-[11px] font-mono"
                >
                  {a} <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}

          <div className="max-h-48 overflow-y-auto rounded-md border border-border divide-y divide-border/60">
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
