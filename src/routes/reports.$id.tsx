import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, MapPin, Send, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { getReportThread, reactToReport, commentOnReport } from "@/lib/spotter-reports.functions";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export const Route = createFileRoute("/reports/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Spotter report — MWA` },
      { name: "description", content: `Storm spotter report details on the Michigan Weather Authority network.` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportDetail,
});

function ReportDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const fetchThread = useServerFn(getReportThread);
  const react = useServerFn(reactToReport);
  const comment = useServerFn(commentOnReport);

  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, []);

  const thread = useQuery({
    queryKey: ["report-thread", id],
    queryFn: () => fetchThread({ data: { report_id: id } }),
  });

  const reactMut = useMutation({
    mutationFn: (kind: "confirm" | "doubt") => react({ data: { report_id: id, kind } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["report-thread", id] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const [body, setBody] = useState("");
  const commentMut = useMutation({
    mutationFn: () => comment({ data: { report_id: id, body } }),
    onSuccess: () => { setBody(""); qc.invalidateQueries({ queryKey: ["report-thread", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const r: any = thread.data?.report;
  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Link to="/reports" className="text-xs text-muted-foreground hover:text-accent inline-flex items-center gap-1.5 min-h-11 px-2">
        <ArrowLeft className="h-4 w-4" /> All reports
      </Link>

      {!r ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <article className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-2xl tracking-tight capitalize">{r.kind.replace("_", " ")}</h1>
            {r.measurement && <span className="text-xs font-mono text-accent">{r.measurement}</span>}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <MapPin className="h-3 w-3" />
            {r.location_label || `${r.lat.toFixed(3)}, ${r.lon.toFixed(3)}`}
            <span>·</span>
            <span>{new Date(r.created_at).toLocaleString()}</span>
          </div>
          {r.photo_url && (
            <img src={r.photo_url} alt="" className="rounded-lg max-h-96 object-contain w-full bg-black" />
          )}
          {r.notes && <p className="text-sm whitespace-pre-wrap">{r.notes}</p>}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline" size="sm"
              disabled={!signedIn || reactMut.isPending}
              onClick={() => reactMut.mutate("confirm")}
            >
              <ThumbsUp className="h-3.5 w-3.5 mr-1.5" /> Confirm · {r.confirmed_count}
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={!signedIn || reactMut.isPending}
              onClick={() => reactMut.mutate("doubt")}
            >
              <ThumbsDown className="h-3.5 w-3.5 mr-1.5" /> Doubt · {r.doubt_count}
            </Button>
          </div>
        </article>
      )}

      <section className="space-y-3">
        <h2 className="font-display tracking-wider uppercase text-xs text-accent">Comments</h2>
        {thread.data?.comments.map((c: any) => (
          <div key={c.id} className="rounded-lg border border-border bg-card p-3">
            <div className="text-[10px] font-mono text-muted-foreground mb-1">
              {c.user_id.slice(0, 8)}… · {new Date(c.created_at).toLocaleString()}
            </div>
            <p className="text-sm whitespace-pre-wrap">{c.body}</p>
          </div>
        ))}
        {!thread.data?.comments?.length && (
          <p className="text-xs text-muted-foreground">No comments yet.</p>
        )}
        {signedIn ? (
          <div className="space-y-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add details, ask for confirmation, share what you saw…"
              rows={3}
              maxLength={2000}
            />
            <Button
              size="sm"
              disabled={commentMut.isPending || !body.trim()}
              onClick={() => commentMut.mutate()}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" /> Post comment
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            <Link to="/auth" className="text-accent underline">Sign in</Link> to confirm reports or comment.
          </p>
        )}
      </section>
      <Toaster />
    </div>
  );
}
