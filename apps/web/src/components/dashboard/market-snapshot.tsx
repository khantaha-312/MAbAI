"use client";

import { useEffect, useState } from "react";
import { Info, SlidersHorizontal, AlertCircle } from "lucide-react";
import { useApiClient } from "@/lib/api-client";

interface WatchlistItem {
  id: string;
  instrument: {
    id: string;
    symbol: string;
    name: string;
    assetType: string;
  };
  sortOrder: number;
  price: number | null;
  priceUnavailable: boolean;
  reason?: string;
}

export default function MarketSnapshot() {
  const api = useApiClient();
  const [items, setItems] = useState<WatchlistItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<WatchlistItem[]>("/markets")
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load market data.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h3 className="text-base font-semibold text-gray-900">Market Snapshot</h3>
          <Info size={15} className="text-gray-400" />
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          <SlidersHorizontal size={13} />
          <span>Customize</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-600">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {!error && items === null && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[74px] animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {!error && items !== null && items.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-400">
          Your watchlist is empty — add symbols to see them here.
        </p>
      )}

      {!error && items !== null && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-1">
          {items.map((item) => (
            <MarketCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function MarketCard({ item }: { item: WatchlistItem }) {
  return (
    <div className="flex flex-col justify-end p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 transition-all space-y-2">
      <span className="text-[11px] font-semibold text-gray-500 tracking-tight">
        {item.instrument.symbol}
      </span>

      {item.priceUnavailable ? (
        <div>
          <h4 className="text-sm font-semibold text-gray-400">Unavailable</h4>
          {item.reason && <p className="text-[10px] text-gray-400 mt-0.5">{item.reason}</p>}
        </div>
      ) : (
        <h4 className="text-sm font-bold text-gray-900 tracking-tight">
          {item.price !== null ? item.price.toLocaleString() : "—"}
        </h4>
      )}
    </div>
  );
}