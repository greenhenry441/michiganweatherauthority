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
import { lovable } from "@/integrations/lovable";

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

  const signInOAuth = async (provider: "google" | "apple") => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message ?? `${provider} sign-in failed`);
        setBusy(false);
        return;
      }
      if (result.redirected) return;
      nav({ to: "/" });
    } catch (err) {
      toast.error((err as Error).message);
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

          <div className="grid gap-2">
            <Button type="button" variant="outline" onClick={() => signInOAuth("google")} disabled={busy} className="w-full">
              <svg className="h-4 w-4 mr-2" viewBox="0 0 48 48" aria-hidden>
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2c-2 1.4-4.6 2.4-7.3 2.4-5.2 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.2 5.2C40.7 36.5 44 30.8 44 24c0-1.2-.1-2.4-.4-3.5z"/>
              </svg>
              Continue with Google
            </Button>
            <Button type="button" variant="outline" onClick={() => signInOAuth("apple")} disabled={busy} className="w-full">
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M16.365 1.43c0 1.14-.46 2.23-1.21 3.04-.81.87-2.13 1.55-3.21 1.46-.14-1.11.41-2.27 1.13-3.04.83-.88 2.25-1.54 3.29-1.46zM20.5 17.05c-.59 1.31-.87 1.89-1.63 3.04-1.06 1.61-2.56 3.62-4.42 3.64-1.65.02-2.07-1.08-4.31-1.06-2.24.01-2.71 1.08-4.36 1.06-1.86-.02-3.28-1.83-4.34-3.44C-.92 16.79-1.33 11.42 1.04 8.5c1.6-2.04 4.13-2.66 5.74-2.7 1.7-.05 3.31 1.15 4.31 1.15 1 0 2.96-1.42 4.99-1.21.85.04 3.24.34 4.78 2.6-.13.08-2.85 1.66-2.82 4.96.04 3.94 3.47 5.26 3.51 5.27-.03.09-.55 1.88-1.83 4.38h.77z"/>
              </svg>
              Continue with Apple
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center"><span className="bg-card px-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">or with email</span></div>
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
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className="pl-9" />
                  </div>
                </div>
              </TabsContent>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono uppercase tracking-wider">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-9" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono uppercase tracking-wider">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-9" />
                </div>
              </div>

              <Button type="submit" disabled={busy} className="w-full font-display tracking-wider mt-2">
                {busy ? "Working…" : tab === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>
          </Tabs>
        </div>
      </div>
      <Toaster />
    </div>
  );
}

