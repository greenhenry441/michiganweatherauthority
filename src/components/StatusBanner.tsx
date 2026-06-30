import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Info, Wrench, X } from "lucide-react";
import { listActiveStatusUpdates } from "@/lib/management.functions";

type Row = {
  id: string;
  kind: "alert" | "maintenance" | "info";
  severity: "info" | "warn" | "critical";
  title: string;
  message: string;
  link_url: string | null;
};

const DISMISS_KEY = "mwa.status-banner.dismissed";

export function StatusBanner() {
  const [rows, setRows] = useState<Row[]>([]);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const fetchActive = useServerFn(listActiveStatusUpdates);

  useEffect(() => {
    let alive = true;
    fetchActive()
      .then((data) => { if (alive) setRows((data as any) ?? []); })
      .catch(() => {});
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) setDismissed(JSON.parse(raw));
    } catch {}
    return () => { alive = false; };
  }, [fetchActive]);

  const dismiss = (id: string) => {
    const next = { ...dismissed, [id]: true };
    setDismissed(next);
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify(next)); } catch {}
  };

  const visible = rows.filter((r) => !dismissed[r.id]);
  if (visible.length === 0) return null;

  return (
    <div className="w-full space-y-1.5 px-3 pt-2">
      {visible.slice(0, 3).map((r) => {
        const tone =
          r.severity === "critical"
            ? "border-destructive/50 bg-destructive/10 text-destructive"
            : r.severity === "warn"
            ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            : "border-accent/40 bg-accent/10 text-accent";
        const Icon = r.kind === "maintenance" ? Wrench : r.kind === "alert" ? AlertTriangle : Info;
        return (
          <div
            key={r.id}
            role="status"
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${tone}`}
          >
            <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-display tracking-wide text-[12px] leading-snug">{r.title}</div>
              {r.message && (
                <div className="text-[11px] opacity-90 mt-0.5 whitespace-pre-wrap">{r.message}</div>
              )}
              {r.link_url && (
                <a href={r.link_url} target="_blank" rel="noreferrer" className="text-[11px] underline mt-0.5 inline-block">
                  Details
                </a>
              )}
            </div>
            <button
              onClick={() => dismiss(r.id)}
              aria-label="Dismiss"
              className="opacity-60 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
