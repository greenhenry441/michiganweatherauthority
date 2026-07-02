import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { CommandSession } from "./session-config.server";

export const isCommandUnlocked = createServerFn({ method: "GET" })
  .handler(async () => {
    const { useSession } = await import("@tanstack/react-start/server");
    const { COMMAND_SESSION } = await import("./session-config.server");
    const session = await useSession<CommandSession>(COMMAND_SESSION);
    return {
      unlocked: !!session.data.unlocked,
      unlockedAt: session.data.unlockedAt ?? null,
    };
  });

export const unlockCommand = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const expected = process.env.COMMAND_PASSWORD || "";
    if (!expected) return { ok: false as const, error: "invalid_credentials" };
    const a = new TextEncoder().encode(data.password);
    const b = new TextEncoder().encode(expected);
    const aHash = new Uint8Array(await crypto.subtle.digest("SHA-256", a as BufferSource));
    const bHash = new Uint8Array(await crypto.subtle.digest("SHA-256", b as BufferSource));
    let diff = aHash.length ^ bHash.length;
    for (let i = 0; i < aHash.length; i++) diff |= aHash[i] ^ bHash[i];
    if (diff !== 0) return { ok: false as const, error: "invalid_credentials" };

    const { useSession } = await import("@tanstack/react-start/server");
    const { COMMAND_SESSION } = await import("./session-config.server");
    const session = await useSession<CommandSession>(COMMAND_SESSION);
    await session.update({ unlocked: true, unlockedAt: Date.now() });
    return { ok: true as const };
  });

export const lockCommand = createServerFn({ method: "POST" })
  .handler(async () => {
    const { useSession } = await import("@tanstack/react-start/server");
    const { COMMAND_SESSION } = await import("./session-config.server");
    const session = await useSession<CommandSession>(COMMAND_SESSION);
    await session.clear();
    return { ok: true };
  });
