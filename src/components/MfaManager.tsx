import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldCheck, Smartphone, Mail, Trash2, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { listMyFactors, startTotpEnroll, confirmTotpEnroll, disableFactor, startEmailEnroll, confirmEmailEnroll } from "@/lib/mfa.functions";
import { getMyRoles } from "@/lib/role.functions";
import QRCode from "qrcode";

type Purpose = "signin" | "command";

export function MfaManager() {
  const list = useServerFn(listMyFactors);
  const roles = useServerFn(getMyRoles);

  const factors = useQuery({ queryKey: ["mfa-factors"], queryFn: () => list() });
  const role = useQuery({ queryKey: ["my-roles"], queryFn: () => roles() });

  const factor = (p: Purpose) => factors.data?.factors.find((f: any) => f.purpose === p);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-5">
      <header className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-accent" />
        <div>
          <h2 className="font-display text-xl">Two-factor authentication</h2>
          <p className="text-xs text-muted-foreground">Add a second step when signing in and when entering Command.</p>
        </div>
      </header>

      <FactorCard
        purpose="signin"
        title="Sign-in 2FA"
        description="Required at sign-in. Use an authenticator app (recommended) or email codes."
        allowEmail
        factor={factor("signin")}
        onChanged={() => factors.refetch()}
      />

      {role.data?.isAdmin && (
        <FactorCard
          purpose="command"
          title="Command 2FA"
          description="Authenticator-app only. Required to unlock the broadcast Command console."
          allowEmail={false}
          factor={factor("command")}
          onChanged={() => factors.refetch()}
        />
      )}

      {role.data && !role.data.isAdmin && (
        <p className="text-[11px] text-muted-foreground font-mono">Command 2FA is only shown for admin accounts.</p>
      )}
    </section>
  );
}

function FactorCard({ purpose, title, description, allowEmail, factor, onChanged }: {
  purpose: Purpose;
  title: string;
  description: string;
  allowEmail: boolean;
  factor: any;
  onChanged: () => void;
}) {
  const confirmed = !!factor?.confirmed_at;
  return (
    <div className="rounded-xl border border-border/70 bg-background/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base">{title}</h3>
            {confirmed && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-emerald-400">
                <Check className="h-3 w-3" /> Active · {factor.method.toUpperCase()}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
          {confirmed && factor.last_used_at && (
            <p className="text-[10px] font-mono text-muted-foreground/80 mt-1">Last used {new Date(factor.last_used_at).toLocaleString()}</p>
          )}
        </div>
        {confirmed ? (
          <DisableButton purpose={purpose} onDone={onChanged} />
        ) : (
          <EnrollDialog purpose={purpose} allowEmail={allowEmail} onDone={onChanged} />
        )}
      </div>
    </div>
  );
}

function DisableButton({ purpose, onDone }: { purpose: Purpose; onDone: () => void }) {
  const disable = useServerFn(disableFactor);
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={async () => {
        if (!confirm("Disable this 2FA factor?")) return;
        setBusy(true);
        try {
          await disable({ data: { purpose } });
          toast.success("Disabled");
          onDone();
        } catch (e) { toast.error((e as Error).message); }
        finally { setBusy(false); }
      }}
    >
      <Trash2 className="h-3 w-3 mr-1" /> Disable
    </Button>
  );
}

