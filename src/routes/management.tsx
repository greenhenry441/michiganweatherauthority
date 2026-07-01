import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Lock, ShieldCheck, Loader2, Plus, Trash2, Power, ExternalLink, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  isManagementUnlocked,
  unlockManagement,
  lockManagement,
  listStatusUpdatesAdmin,
  createStatusUpdate,
  toggleStatusUpdate,
  deleteStatusUpdate,
} from "@/lib/management.functions";

export const Route = createFileRoute("/management")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Management · MWA" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ManagementPage,
});

function ManagementPage() {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const check = useServerFn(isManagementUnlocked);

  useEffect(() => {
    let alive = true;
    check().then((r) => { if (alive) setUnlocked(!!r.unlocked); }).catch(() => setUnlocked(false));
    return () => { alive = false; };
  }, [check]);

  if (unlocked === null) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!unlocked) return <UnlockForm onUnlocked={() => setUnlocked(true)} />;
  return <Console onLock={() => setUnlocked(false)} />;
}

function UnlockForm({ onUnlocked }: { onUnlocked: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const unlock = useServerFn(unlockManagement);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    try {
      const res = await unlock({ data: { password } });
      if (!res.ok) { toast.error("Incorrect password."); return; }
      toast.success("Management unlocked");
      onUnlocked();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--accent)/0.15),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:32px_32px] text-foreground" />
      </div>
      <div className="relative z-10 min-h-screen grid place-items-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="h-14 w-14 rounded-xl border border-accent/40 bg-accent/10 grid place-items-center mb-3">
              <ShieldCheck className="h-7 w-7 text-accent" />
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.3em] text-accent mb-3">
              <Lock className="h-3 w-3" /> Owner area
            </span>
            <h1 className="font-display text-3xl sm:text-4xl">Management</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              Single-owner console. Enter the management password to continue.
            </p>
          </div>
          <form onSubmit={submit} className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl p-6 sm:p-8 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">Password</Label>
              <Input type="password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-11 font-mono" />
            </div>
            <Button type="submit" disabled={busy || !password} className="w-full h-11 font-display tracking-wider">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Unlock"}
            </Button>
          </form>
        </div>
      </div>
      <Toaster />
    </div>
  );
}

function Console({ onLock }: { onLock: () => void }) {
  const qc = useQueryClient();
  const list = useServerFn(listStatusUpdatesAdmin);
  const lock = useServerFn(lockManagement);

  const updates = useQuery({
    queryKey: ["management", "status_updates"],
    queryFn: () => list(),
  });

  const handleLock = async () => {
    await lock();
    toast.success("Locked");
    onLock();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <h1 className="font-display tracking-wider uppercase text-sm">Management</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground">
              ← back to site
            </Link>
            <Button variant="outline" size="sm" onClick={handleLock} className="h-8 gap-1.5">
              <LogOut className="h-3.5 w-3.5" /> Lock
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        <Shortcuts />

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display tracking-wider uppercase text-sm text-accent">Status updates</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Posts a banner across the public site while active. Use for alerts, maintenance, or info.
              </p>
            </div>
          </div>

          <NewStatusForm onCreated={() => qc.invalidateQueries({ queryKey: ["management", "status_updates"] })} />

          <div className="rounded-xl border border-border/60 bg-card/60 divide-y divide-border/60">
            {updates.isLoading && (
              <div className="p-4 text-xs text-muted-foreground"><Loader2 className="inline h-3.5 w-3.5 animate-spin mr-1.5" /> Loading…</div>
            )}
            {!updates.isLoading && (updates.data?.length ?? 0) === 0 && (
              <div className="p-4 text-xs text-muted-foreground">No status updates yet.</div>
            )}
            {updates.data?.map((u: any) => (
              <StatusRow
                key={u.id}
                row={u}
                onChanged={() => qc.invalidateQueries({ queryKey: ["management", "status_updates"] })}
              />
            ))}
          </div>
        </section>
      </main>

      <Toaster />
    </div>
  );
}

