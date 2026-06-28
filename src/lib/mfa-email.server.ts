// Email delivery for MFA codes. Uses RESEND_API_KEY when configured;
// otherwise throws a clear error so the UI can tell the user.

export async function sendMfaEmail(to: string, code: string, purpose: "signin" | "command" | "enroll") {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("EMAIL_NOT_CONFIGURED");
  }
  const subject =
    purpose === "command"
      ? "Your MWA Command verification code"
      : purpose === "enroll"
        ? "Confirm your MWA email 2FA"
        : "Your MWA sign-in code";
  const html = `
<!doctype html><html><body style="font-family:Inter,system-ui,sans-serif;background:#0a0a0a;color:#f1f5f9;padding:40px">
  <div style="max-width:480px;margin:auto;background:#111;border:1px solid #333;border-radius:14px;padding:32px">
    <div style="font-family:Georgia,serif;font-size:22px;color:#facc15;letter-spacing:1px">Michigan Weather Authority</div>
    <h1 style="font-size:18px;color:#fff;margin-top:24px">${subject}</h1>
    <p style="color:#94a3b8;font-size:14px">Use the following code. It expires in 10 minutes.</p>
    <div style="font-family:ui-monospace,monospace;font-size:40px;letter-spacing:14px;color:#facc15;text-align:center;margin:28px 0;padding:18px;border:1px dashed #444;border-radius:10px">${code}</div>
    <p style="color:#64748b;font-size:12px">If you didn't request this, you can safely ignore the email.</p>
  </div>
</body></html>`;
  const from = process.env.MFA_EMAIL_FROM || "MWA <alerts@mwa.local>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    throw new Error(`EMAIL_SEND_FAILED: ${res.status}`);
  }
}
