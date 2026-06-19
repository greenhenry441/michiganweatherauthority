// Shared alerts store backed by Lovable Cloud. All visitors see the same alerts
// in real time via Realtime subscriptions.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SharedAlert {
  id: string;
  kind: "weather" | "eas" | "mwa-network";
  type_id: string | null;
  custom_name: string | null;
  category: "warning" | "watch" | "advisory" | "statement" | "extreme";
  severity: "extreme" | "severe" | "moderate" | "minor";
  headline: string;
  description: string;
  instruction: string | null;
  areas: string[];
  issuer: string;
  issued_at: string;
  expires_at: string;
  source: string;
}

export function useSharedAlerts(): { alerts: SharedAlert[]; loading: boolean } {
  const [alerts, setAlerts] = useState<SharedAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("issued_at", { ascending: false });
      if (!cancelled && !error) {
        setAlerts((data ?? []) as SharedAlert[]);
        setLoading(false);
      }
    }
    load();

    const channel = supabase
      .channel("alerts-public")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts" },
        () => load(),
      )
      .subscribe();

    // re-filter expired alerts periodically
    const interval = window.setInterval(() => {
      setAlerts((prev) => prev.filter((a) => new Date(a.expires_at) > new Date()));
    }, 30_000);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      window.clearInterval(interval);
    };
  }, []);

  return { alerts, loading };
}