function Shortcuts() {
  const items: Array<{ to: string; label: string; desc: string }> = [
    { to: "/admin-scheduler", label: "Broadcast scheduler", desc: "Compose & schedule push alerts" },
    { to: "/admin-analytics", label: "Analytics", desc: "Subscriptions, deliveries, reports" },
    { to: "/admin-audit", label: "Audit log", desc: "Admin & dispatcher activity" },
    { to: "/admin-subscribers", label: "Subscribers", desc: "Push subscriber registry" },
    { to: "/dispatcher-health", label: "Dispatcher health", desc: "Nightly self-test results" },
    { to: "/changelog", label: "Changelog", desc: "Public release notes" },
  ];
  return (
    <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {items.map((it) => (
        <a
          key={it.to}
          href={it.to}
          className="group rounded-xl border border-border/60 bg-card/60 p-3 hover:border-accent/50 hover:bg-accent/5 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="font-display tracking-wide uppercase text-[11px] text-foreground">{it.label}</div>
            <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-accent" />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{it.desc}</div>
        </a>
      ))}
    </section>
  );
}

function NewStatusForm({ onCreated }: { onCreated: () => void }) {
  const create = useServerFn(createStatusUpdate);
  const [kind, setKind] = useState<"alert" | "maintenance" | "info">("info");
  const [severity, setSeverity] = useState<"info" | "warn" | "critical">("info");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      await create({
        data: {
          kind,
          severity,
          title: title.trim(),
          message: message.trim(),
          link_url: linkUrl.trim() ? linkUrl.trim() : null,
          active: true,
        },
      });
      setTitle(""); setMessage(""); setLinkUrl("");
      toast.success("Posted");
      onCreated();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-border/60 bg-card/60 p-3 sm:p-4 space-y-3">
      <div className="grid sm:grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Kind</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as any)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alert">Alert</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Severity</Label>
          <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 sm:col-span-1">
          <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Link (optional)</Label>
          <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" className="h-9" />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Severe weather statement — UPDATED" required maxLength={160} className="h-9" />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Message</Label>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Short note shown on the public banner." rows={3} maxLength={2000} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={busy || !title.trim()} className="gap-1.5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Post
        </Button>
      </div>
    </form>
  );
}

function StatusRow({ row, onChanged }: { row: any; onChanged: () => void }) {
  const toggle = useServerFn(toggleStatusUpdate);
  const remove = useServerFn(deleteStatusUpdate);
  const [busy, setBusy] = useState(false);

  const sevTone =
    row.severity === "critical" ? "border-destructive/40 bg-destructive/10 text-destructive"
    : row.severity === "warn" ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
    : "border-accent/40 bg-accent/10 text-accent";

  return (
    <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${sevTone}`}>
            {row.kind} · {row.severity}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {new Date(row.created_at).toLocaleString()}
          </span>
        </div>
        <div className="mt-1 font-display tracking-wide text-sm">{row.title}</div>
        {row.message && <div className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{row.message}</div>}
        {row.link_url && (
          <a href={row.link_url} target="_blank" rel="noreferrer" className="text-[11px] font-mono text-accent hover:underline mt-1 inline-block">
            {row.link_url}
          </a>
        )}
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
          <Power className="h-3 w-3" />
          <Switch
            checked={row.active}
            disabled={busy}
            onCheckedChange={async (v) => {
              setBusy(true);
              try { await toggle({ data: { id: row.id, active: v } }); onChanged(); }
              catch (e) { toast.error((e as Error).message); }
              finally { setBusy(false); }
            }}
          />
        </label>
        <Button
          variant="ghost" size="sm" disabled={busy}
          onClick={async () => {
            if (!confirm("Delete this status update?")) return;
            setBusy(true);
            try { await remove({ data: { id: row.id } }); toast.success("Deleted"); onChanged(); }
            catch (e) { toast.error((e as Error).message); }
            finally { setBusy(false); }
          }}
          className="text-destructive hover:text-destructive h-8 gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
