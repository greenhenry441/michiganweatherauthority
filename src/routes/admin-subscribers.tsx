import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { listPushSubscribers, revokeSubscription } from "@/lib/admin-analytics.functions";

export const Route = createFileRoute("/_authenticated/admin-subscribers")({
  head: () => ({ meta: [{ title: "Admin · Subscribers — MWA" }, { name: "robots", content: "noindex" }] }),
  component: AdminSubscribers,
});

function AdminSubscribers() {
  const qc = useQueryClient();
  const fetch = useServerFn(listPushSubscribers);
  const revoke = useServerFn(revokeSubscription);
  const q = useQuery({ queryKey: ["push-subs"], queryFn: () => fetch() });
  const m = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["push-subs"] }); toast.success("Revoked"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/command" className="text-xs text-muted-foreground hover:text-accent inline-flex items-center gap-1.5 min-h-11 px-2">
          <ArrowLeft className="h-4 w-4" /> Command
        </Link>
        <nav className="flex gap-2 text-xs">
          <Link to="/admin-analytics" className="text-accent hover:underline">Analytics</Link>
          <Link to="/admin-scheduler" className="text-accent hover:underline">Scheduler</Link>
          <Link to="/admin-audit" className="text-accent hover:underline">Audit</Link>
        </nav>
      </div>
      <h1 className="font-display text-3xl tracking-tight text-glow flex items-center gap-2">
        <Smartphone className="h-7 w-7" /> Push Subscribers
      </h1>
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {q.data?.length === 0 && <p className="p-4 text-sm text-muted-foreground">No subscriptions.</p>}
        {q.data?.map((s: any) => (
          <div key={s.id} className="p-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground font-mono truncate">
                {s.user_id ? s.user_id.slice(0, 8) + "…" : "anonymous"} · min={s.min_severity || "moderate"}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">{s.user_agent || s.endpoint}</div>
              <div className="text-[10px] text-muted-foreground">last seen: {new Date(s.updated_at || s.created_at).toLocaleString()}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => m.mutate(s.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      <Toaster />
    </div>
  );
}
