"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import ReportsTopbar from "@/components/report/reports-topbar";
import ReportAnalysis from "@/components/report/report-analysis";
import AiMarketAssistant from "@/components/report/ai-market-assistant";
import Sidebar from "@/components/layout/sidebar";
import { useApiClient } from "@/lib/api-client";

// Maps the filter dropdown's display labels (from performance-filters.tsx's
// "Asset Class Filter" select) to the backend's real assetType strings used
// by GET /evidence-package/:assetType/:symbol. "All Asset Classes" has no
// single backend equivalent — falls back to "equity" since that's the only
// asset type with confirmed working history/fundamentals endpoints today.
function toBackendAssetType(displayLabel: string): string {
  switch (displayLabel) {
    case "Stocks":
      return "equity";
    case "Crypto":
      return "crypto";
    case "Forex":
      return "forex";
    case "Commodities":
      return "metal"; // best-effort mapping — "Commodities" is broader than
    // the backend's metal/oil split; revisit if commodity reports need to
    // distinguish oil from metals specifically.
    default:
      return "equity";
  }
}

function ReportsPageContent() {
  const searchParams = useSearchParams();
  // Report-history entry id from ?id= — present when the user arrived via
  // the New Report form. Absent on direct visits, in which case the
  // hardcoded fallbacks below stay in effect.
  const reportHistoryId = searchParams.get("id");
  const api = useApiClient();

  // Shared state maintained for Reports History
  const [startDate, setStartDate] = useState("2024-05-08");
  const [endDate, setEndDate] = useState("2024-05-14");
  const [assetClass, setAssetClass] = useState("All Asset Classes");

  // New: which symbol the report is for. Defaults to empty - will be loaded
  // from the latest report history entry if no ?id= param is present.
  const [symbol, setSymbol] = useState("");

  // When ?id= is present, the loaded entry's real backend assetType
  // ('equity' | 'crypto' | 'forex' | 'metal' | 'oil') overrides the
  // dropdown-derived default passed to ReportAnalysis.
  const [entryAssetType, setEntryAssetType] = useState<string | null>(null);
  const [isLoadingEntry, setIsLoadingEntry] = useState(false);

  // Load the report-history entry on mount and derive symbol/assetType
  // from it. If no ?id= param, fetch the latest report from history.
  useEffect(() => {
    setIsLoadingEntry(true);
    let cancelled = false;

    if (reportHistoryId) {
      // Load specific report by ID
      api
        .get<{ symbol: string; assetType: string }>(`/report-history/${reportHistoryId}`)
        .then((entry) => {
          if (!cancelled && entry.symbol && entry.assetType) {
            setSymbol(entry.symbol);
            setEntryAssetType(entry.assetType);
          }
        })
        .catch(() => {
          // Entry fetch failed — keep empty state.
        })
        .finally(() => {
          if (!cancelled) setIsLoadingEntry(false);
        });
    } else {
      // No ?id= param - fetch latest report from history
      api
        .get<Array<{ id: string; symbol: string; assetType: string }>>('/report-history')
        .then((entries) => {
          if (!cancelled && entries && entries.length > 0) {
            const latest = entries[0]; // Most recent (ordered by createdAt desc)
            setSymbol(latest.symbol);
            setEntryAssetType(latest.assetType);
          }
        })
        .catch(() => {
          // Latest report fetch failed — keep empty state.
        })
        .finally(() => {
          if (!cancelled) setIsLoadingEntry(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [reportHistoryId, api]);

  return (
    <main className="flex min-h-screen bg-slate-50">
      {/* Left sidebar */}
      <aside className="left-panel hidden w-64 flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-sm md:flex">
        <div className="h-full overflow-y-auto p-4 font-medium text-slate-500">
          <Sidebar />
        </div>
      </aside>

      {/* Main page */}
      <div className="flex-1 p-6">
        {/* Show loading state while fetching the report-history entry */}
        {isLoadingEntry ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-slate-400">Loading report…</p>
          </div>
        ) : !symbol ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-slate-400">No reports found. Generate a report first.</p>
          </div>
        ) : (
          <>
            {/* Top section */}
            <ReportsTopbar
              startDate={startDate}
              endDate={endDate}
              assetClass={assetClass}
            />

            {/* Main report layout */}
            <div className="mt-6 grid grid-cols-[minmax(0,1fr)_320px] items-start gap-6">
              {/* Main report content */}
              <div className="min-w-0">
                <ReportAnalysis
                  startDate={startDate}
                  endDate={endDate}
                  setStartDate={setStartDate}
                  setEndDate={setEndDate}
                  assetClass={entryAssetType ?? toBackendAssetType(assetClass)}
                  setAssetClass={setAssetClass}
                  symbol={symbol}
                  reportHistoryId={reportHistoryId ?? undefined}
                />
              </div>

              {/* AI chat sidebar */}
              <div className="sticky top-6 h-[calc(100vh-3rem)] min-w-0 self-start">
                <AiMarketAssistant />
              </div>
            </div>

            {/* Disclaimer */}
            <p className="mt-5 text-center text-xs text-slate-400">
              Disclaimer: This report is generated by AI based on available data
              and third-party sources. It does not constitute financial advice.
              Please do your own research before investing.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

// useSearchParams requires a Suspense boundary during static prerendering
// (Next.js fails the build without one), so the exported page wraps the
// content component here.
export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">Loading report…</div>}>
      <ReportsPageContent />
    </Suspense>
  );
}