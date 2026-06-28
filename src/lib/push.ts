// Client-side helpers for managing Web Push subscriptions.
import { supabase } from "@/integrations/supabase/client";

export const VAPID_PUBLIC_KEY =
  "BCDI8Jnvem5aU4l-TP4izXus0j2dQzIUMO6PlfCdZc_xGV5Onatnl_K3olyuhqw0IzwyZcKTm4pqGClNv3I90GY";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bufToBase64Url(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function registerPushWorker(): Promise<ServiceWorkerRegistration> {
  // sw-push.js is push-only — safe to register on any environment (including preview).
  const existing = await navigator.serviceWorker.getRegistration("/sw-push.js");
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw-push.js", { scope: "/" });
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/sw-push.js");
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function subscribeToPush(): Promise<PushSubscription> {
  if (!pushSupported()) throw new Error("Push not supported on this device");
  if (Notification.permission === "denied")
    throw new Error("Notifications are blocked in browser settings");
  if (Notification.permission === "default") {
    const p = await Notification.requestPermission();
    if (p !== "granted") throw new Error("Notification permission denied");
  }

  const reg = await registerPushWorker();
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
    });
  }

  const p256dh = bufToBase64Url(sub.getKey("p256dh"));
  const auth = bufToBase64Url(sub.getKey("auth"));
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id ?? null;

  // Upsert (anyone can INSERT; conflict on endpoint is fine — server already has it)
  await supabase.from("push_subscriptions").upsert(
    {
      endpoint: sub.endpoint,
      p256dh,
      auth,
      user_id: userId,
      user_agent: navigator.userAgent.slice(0, 200),
    },
    { onConflict: "endpoint" },
  );

  return sub;
}

export async function unsubscribeFromPush(): Promise<void> {
  const sub = await getPushSubscription();
  if (!sub) return;
  try {
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  } catch {
    /* ignore */
  }
  await sub.unsubscribe();
}
