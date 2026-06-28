import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Camera, RefreshCw, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/webcams")({
  head: () => ({
    meta: [
      { title: "Michigan Webcams — MWA" },
      { name: "description", content: "Live highway and sky cameras across Michigan." },
      { property: "og:title", content: "MWA Michigan Webcams" },
      { property: "og:description", content: "Live look-outdoors cameras from across Michigan." },
    ],
  }),
  component: WebcamsPage,
});

interface Cam { id: string; name: string; region: string; href: string; img?: string; }

// External live-cam pages. We link out for embedded video; some publishers
// also expose still images we can refresh — those go in `img`.
const CAMS: Cam[] = [
  { id: "macbridge", name: "Mackinac Bridge",       region: "Straits",    href: "https://www.mackinacbridge.org/about-the-bridge/bridge-cams/", img: "https://www.mackinacbridge.org/wp-content/uploads/cams/cam1.jpg" },
  { id: "soolocks", name: "Soo Locks",              region: "Sault Ste. Marie", href: "https://www.lre.usace.army.mil/Missions/Recreation/Soo-Locks-Visitor-Center/Soo-Locks-Cam/" },
  { id: "trav-bay", name: "Grand Traverse Bay",     region: "Traverse City", href: "https://www.traversecitytourism.com/about-traverse-city/grand-traverse-bay-webcam" },
  { id: "marquette",name: "Marquette Harbor",       region: "UP",         href: "https://www.travelmarquettemichigan.com/webcams/" },
  { id: "pictrock", name: "Pictured Rocks",         region: "UP",         href: "https://www.nps.gov/piro/learn/photosmultimedia/webcams.htm" },
  { id: "houghton", name: "Portage Lift Bridge",    region: "Keweenaw",   href: "https://www.mtu.edu/webcam/" },
  { id: "grandh",   name: "Grand Haven Pier",       region: "West MI",    href: "https://www.visitgrandhaven.com/webcams/" },
  { id: "sleep",    name: "Sleeping Bear Dunes",    region: "Northern LP",href: "https://www.nps.gov/slbe/learn/photosmultimedia/webcam.htm" },
  { id: "detskyl",  name: "Detroit Skyline (Belle Isle)", region: "Metro Detroit", href: "https://www.windsorite.ca/category/webcams/" },
  { id: "lans",     name: "Lansing — Capitol",      region: "Mid MI",     href: "https://www.lansingmi.gov/" },
  { id: "ports",    name: "Port Huron — Blue Water Bridge", region: "Thumb", href: "https://www.bluewaterbridge.ca/en/traffic/cameras.htm" },
  { id: "mdotcams", name: "MDOT Traffic Cameras",   region: "Statewide",  href: "https://mdotjboss.state.mi.us/MiDrive/map" },
];

function WebcamsPage() {
  const [region, setRegion] = useState<string>("All");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const regions = ["All", ...Array.from(new Set(CAMS.map((c) => c.region)))];
  const filtered = region === "All" ? CAMS : CAMS.filter((c) => c.region === region);

  return (
    <div className="min-h-screen relative z-10">
      <header className="border-b border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <span className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground font-mono inline-flex items-center gap-2">
            <Camera className="h-4 w-4" /> mwa · webcams
          </span>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.4em] text-accent font-mono mb-4">Look outside</p>
          <h1 className="font-display text-6xl md:text-7xl leading-[0.95] text-aurora">Michigan Webcams.</h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            A curated grid of public live cameras across the state — bridges, harbors, dunes, ski hills and capitol views. Tiles auto-refresh once a minute.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <button onClick={() => setTick((t) => t + 1)} className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-accent hover:underline">
              <RefreshCw className="h-3 w-3" /> Refresh now
            </button>
          </div>
          <div className="hairline mt-8" />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {regions.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={
                "text-xs font-mono px-3 py-1.5 rounded-md border transition-colors " +
                (r === region ? "border-accent bg-accent/15 text-accent" : "border-border/60 hover:border-accent/60")
              }
            >
              {r}
            </button>
          ))}
        </div>

        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <li key={c.id}>
              <a
                href={c.href} target="_blank" rel="noreferrer"
                className="block glass aurora-border liquid rounded-2xl overflow-hidden h-full group"
              >
                <div className="aspect-video bg-background/60 relative overflow-hidden">
                  {c.img ? (
                    <img
                      src={`${c.img}?t=${tick}`} alt={c.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center">
                      <Camera className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                  )}
                  <span className="absolute top-2 left-2 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-background/60 backdrop-blur border border-border/60">
                    {c.region}
                  </span>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <h3 className="font-display text-lg">{c.name}</h3>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-accent" />
                </div>
              </a>
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-muted-foreground text-center">
          Camera availability depends on each operator. If a tile is blank, click through for the official live feed.
        </p>
      </main>
    </div>
  );
}
