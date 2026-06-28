import { createFileRoute } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { LightningPanel } from "@/components/LightningPanel";
import { ToolShell } from "@/routes/alerts-map";

export const Route = createFileRoute("/lightning")({
  head: () => ({
    meta: [
      { title: "Live Lightning — Michigan Weather Authority" },
      { name: "description", content: "Real-time lightning strike map over Michigan and the Great Lakes powered by Blitzortung." },
      { property: "og:title", content: "Live Lightning Strikes" },
      { property: "og:description", content: "Real-time strike data over Michigan." },
    ],
  }),
  component: LightningPage,
});

function LightningPage() {
  return (
    <ToolShell
      icon={<Zap className="h-5 w-5" />}
      eyebrow="Tool · Blitzortung"
      title="Live lightning strikes"
      blurb="Real-time cloud-to-ground strike data over Michigan and the Great Lakes basin from the Blitzortung community network."
    >
      <LightningPanel />
      <p className="text-xs text-muted-foreground">
        Strikes are detected by volunteer-run sensors. Density and accuracy varies; treat as situational awareness, not authoritative detection.
      </p>
    </ToolShell>
  );
}
