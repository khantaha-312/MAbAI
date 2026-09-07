"use client";

import { useEffect, useState } from "react";
import { Info, MoreHorizontal, AlertCircle } from "lucide-react";
import { useApiClient } from "@/lib/api-client";

interface VolatilityContribution {
  symbol: string;
  atr: number | null;
  weight: number;
  contribution: number | null;
}

interface RiskAnalysis {
  available: boolean;
  reason?: string;
  exposureByAssetClass: { assetType: string; value: number; percentOfPortfolio: number }[];
  volatility: { available: boolean; reason?: string; contributions: VolatilityContribution[] };
  drawdown: { available: false; reason: string; source: null };
  correlation: { available: false; reason: string; source: null };
  severity: { level: "insufficient_data" | "low" | "moderate" | "elevated"; evidenceCount: number };
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  insufficient_data: { bg: "bg-gray-100", text: "text-gray-500", label: "Not enough data" },
  low: { bg: "bg-emerald-50", text: "text-emerald-600", label: "Low" },
  moderate: { bg: "bg-amber-50", text: "text-amber-600", label: "Moderate" },
  elevated: { bg: "bg-red-50", text: "text-red-600", label: "Elevated" },
};

export default function PortfolioRisk() {
  const api = useApiClient();
  const [analysis, setAnalysis] = useState<RiskAnalysis | null>(null);
  const [noPortfolio, setNoPortfolio] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const portfoliosRes = await api.get<{ data: { id: string }[] }>("/portfolios");
        const portfolios = portfoliosRes.data;

        if (portfolios.length === 0) {
          if (!cancelled) setNoPortfolio(true);
          return;
        }

        // ASSUMPTION: using the first portfolio — no portfolio-switcher UI exists yet.
        const portfolioId = portfolios[0].id;
        const analysisRes = await api.get<{ data: RiskAnalysis }>(
          `/portfolios/${portfolioId}/risk-flags/analysis`
        );
        if (!cancelled) setAnalysis(analysisRes.data);
      } catch {
        if (!cancelled) setError("Couldn't load portfolio risk data.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h3 className="text-base font-semibold text-gray-900">Portfolio Risk</h3>
          <Info size={15} className="text-gray-400" />
        </div>
        <button type="button" className="text-gray-400 hover:text-gray-600">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-600">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {!error && noPortfolio && (
        <p className="py-6 text-center text-sm text-gray-400">
          No portfolio yet — create one to see risk analysis here.
        </p>
      )}

      {!error && !noPortfolio && analysis === null && (
        <div className="space-y-2">
          <div className="h-8 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-16 animate-pulse rounded-lg bg-gray-100" />
        </div>
      )}

      {!error && analysis && !analysis.available && (
        <p className="py-6 text-center text-sm text-gray-400">
          {analysis.reason ?? "Not enough position data for risk analysis yet."}
        </p>
      )}

      {!error && analysis && analysis.available && (
        <>
          {/* Severity — category only, never a fabricated numeric score */}
          <div
            className={`flex items-center justify-center rounded-xl py-3 ${SEVERITY_STYLES[analysis.severity.level].bg}`}
          >
            <span className={`text-sm font-bold ${SEVERITY_STYLES[analysis.severity.level].text}`}>
              {SEVERITY_STYLES[analysis.severity.level].label}
            </span>
          </div>

          {/* Exposure by asset class — real values */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Exposure by asset class</p>
            <div className="divide-y divide-gray-100 border-t border-b border-gray-100">
              {analysis.exposureByAssetClass.map((e) => (
                <div key={e.assetType} className="flex items-center justify-between py-2 text-xs">
                  <span className="text-gray-500 font-medium uppercase">{e.assetType}</span>
                  <span className="text-gray-900 font-semibold">{e.percentOfPortfolio}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Volatility — per-symbol only, no invented aggregate */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">
              Volatility contribution (ATR-based, per position)
            </p>
            {analysis.volatility.available ? (
              <div className="divide-y divide-gray-100 border-t border-b border-gray-100">
                {analysis.volatility.contributions.map((c) => (
                  <div key={c.symbol} className="flex items-center justify-between py-2 text-xs">
                    <span className="text-gray-500 font-medium">{c.symbol}</span>
                    <span className="text-gray-900 font-semibold">
                      {c.contribution !== null ? `${c.contribution}%` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">{analysis.volatility.reason}</p>
            )}
          </div>

          {/* Drawdown / correlation — permanently unavailable, not a loading state */}
          <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-400 space-y-1">
            <p>Max drawdown: not available — {analysis.drawdown.reason}</p>
            <p>Correlation: not available — {analysis.correlation.reason}</p>
          </div>
        </>
      )}
    </div>
  );
}