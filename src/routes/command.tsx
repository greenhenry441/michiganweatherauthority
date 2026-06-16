import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Radio, Send, Trash2, Lock, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { NWS_ALERT_TYPES, getAlertType } from "@/lib/nws-alert-types";
import { addAlert, removeAlert, useManualAlerts } from "@/lib/alerts-store";
import { MICHIGAN_CITIES } from "@/lib/michigan-cities";
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

const ACCESS_CODE = "mwa-admin"; // simple gate; replace with auth if needed

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
            Enter operator access code to issue manual weather alerts.
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

  return <CommandConsole />;
}

function CommandConsole() {
  const alerts = useManualAlerts();
  const [typeId, setTypeId] = useState(NWS_ALERT_TYPES[0].id);
  const [headline, setHeadline] = useState("");
  const [areas, setAreas] = useState("Statewide");
  const [description, setDescription] = useState("");
  const [instruction, setInstruction] = useState("");
  const [duration, setDuration] = useState(60); // minutes
  const [issuer, setIssuer] = useState("MWA Operations");

  const selected = getAlertType(typeId);

  const issue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headline.trim() || !description.trim()) {
      toast.error("Headline and description are required");
      return;
    }
    const areaList = areas
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    addAlert({
      typeId,
      headline: headline.trim(),
      areas: areaList.length ? areaList : ["Statewide"],
      description: description.trim(),
      instruction: instruction.trim() || undefined,
      expiresAt: new Date(Date.now() + duration * 60_000).toISOString(),
      issuer: issuer.trim() || "MWA",
    });
    toast.success(`${selected?.name} issued for ${areaList.join(", ") || "Statewide"}`);
    setHeadline("");
    setDescription("");
    setInstruction("");
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
            <h2 className="font-display text-xl tracking-wider">Issue Weather Alert</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Alert Product</Label>
              <Select value={typeId} onValueChange={setTypeId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[320px]">
                  {NWS_ALERT_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selected && (
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="outline" className="capitalize">{selected.category}</Badge>
                  <Badge variant="outline" className="capitalize">{selected.severity}</Badge>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                min={5}
                max={1440}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
              <p className="text-[10px] text-muted-foreground">
                Expires {new Date(Date.now() + duration * 60_000).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Affected Areas</Label>
            <Input
              value={areas}
              onChange={(e) => setAreas(e.target.value)}
              placeholder="Detroit, Wayne, Macomb — or 'Statewide'"
            />
            <p className="text-[10px] text-muted-foreground">
              Comma-separate city or county names. Use "Statewide" for all of Michigan.
            </p>
            <div className="flex flex-wrap gap-1 pt-1">
              {["Statewide", "Detroit", "Grand Rapids", "Lansing", "Wayne", "Oakland", "Marquette"].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAreas(q)}
                  className="text-[10px] px-2 py-0.5 rounded border border-border hover:border-accent hover:text-accent font-mono"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Headline</Label>
            <Input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Tornado spotted near Pontiac, take shelter immediately"
              maxLength={140}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="At 4:32 PM EDT, a severe thunderstorm capable of producing a tornado was located 5 miles west of..."
              maxLength={2000}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Instruction (optional)</Label>
            <Textarea
              rows={3}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="TAKE COVER NOW! Move to an interior room on the lowest floor..."
              maxLength={1000}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Issued by</Label>
            <Input value={issuer} onChange={(e) => setIssuer(e.target.value)} />
          </div>

          <Button type="submit" size="lg" className="w-full font-display tracking-wider">
            <Send className="h-4 w-4 mr-2" /> Broadcast Alert
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
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {alerts.map((a) => {
                  const t = getAlertType(a.typeId);
                  return (
                    <div
                      key={a.id}
                      className={cn(
                        "rounded-md border p-3 text-xs space-y-1",
                        t?.category === "warning" && "border-warning/60 bg-warning/10",
                        t?.category === "watch" && "border-watch/60 bg-watch/10",
                        t?.category === "advisory" && "border-advisory/40 bg-advisory/5",
                        t?.category === "statement" && "border-statement/40 bg-statement/10",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-display font-bold uppercase tracking-wider">
                          {t?.name}
                        </span>
                        <button
                          onClick={() => {
                            removeAlert(a.id);
                            toast.message("Alert cancelled");
                          }}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Cancel alert"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="font-medium">{a.headline}</p>
                      <p className="text-muted-foreground line-clamp-2">{a.description}</p>
                      <div className="flex items-center justify-between pt-1 font-mono text-[10px] text-muted-foreground">
                        <span>{a.areas.join(", ")}</span>
                        <span>exp {new Date(a.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground space-y-2">
            <p className="font-display uppercase tracking-wider text-accent">Notes</p>
            <p>Cities in this directory: {MICHIGAN_CITIES.length}.</p>
            <p>NWS alerts for Michigan are auto-polled every 2 minutes on the public site.</p>
            <p>Manual alerts here are stored in this browser. Upgrade to Lovable Cloud for cross-visitor broadcasts.</p>
          </div>
        </aside>
      </main>
      <Toaster />
    </div>
  );
}
