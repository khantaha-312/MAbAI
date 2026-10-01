"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/lib/api-client";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import DashboardSidebar from "@/components/dashboard/dashboard-sidebar";
import { Bookmark, Plus, Trash2, ArrowUp, ArrowDown, Minus } from "lucide-react";

interface WatchlistItem {
  id: string;
  instrument: {
    id: string;
    symbol: string;
    assetType: string;
    name: string;
  };
  price: number | null;
  priceUnavailable: boolean;
  reason?: string;
}

export default function WatchlistPage() {
  const apiClient = useApiClient();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newSymbol, setNewSymbol] = useState("");
  const [newAssetType, setNewAssetType] = useState("equity");
  const [adding, setAdding] = useState(false);

  const loadWatchlist = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<WatchlistItem[]>("/markets");
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load watchlist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlist();
  }, [apiClient]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;

    setAdding(true);
    setError(null);
    try {
      await apiClient.post("/markets", {
        symbol: newSymbol.toUpperCase(),
        assetType: newAssetType,
      });
      setNewSymbol("");
      await loadWatchlist();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add symbol");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (symbol: string, assetType: string) => {
    setError(null);
    try {
      await apiClient.delete(`/markets/${symbol}?assetType=${assetType}`);
      await loadWatchlist();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove symbol");
    }
  };

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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bookmark className="text-blue-600" size={24} />
                <h1 className="text-2xl font-bold text-slate-900">Watchlist</h1>
              </div>
            </div>

            {/* Add Symbol Form */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <form onSubmit={handleAdd} className="flex gap-3">
                <input
                  type="text"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  placeholder="Symbol (e.g., AAPL, BTC)"
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={adding}
                />
                <select
                  value={newAssetType}
                  onChange={(e) => setNewAssetType(e.target.value)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={adding}
                >
                  <option value="equity">Equity</option>
                  <option value="crypto">Crypto</option>
                  <option value="forex">Forex</option>
                  <option value="metal">Metal</option>
                  <option value="oil">Oil</option>
                </select>
                <button
                  type="submit"
                  disabled={adding || !newSymbol.trim()}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  <Plus size={16} />
                  {adding ? "Adding..." : "Add"}
                </button>
              </form>
            </div>

            {/* Error Display */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center text-slate-500">
                Loading watchlist...
              </div>
            )}

            {/* Empty State */}
            {!loading && items.length === 0 && !error && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center">
                <Bookmark className="mx-auto mb-4 text-slate-300" size={48} />
                <h3 className="mb-2 text-lg font-medium text-slate-900">Your watchlist is empty</h3>
                <p className="text-sm text-slate-500">Add symbols above to track their prices</p>
              </div>
            )}

            {/* Watchlist Items */}
            {!loading && items.length > 0 && (
              <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Symbol</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Price</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{item.instrument.symbol}</div>
                          <div className="text-xs text-slate-500">{item.instrument.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800">
                            {item.instrument.assetType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {item.priceUnavailable ? (
                            <span className="text-sm text-slate-400">N/A</span>
                          ) : (
                            <span className="font-medium text-slate-900">
                              ${item.price?.toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleRemove(item.instrument.symbol, item.instrument.assetType)}
                            className="text-slate-400 hover:text-red-600 transition-colors"
                            title="Remove from watchlist"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