function EnrollDialog({ purpose, allowEmail, onDone }: { purpose: Purpose; allowEmail: boolean; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"totp" | "email">("totp");
  const [step, setStep] = useState<"choose" | "totp" | "email">("choose");
  const [qr, setQr] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const startTotp = useServerFn(startTotpEnroll);
  const confirmTotp = useServerFn(confirmTotpEnroll);
  const startEmail = useServerFn(startEmailEnroll);
  const confirmEmail = useServerFn(confirmEmailEnroll);

  const reset = () => { setStep("choose"); setMethod("totp"); setQr(""); setSecret(""); setCode(""); setEmailSent(false); };

  const beginTotp = async () => {
    setBusy(true);
    try {
      const res = await startTotp({ data: { purpose } });
      setSecret(res.secret);
      const url = await QRCode.toDataURL(res.uri, { width: 240, margin: 1 });
      setQr(url);
      setStep("totp");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const beginEmail = async () => {
    setBusy(true);
    try {
      const res = await startEmail({ data: { purpose: "signin" } });
      if (!res.ok) {
        toast.error(res.error === "email_not_configured"
          ? "Email channel not configured yet — please use an authenticator app."
          : "Could not send code");
        return;
      }
      setEmailSent(true);
      setStep("email");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const verifyTotp = async () => {
    setBusy(true);
    try {
      const r = await confirmTotp({ data: { purpose, code } });
      if (!r.ok) { toast.error("Invalid code — try again"); return; }
      toast.success("Enrolled");
      setOpen(false); reset(); onDone();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const verifyEmail = async () => {
    setBusy(true);
    try {
      const r = await confirmEmail({ data: { code } });
      if (!r.ok) { toast.error("Invalid code"); return; }
      toast.success("Enrolled");
      setOpen(false); reset(); onDone();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="font-display tracking-wider">Set up</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Enable two-factor</DialogTitle>
        </DialogHeader>

        {step === "choose" && (
          <div className="space-y-4">
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as any)} className="space-y-2">
              <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-accent/60">
                <RadioGroupItem value="totp" className="mt-1" />
                <div>
                  <div className="flex items-center gap-2 font-medium"><Smartphone className="h-4 w-4 text-accent" /> Authenticator app</div>
                  <p className="text-xs text-muted-foreground mt-1">Google Authenticator, 1Password, Authy, or any TOTP app. Recommended.</p>
                </div>
              </label>
              {allowEmail && (
                <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-accent/60">
                  <RadioGroupItem value="email" className="mt-1" />
                  <div>
                    <div className="flex items-center gap-2 font-medium"><Mail className="h-4 w-4 text-accent" /> Email codes</div>
                    <p className="text-xs text-muted-foreground mt-1">A 6-digit code is sent to your account email on each sign-in.</p>
                  </div>
                </label>
              )}
            </RadioGroup>
            <Button onClick={() => method === "totp" ? beginTotp() : beginEmail()} disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
            </Button>
          </div>
        )}

        {step === "totp" && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Scan this QR with your authenticator app, then enter the 6-digit code to confirm.</p>
            {qr && <img src={qr} alt="2FA QR code" className="mx-auto rounded border border-border bg-white p-2" width={240} height={240} />}
            <div className="space-y-1">
              <Label className="text-[10px] font-mono uppercase tracking-wider">Or enter this key manually</Label>
              <Input value={secret} readOnly className="font-mono text-xs" onClick={(e) => (e.target as HTMLInputElement).select()} />
            </div>
            <div className="flex justify-center"><InputOTP maxLength={6} value={code} onChange={setCode}><InputOTPGroup>{[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup></InputOTP></div>
            <Button onClick={verifyTotp} disabled={busy || code.length !== 6} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & enable"}
            </Button>
          </div>
        )}

        {step === "email" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs">
              <Mail className="h-4 w-4 text-accent" />
              {emailSent ? "Code sent to your email. It expires in 10 minutes." : "Sending code…"}
            </div>
            <div className="flex justify-center"><InputOTP maxLength={6} value={code} onChange={setCode}><InputOTPGroup>{[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup></InputOTP></div>
            <Button onClick={verifyEmail} disabled={busy || code.length !== 6} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & enable"}
            </Button>
            <Button variant="ghost" onClick={beginEmail} disabled={busy} className="w-full text-xs">Resend code</Button>
          </div>
        )}

        {step === "choose" && allowEmail && (
          <p className="flex items-start gap-2 text-[10px] text-muted-foreground"><AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> Email 2FA requires email infrastructure (RESEND_API_KEY). If not configured, use an authenticator app.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
