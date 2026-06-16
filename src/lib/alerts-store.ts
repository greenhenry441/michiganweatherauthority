// Local alerts store (browser localStorage). Manual alerts issued from /command
// show on the main site for any visitor on this device. Upgrade to Lovable Cloud
// for cross-visitor sharing.

import { useEffect, useState } from "react";

export interface ManualAlert {
  id: string;
  typeId: string;
  headline: string;
  areas: string[]; // city names or county names
  description: string;
  instruction?: string;
  issuedAt: string; // ISO
  expiresAt: string; // ISO
  issuer: string;
}

const KEY = "mwa.manual-alerts.v1";
const CHANNEL = "mwa.manual-alerts";

function read(): ManualAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ManualAlert[];
  } catch {
    return [];
  }
}

function write(items: ManualAlert[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  try {
    new BroadcastChannel(CHANNEL).postMessage({ type: "update" });
  } catch {
    // ignore
  }
}

export function getAlerts(): ManualAlert[] {
  return read()
    .filter((a) => new Date(a.expiresAt).getTime() > Date.now())
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
}

export function addAlert(alert: Omit<ManualAlert, "id" | "issuedAt">) {
  const next: ManualAlert = {
    ...alert,
    id: crypto.randomUUID(),
    issuedAt: new Date().toISOString(),
  };
  const all = read();
  write([next, ...all]);
  return next;
}

export function removeAlert(id: string) {
  write(read().filter((a) => a.id !== id));
}

export function useManualAlerts() {
  const [alerts, setAlerts] = useState<ManualAlert[]>([]);

  useEffect(() => {
    const refresh = () => setAlerts(getAlerts());
    refresh();

    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) refresh();
    };
    window.addEventListener("storage", onStorage);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(CHANNEL);
      bc.onmessage = refresh;
    } catch {
      // ignore
    }

    const interval = window.setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener("storage", onStorage);
      bc?.close();
      window.clearInterval(interval);
    };
  }, []);

  return alerts;
}
