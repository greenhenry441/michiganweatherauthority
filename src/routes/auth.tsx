import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Radio, ArrowLeft, Mail, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Michigan Weather Authority" },
      { name: "description", content: "Sign in or create your MWA account to save your home location and get weather alert notifications." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) nav({ to: "/" });
    });
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created");
        nav({ to: "/settings" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        nav({ to: "/" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="text-xs text-muted-foreground hover:text-accent inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="h-3 w-3" /> Back to MWA
        </Link>
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-glow">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent/10 border border-accent/40 grid place-items-center">
              <Radio className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="font-display text-xl tracking-wide">MWA Account</h1>
              <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                Save your location · Get alert notifications
              </p>
            </div>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <form onSubmit={submit} className="space-y-3 pt-4">
              <TabsContent value="signup" className="space-y-3 m-0">
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono uppercase tracking-wider">Display name</Label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your display name"
                    disabled={busy}
                  />
                </div>
              </TabsContent>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono uppercase tracking-wider">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={busy}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono uppercase tracking-wider">Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={busy}
                  required
                />
              </div>

              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Loading…" : tab === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>
          </Tabs>

          <p className="text-[10px] font-mono text-muted-foreground text-center">
            {tab === "signin" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setTab(tab === "signin" ? "signup" : "signin")} className="text-accent hover:underline">
              {tab === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
