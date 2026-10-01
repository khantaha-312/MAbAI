"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/lib/api-client";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import DashboardSidebar from "@/components/dashboard/dashboard-sidebar";
import { BarChart2, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle } from "lucide-react";
import { useWinRate, WinRateResponse } from "@/components/dashboard/useWinRate";

export default function AnalyticsPage() {
  const apiClient = useApiClient();
  const winRateData = useWinRate();
  const [entries, setEntries] = useState<any[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEntries = async () => {
      setLoadingEntries(true);
      setError(null);
      try {
        const data = await apiClient.get<any[]>("/ledger-entries");
        setEntries(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load ledger entries");
      } finally {
        setLoadingEntries(false);
      }
    };

    loadEntries();
  }, [apiClient]);

  const winRate = winRateData.data;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-[#F4F7FA] via-[#EBF1F7] to-[#DFE6EE]">
      {/* Left Sidebar */}
      <aside className="left-panel hidden w-64 flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-sm md:flex">
        <div className="p-4 font-medium text-slate-500 h-full overflow-y-auto">
          <DashboardSidebar />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader />

        <main className="body-main-wrapper flex flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="center-div mx-auto w-full max-w-[1200px] space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <BarChart2 className="text-blue-600" size={24} />
              <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
            </div>

            {/* Error Display */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Win Rate Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Prediction Win Rate</h2>

              {winRateData.loading ? (
                <div className="text-center text-slate-500">Loading win rate...</div>
              ) : winRateData.error ? (
                <div className="text-center text-red-600">{winRateData.error}</div>
              ) : winRate ? (
                <div className="space-y-4">
                  {winRate.status === "insufficient_data" ? (
                    <div className="rounded-lg bg-slate-50 p-4 text-center">
                      <Clock className="mx-auto mb-2 text-slate-400" size={32} />
                      <p className="text-sm text-slate-600">
                        Insufficient data for win rate calculation
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {winRate.resolvedCount} of {winRate.minimumRequired} required predictions resolved
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Win Rate Percentage */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">Win Rate</span>
                        <span className="text-3xl font-bold text-blue-600">
                          {winRate.winRatePct?.toFixed(1)}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${winRate.winRatePct || 0}%` }}
                        />
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="rounded-lg bg-green-50 p-4">
                          <div className="flex items-center gap-2 text-green-700">
                            <CheckCircle size={18} />
                            <span className="text-sm font-medium">Correct</span>
                          </div>
                          <p className="mt-1 text-2xl font-bold text-green-700">
                            {winRate.counts?.correct || 0}
                          </p>
                        </div>
                        <div className="rounded-lg bg-red-50 p-4">
                          <div className="flex items-center gap-2 text-red-700">
                            <XCircle size={18} />
                            <span className="text-sm font-medium">Incorrect</span>
                          </div>
                          <p className="mt-1 text-2xl font-bold text-red-700">
                            {winRate.counts?.incorrect || 0}
                          </p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-slate-700">
                            <Clock size={18} />
                            <span className="text-sm font-medium">Pending</span>
                          </div>
                          <p className="mt-1 text-2xl font-bold text-slate-700">
                            {winRate.pendingCount}
                          </p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-slate-700">
                            <BarChart2 size={18} />
                            <span className="text-sm font-medium">Total</span>
                          </div>
                          <p className="mt-1 text-2xl font-bold text-slate-700">
                            {winRate.totalPredictions}
                          </p>
                        </div>
                      </div>

                      {/* Partial Count */}
                      {winRate.counts?.partial && winRate.counts.partial > 0 && (
                        <div className="pt-2 text-center text-xs text-slate-500">
                          {winRate.counts.partial} partial outcome(s) excluded from win rate
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-slate-500">No win rate data available</div>
              )}
            </div>

            {/* Recent Predictions */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent Predictions</h2>

              {loadingEntries ? (
                <div className="text-center text-slate-500">Loading predictions...</div>
              ) : entries.length === 0 ? (
                <div className="text-center text-slate-500">No predictions yet</div>
              ) : (
                <div className="space-y-3">
                  {entries.slice(0, 10).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">
                            {entry.inputSnapshot?.symbol || "Unknown"}
                          </span>
                          <span className="text-xs text-slate-500">
                            {entry.inputSnapshot?.assetType || ""}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {entry.status === "pending" && (
                          <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                            <Clock size={14} />
                            Pending
                          </span>
                        )}
                        {entry.status === "resolved" && (
                          <span
                            className={`flex items-center gap-1 text-xs font-medium ${
                              entry.outcome === "correct"
                                ? "text-green-600"
                                : entry.outcome === "incorrect"
                                ? "text-red-600"
                                : "text-slate-600"
                            }`}
                          >
                            {entry.outcome === "correct" && <CheckCircle size={14} />}
                            {entry.outcome === "incorrect" && <XCircle size={14} />}
                            {entry.outcome || "Resolved"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
