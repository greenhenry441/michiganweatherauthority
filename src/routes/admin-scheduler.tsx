import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Calendar, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { listScheduledAlerts, createScheduledAlert, cancelScheduledAlert } from "@/lib/scheduled-alerts.functions";

export const Route = createFileRoute("/admin-scheduler")({
  head: () => ({ meta: [{ title: "Admin · Scheduler — MWA" }, { name: "robots", content: "noindex" }] }),
  component: AdminScheduler,
});

function AdminScheduler() {
  const qc = useQueryClient();
  const list = useServerFn(listScheduledAlerts);
  const create = useServerFn(createScheduledAlert);
  const cancel = useServerFn(cancelScheduledAlert);

  const q = useQuery({ queryKey: ["scheduled-alerts"], queryFn: () => list() });

  const [form, setForm] = useState({
    when: "",
    kind: "weather" as "weather" | "eas" | "mwa-network",
    severity: "moderate" as "extreme" | "severe" | "moderate" | "minor",
    category: "advisory" as "warning" | "watch" | "advisory" | "statement" | "extreme",
    headline: "",
    description: "",
    instruction: "",
    issuer: "Michigan Weather Authority",
    area: "Statewide",
    durationMinutes: 60,
    customName: "",
  });

  const addMut = useMutation({
    mutationFn: () => create({
      data: {
        send_at: new Date(form.when).toISOString(),
        payload: {
          kind: form.kind,
          typeId: null,
          customName: form.customName || null,
          category: form.category,
          severity: form.severity,
          headline: form.headline,
          description: form.description,
          instruction: form.instruction || null,
          areas: [form.area],
          issuer: form.issuer,
          durationMinutes: form.durationMinutes,
        } as any,
      } as any,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["scheduled-alerts"] }); toast.success("Scheduled"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/command" className="text-xs text-muted-foreground hover:text-accent inline-flex items-center gap-1.5 min-h-11 px-2">
          <ArrowLeft className="h-4 w-4" /> Command
        </Link>
        <nav className="flex gap-2 text-xs">
          <Link to="/admin-analytics" className="text-accent hover:underline">Analytics</Link>
          <Link to="/admin-audit" className="text-accent hover:underline">Audit</Link>
          <Link to="/admin-subscribers" className="text-accent hover:underline">Subscribers</Link>
        </nav>
      </div>
      <h1 className="font-display text-3xl tracking-tight text-glow flex items-center gap-2">
        <Calendar className="h-7 w-7" /> Broadcast Scheduler
      </h1>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-2">
          <div><Label>Send at (local time)</Label><Input type="datetime-local" value={form.when} onChange={(e) => setForm({ ...form, when: e.target.value })} /></div>
          <div><Label>Duration (minutes)</Label><Input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} /></div>
          <div>
            <Label>Severity</Label>
            <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["minor", "moderate", "severe", "extreme"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["warning", "watch", "advisory", "statement", "extreme"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>Headline</Label><Input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} /></div>
        <div><Label>Description</Label><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div><Label>Instruction (optional)</Label><Textarea rows={2} value={form.instruction} onChange={(e) => setForm({ ...form, instruction: e.target.value })} /></div>
        <div className="grid sm:grid-cols-2 gap-2">
          <div><Label>Area</Label><Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></div>
          <div><Label>Issuer</Label><Input value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} /></div>
        </div>
        <Button onClick={() => addMut.mutate()} disabled={!form.when || !form.headline || !form.description || addMut.isPending}>
          <Plus className="h-4 w-4 mr-1.5" /> Schedule
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        <div className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">Queued</div>
        {q.data?.length === 0 && <p className="p-4 text-sm text-muted-foreground">None.</p>}
        {q.data?.map((a: any) => (
          <div key={a.id} className="p-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{a.payload?.headline}</div>
              <div className="text-[11px] text-muted-foreground font-mono">
                {a.status} · {new Date(a.send_at).toLocaleString()} · {a.payload?.severity}
              </div>
              {a.error && <div className="text-[11px] text-destructive mt-1">{a.error}</div>}
            </div>
            {a.status === "pending" && (
              <Button size="sm" variant="ghost" onClick={() => cancel({ data: { id: a.id } }).then(() => qc.invalidateQueries({ queryKey: ["scheduled-alerts"] }))}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      <Toaster />
    </div>
  );
}
