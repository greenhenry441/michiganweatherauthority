import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getMyRoles } from "@/lib/role.functions";

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fetchRoles = useServerFn(getMyRoles);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { setLoaded(true); return; }
      try {
        const res = await fetchRoles();
        if (!cancelled) setIsAdmin(res.isAdmin);
      } catch { /* silent */ }
      if (!cancelled) setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [fetchRoles]);
  return { isAdmin, loaded };
}
