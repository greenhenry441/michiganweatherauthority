export const COMMAND_SESSION = {
  password: process.env.SESSION_SECRET!,
  name: "mwa-command-gate",
  maxAge: 60 * 60 * 2, // 2 hours
  cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
};

export const MANAGEMENT_SESSION = {
  password: process.env.SESSION_SECRET!,
  name: "mwa-management-gate",
  maxAge: 60 * 60 * 4, // 4 hours
  cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
};

export type CommandSession = { unlocked?: boolean; userId?: string; unlockedAt?: number };
export type ManagementSession = { unlocked?: boolean; unlockedAt?: number };
