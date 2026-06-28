import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, LogOut, ShieldCheck, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { AuthShell } from "@/components/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { verifySigninMfa, sendSigninCode, listMyFactors, isSigninMfaVerified } from "@/lib/mfa.functions";

export const Route = createFileRoute("/auth/verify")({
  head: () => ({ meta: [{ title: "Verify — MWA" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: VerifyPage,
});

function VerifyPage() {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<"totp" | "email" | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const verify = useServerFn(verifySigninMfa);
  const sendCode = useServerFn(sendSigninCode);
  const list = useServerFn(listMyFactors);
  const status = useServerFn(isSigninMfaVerified);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { nav({ to: "/auth" }); return; }
      const st = await status().catch(() => ({ enrolled: false, verified: true }));
      if (!st.enrolled || st.verified) { nav({ to: "/" }); return; }
      const { factors } = await list().catch(() => ({ factors: [] as any[] }));
      const signin = factors.find((f: any) => f.purpose === "signin" && f.confirmed_at);
      setMethod(signin?.method ?? null);
    })();
  }, [nav, list, status]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.length !== 6) return;
    setBusy(true);
    try {
      const res = await verify({ data: { code } });
      if (!res.ok) { toast.error("Invalid code"); setCode(""); return; }
      toast.success("Verified");
      nav({ to: "/" });
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  };

  const resend = async () => {
    setBusy(true);
    try {
      const res = await sendCode();
      if (!res.ok) toast.error(res.error === "email_not_configured" ? "Email channel not configured yet" : "Could not send code");
      else { setEmailSent(true); toast.success("Code sent — check your email"); }
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (method === "email" && !emailSent) resend();
  }, [method]); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    await supabase.auth.signOut();
    nav({ to: "/auth" });
  };

  return (
    <>
      <AuthShell
        badge="Two-factor required"
        title="Verify it's you"
        subtitle={method === "totp"
          ? "Open your authenticator app and enter the 6-digit code."
          : method === "email"
            ? "We just emailed you a 6-digit code. It expires in 10 minutes."
            : "Loading your second factor…"}
      >
        <form onSubmit={submit} className="space-y-5">
          <div className="flex justify-center py-2">
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} className="h-12 w-12 text-lg font-display" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button type="submit" disabled={busy || code.length !== 6} className="w-full h-11 font-display tracking-wider">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShieldCheck className="h-4 w-4 mr-2" />Verify & continue</>}
          </Button>

          {method === "email" && (
            <Button type="button" variant="ghost" onClick={resend} disabled={busy} className="w-full text-xs">
              <Mail className="h-3 w-3 mr-2" /> Resend code
            </Button>
          )}

          <Button type="button" variant="ghost" onClick={signOut} className="w-full text-xs text-muted-foreground">
            <LogOut className="h-3 w-3 mr-2" /> Sign out instead
          </Button>
        </form>
      </AuthShell>
      <Toaster />
    </>
  );
}
