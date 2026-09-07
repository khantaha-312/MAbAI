"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

interface MacroSection<T> {
  available: boolean;
  data: T | null;
  reason?: string;
  source: string | null;
}

export interface MacroSnapshot {
  timestamp: string;
  oil: MacroSection<{ wti: number | null; brent: number | null }>;
  gold: MacroSection<{ priceUsd: number }>;
  usdStrength: MacroSection<{ pairs: Record<string, number> }>;
  interestRates: MacroSection<never>;
  inflation: MacroSection<never>;
  majorIndices: MacroSection<never>;
}

interface UseMacroSnapshotResult {
  data: MacroSnapshot | null;
  loading: boolean;
  error: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function useMacroSnapshot(): UseMacroSnapshotResult {
  const { getToken } = useAuth();
  const [data, setData] = useState<MacroSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMacro() {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) throw new Error("No auth token available");

        const res = await fetch(`${API_BASE}/macro-analysis/snapshot`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error(`macro-analysis request failed: ${res.status}`);

        const json = await res.json();
        if (!cancelled) setData(json.data as MacroSnapshot);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMacro();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  return { data, loading, error };
}