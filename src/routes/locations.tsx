import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, MapPin, Home, Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  listMyLocations, addLocation, deleteLocation, setHomeLocation, geocodeLocation,
} from "@/lib/saved-locations.functions";

export const Route = createFileRoute("/locations")({
  head: () => ({ meta: [{ title: "Saved locations — MWA" }, { name: "robots", content: "noindex" }] }),
  component: LocationsPage,
});

function LocationsPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listMyLocations);
  const add = useServerFn(addLocation);
  const del = useServerFn(deleteLocation);
  const setHome = useServerFn(setHomeLocation);
  const geocode = useServerFn(geocodeLocation);

  const list = useQuery({ queryKey: ["my-locations"], queryFn: () => fetchList() });
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{ label: string; lat: number; lon: number }>>([]);

  const search = async () => {
    if (!q.trim()) return;
    try { setResults(await geocode({ data: { query: q } })); }
    catch (e) { toast.error((e as Error).message); }
  };

  const addMut = useMutation({
    mutationFn: (loc: { label: string; lat: number; lon: number; is_home?: boolean }) =>
      add({ data: loc }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-locations"] }); setResults([]); setQ(""); toast.success("Saved"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-locations"] }),
  });
  const homeMut = useMutation({
    mutationFn: (id: string) => setHome({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-locations"] }),
  });

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Link to="/settings" className="text-xs text-muted-foreground hover:text-accent inline-flex items-center gap-1.5 min-h-11 px-2">
        <ArrowLeft className="h-4 w-4" /> Settings
      </Link>
      <div>
        <h1 className="font-display text-3xl tracking-tight text-glow">Saved Locations</h1>
        <p className="text-sm text-muted-foreground">Home city drives your daily briefing and threshold alerts.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Search a US city…"
            />
          </div>
          <Button onClick={search} variant="outline">Search</Button>
        </div>
        {results.length > 0 && (
          <div className="divide-y divide-border rounded-md border border-border">
            {results.map((r) => (
              <div key={`${r.lat},${r.lon}`} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="flex items-center gap-2"><MapPin className="h-3 w-3 text-muted-foreground" /> {r.label}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => addMut.mutate({ label: r.label, lat: r.lat, lon: r.lon })}>
                    <Plus className="h-3 w-3 mr-1" /> Save
                  </Button>
                  <Button size="sm" onClick={() => addMut.mutate({ label: r.label, lat: r.lat, lon: r.lon, is_home: true })}>
                    <Home className="h-3 w-3 mr-1" /> Set as home
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {list.data?.length === 0 && <p className="p-4 text-sm text-muted-foreground">No saved locations yet.</p>}
        {list.data?.map((l: any) => (
          <div key={l.id} className="flex items-center gap-3 p-3">
            <div className="h-9 w-9 rounded-lg bg-accent/10 grid place-items-center">
              {l.is_home ? <Home className="h-4 w-4 text-accent" /> : <MapPin className="h-4 w-4 text-accent" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{l.label}</div>
              <div className="text-[11px] text-muted-foreground font-mono">{l.lat.toFixed(3)}, {l.lon.toFixed(3)}</div>
            </div>
            {!l.is_home && (
              <Button size="sm" variant="outline" onClick={() => homeMut.mutate(l.id)}>
                <Home className="h-3 w-3 mr-1" /> Make home
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={() => delMut.mutate(l.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      <Toaster />
    </div>
  );
}
