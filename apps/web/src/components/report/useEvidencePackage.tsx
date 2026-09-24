"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { NewsArticle } from "shared-types";

export interface RsiResult {
  rsi: number | null;
  barsUsed: number;
  instrumentId: string | null;
}
export interface SmaResult {
  sma: Record<number, number | null>;
  barsUsed: number;
  instrumentId: string | null;
}
export interface EmaResult {
  ema: Record<number, number | null>;
  barsUsed: number;
  instrumentId: string | null;
}
export interface MacdResult {
  macd: { macd: number; signal: number; histogram: number } | null;
  barsUsed: number;
  instrumentId: string | null;
}
export interface TrendResult {
  trend: {
    direction: string;
    strength: number | null;
    signals: string[];
    evidenceCount: number;
    reason?: string;
  };
  instrumentId: string | null;
}

export interface TechnicalAggregate {
  symbol: string;
  assetType: string;
  instrumentId: string | null;
  barsUsed: number;
  rsi: RsiResult;
  sma: SmaResult;
  ema: EmaResult;
  macd: MacdResult;
  trend: TrendResult;
  // bollinger / atr / volume also exist on the real aggregate but aren't
  // used by this report card yet — typed loosely here rather than fully,
  // add fields as the UI grows to use them.
  [key: string]: unknown;
}

interface EvidenceSection<T> {
  available: boolean;
  data?: T;
  reason?: string;
  source?: string;
}

export interface SentimentData {
  positivePercent: number | null;
  neutralPercent: number | null;
  negativePercent: number | null;
  source: string | null;
  modelDerived: true;
}

/**
 * Six-category breakdown — mirrors EquityFundamentalCategories on the backend.
 * Every field is nullable; Finnhub may return null for any metric on any symbol
 * (confirmed: DIS returned null for epsGrowth5Y, netMarginGrowth5Y).
 */
export interface EquityFundamentalCategories {
  valuation: {
    peRatio: number | null;
    forwardPE: number | null;
    peg: number | null;
    ps: number | null;
    evEbitda: number | null;
    priceToBook: number | null;
    dividendYield: number | null;
  };
  growth: {
    revenueGrowthTTM: number | null;
    revenueGrowth3Y: number | null;
    revenueGrowth5Y: number | null;
    epsGrowthTTM: number | null;
    epsGrowth3Y: number | null;
  };
  profitability: {
    grossMargin: number | null;
    operatingMargin: number | null;
    netMargin: number | null;
    roe: number | null;
    roa: number | null;
    roi: number | null;
  };
  financialHealth: {
    debtToEquity: number | null;
    currentRatio: number | null;
    quickRatio: number | null;
  };
  cashFlow: {
    cashFlowPerShare: number | null;
    pfcfShare: number | null;
    evFreeCashFlow: number | null;
  };
  shareholderReturns: {
    dividendPerShare: number | null;
    payoutRatio: number | null;
    dividendGrowth5Y: number | null;
  };
}

export interface FinnhubFundamentals {
  calculationVersion: string;
  raw: Record<string, unknown>;

  // Backward-compatible flat fields
  peRatio: number | null;
  eps: number | null;
  marketCapitalization: number | null;
  profitMargin: number | null;
  revenueGrowth: number | null;

  // Structured six-category breakdown
  categories: EquityFundamentalCategories;
}

export interface EvidencePackage {
  symbol: string;
  assetType: string;
  instrumentId: string | null;
  timestamp: string;
  market: EvidenceSection<{ price: number; assetType: string }>;
  technical: EvidenceSection<TechnicalAggregate>;
  fundamental: EvidenceSection<FinnhubFundamentals>;
  macro: EvidenceSection<never>;
  news: EvidenceSection<{ articleCount: number; articles: NewsArticle[] }>;
  sentiment: EvidenceSection<SentimentData>;
  portfolio: EvidenceSection<never>;
  behavioral: EvidenceSection<never>;
  dataFreshness: { section: string; asOf: string | null }[];
  sources: string[];
}

export type { EvidencePackage };

interface UseEvidencePackageResult {
  data: EvidencePackage | null;
  loading: boolean;
  error: string | null;
}

interface UseEvidencePackageOptions {
  enabled?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function useEvidencePackage(
  symbol: string, 
  assetType: string, 
  options?: UseEvidencePackageOptions
): UseEvidencePackageResult {
  const { getToken } = useAuth();
  const [data, setData] = useState<EvidencePackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const enabled = options?.enabled !== false; // Default to true

  useEffect(() => {
    let cancelled = false;

    async function fetchEvidence() {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("No auth token available — user may not be signed in");
        }

        const res = await fetch(`${API_BASE}/evidence-package/${assetType}/${symbol}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error(`evidence-package request failed: ${res.status} ${res.statusText}`);
        }

        const json = await res.json();
        // Confirmed real shape: { data: {...} } — controller wraps its
        // service result the same way the win-rate endpoint does.
        if (!cancelled) setData(json.data as EvidencePackage);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (enabled && symbol && assetType) {
      fetchEvidence();
    } else {
      // When disabled, set loading to false immediately
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [symbol, assetType, getToken, enabled]);

  return { data, loading, error };
}