"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs"; // adjust import if your Clerk setup differs

export interface WinRateCounts {
  correct: number;
  incorrect: number;
  partial: number;
}

export interface WinRateResponse {
  status: "insufficient_data" | "ok";
  totalPredictions: number;
  pendingCount: number;
  resolvedCount: number;
  minimumRequired: number;
  counts?: WinRateCounts;
  winRatePct?: number;
}

interface UseWinRateResult {
  data: WinRateResponse | null;
  loading: boolean;
  error: string | null;
}

// Matches the real .env: NEXT_PUBLIC_API_URL=http://localhost:3001
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function useWinRate(): UseWinRateResult {
  const { getToken } = useAuth();
  const [data, setData] = useState<WinRateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchWinRate() {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("No auth token available — user may not be signed in");
        }

        const res = await fetch(`${API_BASE}/ledger-entries/win-rate`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error(`win-rate request failed: ${res.status} ${res.statusText}`);
        }

        const json = await res.json();
        // Confirmed real response shape: { data: { status, totalPredictions, ... } }
        if (!cancelled) setData(json.data as WinRateResponse);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchWinRate();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  return { data, loading, error };
}