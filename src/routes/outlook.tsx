import { createFileRoute } from "@tanstack/react-router";
import { CloudLightning } from "lucide-react";
import { SevereOutlookPanel } from "@/components/SevereOutlookPanel";
import { ToolShell } from "@/routes/alerts-map";

export const Route = createFileRoute("/outlook")({
  head: () => ({
    meta: [
      { title: "SPC Severe Outlook — Michigan Weather Authority" },
      { name: "description", content: "Storm Prediction Center convective outlook for Days 1 through 8 over Michigan and the Great Lakes." },
      { property: "og:title", content: "SPC Severe Outlook" },
      { property: "og:description", content: "Convective risk maps for Days 1–8 from NOAA SPC." },
    ],
  }),
  component: OutlookPage,
});

function OutlookPage() {
  return (
    <ToolShell
      icon={<CloudLightning className="h-5 w-5" />}
      eyebrow="Tool · NOAA SPC"
      title="Severe weather outlook"
      blurb="Storm Prediction Center convective risk for Days 1, 2, 3, and the 4–8 day extended window. Updated multiple times daily."
    >
      <SevereOutlookPanel />
      <div className="glass rounded-2xl p-5 text-sm text-foreground/85 leading-relaxed">
        <h2 className="font-display text-xl mb-2">How to read it</h2>
        <ul className="space-y-1.5 list-disc pl-5 text-[13px]">
          <li><span className="font-mono uppercase text-accent">TSTM</span> — general thunderstorm risk, no severe expected.</li>
          <li><span className="font-mono uppercase text-accent">MRGL / SLGT</span> — isolated to scattered severe storms possible.</li>
          <li><span className="font-mono uppercase text-accent">ENH</span> — numerous severe storms likely, organized hazards.</li>
          <li><span className="font-mono uppercase text-accent">MDT</span> — widespread / intense severe weather expected.</li>
          <li><span className="font-mono uppercase text-accent">HIGH</span> — rare; a regional outbreak is expected.</li>
        </ul>
      </div>
    </ToolShell>
  );
}
