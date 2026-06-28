# Plan: Command gate + dual 2FA + modern auth

## 1. Command access (admin-only, password + dedicated 2FA)

- Add **Command** link in the main header, visible to everyone signed in with the `admin` role. Non-admins don't see it. Anonymous users don't see it.
- `/command` is wrapped in a server-checked gate. Two-step unlock:
  1. **Password**: `MWA-ADMIN`, stored as `COMMAND_PASSWORD` secret (timing-safe compare server-side; never sent to client).
  2. **Command 2FA**: TOTP code from an authenticator app, enrolled separately from sign-in 2FA.
- Unlock state lives in an encrypted server session cookie (`command-gate`, 2-hour TTL, httpOnly, sameSite=lax). Refresh keeps you in until it expires or you click "Lock command".
- Server fn `unlockCommand({ password, totp })` requires `admin` role + valid password + valid TOTP. Wrong values return a generic failure; rate-limited (5 attempts / 15 min per user) using a `command_unlock_attempts` table.
- Lock button in the command header.

## 2. Two SEPARATE 2FA factors per user

Two independent enrollments so ordinary 2FA users cannot enter command without explicit command 2FA setup.

| Factor | Used for | Methods |
|---|---|---|
| `signin_2fa` | Normal sign-in challenge | Authenticator app (TOTP) **or** Email code |
| `command_2fa` | `/command` unlock (admin only) | Authenticator app (TOTP) **only** — email not allowed for command |

New table `user_mfa_factors`:
- `user_id`, `purpose` (`signin` \| `command`), `method` (`totp` \| `email`), `secret` (TOTP base32, null for email), `confirmed_at`, `last_used_at`. Unique on (user_id, purpose).
- RLS: owner can read/insert/update/delete their own; service_role full.

## 3. Sign-in 2FA flow

- After password sign-in succeeds, if user has a confirmed `signin_2fa`, redirect to `/auth/verify` (separate route). User submits 6-digit code (TOTP or emailed code). Server fn verifies; on success sets a `signin-mfa-verified` session flag and navigates to original destination. On fail, generic error + rate limit.
- Email-method codes: random 6-digit, 10-min TTL, hashed in `mfa_email_codes` table (`user_id`, `purpose`, `code_hash`, `expires_at`, `consumed_at`). Sent via existing Lovable auth email infra (transactional template).
- Session check on protected routes ensures `signin-mfa-verified` exists when the user has enrolled — otherwise bounce to `/auth/verify`.

## 4. Settings page — 2FA management

New section "Two-factor authentication" with two cards:

- **Sign-in 2FA**: choose Authenticator app or Email. Enroll flow shows QR code + manual key for TOTP; verifies with one code before activating. For email: send code, verify, activate. Disable button (requires current code).
- **Command 2FA** (only shown if user has admin role): authenticator-only enroll flow, same QR+verify pattern. Disable requires current code.

Both show status (Not configured / Active since DATE / Last used DATE).

## 5. Modern auth page redesign (`/auth` and `/auth/verify`)

Direction: **"Storm Console"** — full-bleed dark canvas, animated radar sweep + lightning flicker behind a frosted-glass card on the right. Left side: live-feeling MWA brand panel (rotating tagline, status pill "Systems nominal" tied to current alert count). Tabbed sign in / sign up with floating-label inputs, gold accent (#FACC15) on focus, smooth Motion transitions.

- Typography: **Space Grotesk** display + **Inter** body.
- Card uses `backdrop-blur` + 1px gradient border (gold→teal).
- Google sign-in via existing `lovable.auth.signInWithOAuth` broker, styled as a primary outlined button.
- Adapts to current theme tokens (works in noir / aurora / og + light/dark).
- `/auth/verify` reuses the same shell, replaces the form with a 6-cell OTP input and "Resend code" (email only).

## 6. Technical details

- TOTP: implement RFC 6238 with WebCrypto in a server-only helper (`src/lib/totp.server.ts`). No new npm package needed — HMAC-SHA1 via `crypto.subtle`.
- Password compare: `crypto.timingSafeEqual` over sha256 digests.
- Secrets to add: `COMMAND_PASSWORD` (set to `MWA-ADMIN`), `SESSION_SECRET` (generated, 64 chars) for `useSession`.
- New server functions in `src/lib/`:
  - `command-gate.functions.ts` — `unlockCommand`, `lockCommand`, `isCommandUnlocked`.
  - `mfa.functions.ts` — `startEnroll(purpose, method)`, `confirmEnroll`, `disableFactor`, `verifyCode`, `sendEmailCode`, `listMyFactors`.
- New routes: `src/routes/auth/verify.tsx`, `src/routes/_authenticated/command-unlock.tsx` (or inline gate on `/command`).
- Header changes: `Command` link with shield icon; clicking when locked routes to unlock screen.
- Migrations:
  1. `user_mfa_factors` table + grants + RLS.
  2. `mfa_email_codes` table + grants + RLS.
  3. `command_unlock_attempts` table + grants + RLS.

## 7. Out of scope (confirm if you want these too)

- Recovery codes / backup codes for 2FA.
- WebAuthn / passkeys.
- Per-device "remember this device 30 days".
- SMS as a 2FA method.

Approve and I'll build it.
