import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { ArrowLeft, MapPin, Camera, Send, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { createReport } from "@/lib/spotter-reports.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/spotter")({
  head: () => ({ meta: [{ title: "Submit spotter report — MWA" }, { name: "robots", content: "noindex" }] }),
  component: SpotterSubmit,
});

const KINDS = [
  { id: "tornado", label: "Tornado" },
  { id: "funnel", label: "Funnel cloud" },
  { id: "wall_cloud", label: "Wall cloud" },
  { id: "hail", label: "Hail" },
  { id: "wind_damage", label: "Wind damage" },
  { id: "flooding", label: "Flooding" },
  { id: "heavy_snow", label: "Heavy snow" },
  { id: "ice", label: "Ice / freezing rain" },
  { id: "other", label: "Other" },
];

function SpotterSubmit() {
  const nav = useNavigate();
  const submit = useServerFn(createReport);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    kind: "hail",
    measurement: "",
    lat: null as number | null,
    lon: null as number | null,
    location_label: "",
    notes: "",
  });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const useLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not available"); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setForm((f) => ({ ...f, lat: p.coords.latitude, lon: p.coords.longitude })),
      (e) => toast.error(e.message),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const onFile = async (file: File) => {
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) throw new Error("Sign in required");
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("storm-photos").upload(path, file, {
        cacheControl: "31536000", upsert: false,
      });
      if (error) throw error;
      const { data: signed, error: sErr } = await supabase.storage
        .from("storm-photos").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (sErr) throw sErr;
      setPhotoUrl(signed.signedUrl);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const mutation = useMutation({
    mutationFn: () => submit({ data: { ...form, photo_url: photoUrl } as any }),
    onSuccess: (row: any) => {
      toast.success("Report submitted");
      nav({ to: "/reports/$id", params: { id: row.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit = form.lat != null && form.lon != null && !!form.kind;

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Link to="/reports" className="text-xs text-muted-foreground hover:text-accent inline-flex items-center gap-1.5 min-h-11 px-2">
        <ArrowLeft className="h-4 w-4" /> Back to reports
      </Link>

      <div>
        <h1 className="font-display text-3xl tracking-tight text-glow">Submit a spotter report</h1>
        <p className="text-sm text-muted-foreground">Help confirm what's happening on the ground.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={form.kind} onValueChange={(v) => setForm((f) => ({ ...f, kind: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{KINDS.map((k) => <SelectItem key={k.id} value={k.id}>{k.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Measurement (optional)</Label>
          <Input
            value={form.measurement}
            placeholder='e.g. "1.5 in hail", "60 mph gust", "8 in snow"'
            maxLength={80}
            onChange={(e) => setForm((f) => ({ ...f, measurement: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Location</Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={form.lat != null ? `${form.lat.toFixed(4)}, ${form.lon!.toFixed(4)}` : "— not set —"}
            />
            <Button type="button" variant="outline" onClick={useLocation}>
              <Crosshair className="h-3.5 w-3.5 mr-1.5" /> Use my location
            </Button>
          </div>
          <Input
            value={form.location_label}
            placeholder="Optional label (e.g. 'Grand Rapids, MI - north side')"
            maxLength={160}
            onChange={(e) => setForm((f) => ({ ...f, location_label: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea
            rows={4} maxLength={2000}
            value={form.notes}
            placeholder="What did you see? Any damage, duration, direction of movement?"
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Photo (optional)</Label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          {photoUrl ? (
            <div className="flex items-center gap-3">
              <img src={photoUrl} alt="" className="h-20 w-20 object-cover rounded-md" />
              <Button variant="outline" size="sm" onClick={() => setPhotoUrl(null)}>Remove</Button>
            </div>
          ) : (
            <Button variant="outline" type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Camera className="h-3.5 w-3.5 mr-1.5" /> {uploading ? "Uploading…" : "Add photo"}
            </Button>
          )}
        </div>

        <Button
          size="lg" className="w-full"
          disabled={!canSubmit || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          <Send className="h-4 w-4 mr-2" /> {mutation.isPending ? "Submitting…" : "Submit report"}
        </Button>
      </div>
      <Toaster />
    </div>
  );
}
