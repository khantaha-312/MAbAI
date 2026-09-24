"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function useSymbolNarrative() {
  const { getToken } = useAuth();
  const [narrative, setNarrativeState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(symbol: string, assetType: string, reportHistoryId?: string) {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No auth token available");

      const res = await fetch(`${API_BASE}/ai-orchestration/narrative/${assetType}/${symbol}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`narrative request failed: ${res.status}`);

      const json = await res.json();
      const narrative = json.data?.narrative ?? "No narrative returned.";
      setNarrativeState(narrative);

      // Persist the narrative back onto the report-history entry this
      // report came from, when one exists. Skipped silently when
      // reportHistoryId is undefined (direct visits) — never blocks or
      // errors the UI flow.
      if (reportHistoryId) {
        await fetch(`${API_BASE}/report-history/${reportHistoryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ narrative }),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function setNarrative(narrativeText: string | null) {
    setNarrativeState(narrativeText);
  }

  return { narrative, loading, error, generate, setNarrative: setNarrative as (narrativeText: string | null) => void };
}
