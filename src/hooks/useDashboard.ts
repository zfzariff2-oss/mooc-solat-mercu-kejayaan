import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { DashboardData } from "@/lib/types";

export function useDashboard() {
  const { session } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    const { data: result, error: rpcError } = await supabase.rpc("get_dashboard");
    if (rpcError) {
      setError(rpcError.message);
      setData(null);
    } else {
      setData(result as DashboardData);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
