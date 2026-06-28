export const COMMAND_SESSION = {
  password: process.env.SESSION_SECRET!,
  name: "mwa-command-gate",
  maxAge: 60 * 60 * 2, // 2 hours
  cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
};

export const SIGNIN_MFA_SESSION = {
  password: process.env.SESSION_SECRET!,
  name: "mwa-signin-mfa",
  maxAge: 60 * 60 * 12, // 12 hours
  cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
};

export type CommandSession = { unlocked?: boolean; userId?: string; unlockedAt?: number };
export type SigninMfaSession = { verifiedUserId?: string; verifiedAt?: number };
