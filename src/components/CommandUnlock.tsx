import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { unlockCommand } from "@/lib/command-gate.functions";

export function CommandUnlock({ onUnlocked }: { onUnlocked: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const unlock = useServerFn(unlockCommand);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    try {
      const res = await unlock({ data: { password } });
      if (!res.ok) {
        toast.error("Invalid password.");
        return;
      }
      toast.success("Command unlocked");
      onUnlocked();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* backdrop */}
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--destructive)/0.18),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:32px_32px] text-foreground" />
      </div>

      <div className="relative z-10 min-h-screen grid place-items-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="h-14 w-14 rounded-xl border border-destructive/40 bg-destructive/10 grid place-items-center mb-3">
              <ShieldAlert className="h-7 w-7 text-destructive" />
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.3em] text-destructive mb-3">
              <Lock className="h-3 w-3" /> Restricted area
            </span>
            <h1 className="font-display text-3xl sm:text-4xl text-aurora">MWA Command</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              Authorized broadcasters only. Enter the command password to continue.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-destructive/40 via-transparent to-accent/40 opacity-60 blur-sm" aria-hidden />
            <form onSubmit={submit} className="relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl p-6 sm:p-8 space-y-5 shadow-glow">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">Command password</Label>
                <Input type="password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••" className="h-11 font-mono" />
              </div>

              <Button type="submit" disabled={busy || !password} className="w-full h-11 font-display tracking-wider">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Unlock Command"}
              </Button>

              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground text-center">
                Attempts are logged · Rate-limited 5 / 15min
              </p>
            </form>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
