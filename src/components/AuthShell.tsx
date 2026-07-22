import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Radio, ShieldCheck, Activity } from "lucide-react";

/**
 * Modern, theme-aware auth shell.
 * Left panel: animated radar sweep + live tagline ribbon.
 * Right panel: glass card with the form.
 */
export function AuthShell({
  badge,
  title,
  subtitle,
  children,
}: {
  badge: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated backdrop */}
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--accent)/0.15),transparent_55%),radial-gradient(ellipse_at_bottom_right,hsl(var(--primary)/0.18),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:48px_48px] text-foreground" />
        <div className="absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full border border-accent/30 animate-[spin_30s_linear_infinite]">
          <div className="absolute inset-4 rounded-full border border-accent/20" />
          <div className="absolute inset-12 rounded-full border border-accent/15" />
          <div className="absolute top-1/2 left-1/2 w-1/2 h-px bg-gradient-to-r from-accent to-transparent origin-left rotate-45" />
        </div>
      </div>

      <div className="relative z-10 min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
        {/* Left brand panel */}
        <div className="hidden lg:flex flex-col justify-between p-12 border-r border-border/40 bg-card/30 backdrop-blur-sm">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-lg border border-accent/40 bg-accent/10 grid place-items-center group-hover:bg-accent/20 transition">
              <Radio className="h-5 w-5 text-accent" />
            </div>
            <div>
              <div className="font-display text-lg leading-none text-aurora">Michigan Weather Service</div>
              <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground mt-1">STORM CONSOLE · v3.3 BETA</div>
            </div>
          </Link>

          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent alert-pulse" />
              Systems nominal · Live feeds active
            </div>
            <h2 className="font-display text-5xl xl:text-6xl leading-tight text-aurora">
              The storm doesn't wait.<br />Neither should you.
            </h2>
            <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
              Sign in to lock in your home location, get instant push alerts when severe weather strikes your county, and unlock the broadcast console if you're authorized.
            </p>
            <div className="grid grid-cols-3 gap-3 max-w-md pt-4">
              <Feature icon={Activity} label="Live radar" />
              <Feature icon={ShieldCheck} label="Encrypted 2FA" />
              <Feature icon={Radio} label="EAS feed" />
            </div>
          </div>

          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            mwa · est. 2024 · operations stationed in lower michigan
          </p>
        </div>

        {/* Right form panel */}
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div className="w-full max-w-md mx-auto">
            <Link to="/" className="lg:hidden text-xs text-muted-foreground hover:text-accent inline-flex items-center gap-1 mb-6">
              <ArrowLeft className="h-3 w-3" /> Back to MWA
            </Link>

            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.25em] text-accent mb-3">
                {badge}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl text-aurora leading-tight">{title}</h1>
              <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
            </div>

            <div className="relative">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-accent/40 via-transparent to-primary/40 opacity-60 blur-sm" aria-hidden />
              <div className="relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl p-6 sm:p-8 space-y-5 shadow-glow">
                {children}
              </div>
            </div>

            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70 text-center mt-6">
              Protected by the National Weather Service feed · MWA Operations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex flex-col items-start gap-1.5 rounded-lg border border-border/60 bg-background/40 p-3">
      <Icon className="h-4 w-4 text-accent" />
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}
