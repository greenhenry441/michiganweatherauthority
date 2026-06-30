// Public, shareable per-alert page. Renders SSR with full OG metadata so
// links posted to Facebook / Twitter / iMessage unfurl with the headline,
// areas, and severity. Anyone can view; no sign-in required.
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ArrowLeft, AlertTriangle, Clock, MapPin } from "lucide-react";

const fetchAlert = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: row, error } = await supabase
      .from("alerts")
      .select("id, kind, category, severity, headline, description, instruction, areas, issuer, issued_at, expires_at, custom_name")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return row as any;
  });

export const Route = createFileRoute("/alerts/$id")({
  loader: async ({ params }) => {
    const alert = await fetchAlert({ data: { id: params.id } });
    if (!alert) throw notFound();
    return { alert };
  },
  head: ({ loaderData }) => {
    const a = loaderData?.alert;
    if (!a) return { meta: [{ title: "Alert — MWA" }] };
    const title = `${(a.custom_name || a.headline).slice(0, 70)} — MWA`;
    const desc = `${a.severity.toUpperCase()} · ${(a.areas ?? []).join(", ").slice(0, 130)}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: AlertSharePage,
  errorComponent: ({ error }) => (
    <div className="max-w-2xl mx-auto p-6 text-center">
      <p className="text-destructive">{String(error)}</p>
      <Link to="/" className="text-accent underline text-sm">Back home</Link>
    </div>
  ),
  notFoundComponent: () => (
    <div className="max-w-2xl mx-auto p-10 text-center space-y-3">
      <h1 className="font-display text-2xl">Alert not found</h1>
      <p className="text-sm text-muted-foreground">It may have been canceled or expired.</p>
      <Link to="/" className="text-accent underline text-sm">Back to MWA</Link>
    </div>
  ),
});

const sevTone: Record<string, string> = {
  extreme: "bg-red-600 text-white",
  severe: "bg-orange-500 text-white",
  moderate: "bg-amber-400 text-black",
  minor: "bg-sky-400 text-black",
};

function AlertSharePage() {
  const { alert: a } = Route.useLoaderData();
  const expired = new Date(a.expires_at).getTime() < Date.now();
  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-6 space-y-5">
      <Link to="/" className="text-xs text-muted-foreground hover:text-accent inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Michigan Weather Authority
      </Link>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${sevTone[a.severity] ?? "bg-secondary"}`}>
            {a.severity}
          </span>
          <span className="text-[10px] font-mono uppercase text-muted-foreground">{a.kind} · {a.category}</span>
          {expired && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-secondary text-muted-foreground">
              expired
            </span>
          )}
        </div>
        <h1 className="font-display text-3xl tracking-tight flex items-start gap-2">
          <AlertTriangle className="h-7 w-7 text-accent mt-1 shrink-0" />
          <span>{a.custom_name || a.headline}</span>
        </h1>
        <p className="text-xs font-mono text-muted-foreground flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {(a.areas ?? []).join(", ")}</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />
            Issued {new Date(a.issued_at).toLocaleString()} · expires {new Date(a.expires_at).toLocaleString()}
          </span>
          <span>by {a.issuer}</span>
        </p>
      </header>
      <article className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{a.description}</p>
        {a.instruction && (
          <div className="rounded-md border border-accent/40 bg-accent/5 p-3">
            <p className="text-[10px] font-mono uppercase text-accent mb-1">Instruction</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{a.instruction}</p>
          </div>
        )}
      </article>
    </div>
  );
}
