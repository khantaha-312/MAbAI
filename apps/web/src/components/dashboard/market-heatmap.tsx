"use client";

import { useState } from "react";
import { ArrowUpRight, ArrowDownRight, Info, ExternalLink } from "lucide-react";

interface HeatmapAsset {
  symbol: string;
  change: string;
  category: string;
  isPositive: boolean;
  value: number; // For color intensity
}

const HEATMAP_DATA: Record<string, HeatmapAsset[]> = {
  Stocks: [
    { symbol: "AAPL", change: "+0.73%", category: "Technology", isPositive: true, value: 0.73 },
    { symbol: "MSFT", change: "+0.45%", category: "Technology", isPositive: true, value: 0.45 },
    { symbol: "NVDA", change: "+1.35%", category: "Technology", isPositive: true, value: 1.35 },
    { symbol: "AMZN", change: "+0.22%", category: "Consumer Cyclical", isPositive: true, value: 0.22 },
    { symbol: "META", change: "-0.35%", category: "Communication", isPositive: false, value: -0.35 },
    { symbol: "GOOGL", change: "-0.12%", category: "Communication", isPositive: false, value: -0.12 },
    
    { symbol: "JPM", change: "+0.33%", category: "Financial Services", isPositive: true, value: 0.33 },
    { symbol: "BAC", change: "-0.11%", category: "Financial Services", isPositive: false, value: -0.11 },
    { symbol: "WMT", change: "+0.25%", category: "Consumer Defensive", isPositive: true, value: 0.25 },
    { symbol: "TSLA", change: "-1.21%", category: "Consumer Cyclical", isPositive: false, value: -1.21 },
    { symbol: "NFLX", change: "+0.15%", category: "Communication", isPositive: true, value: 0.15 },
    { symbol: "DIS", change: "-0.42%", category: "Communication", isPositive: false, value: -0.42 },
    
    { symbol: "XOM", change: "+0.18%", category: "Energy", isPositive: true, value: 0.18 },
    { symbol: "CVX", change: "-0.23%", category: "Energy", isPositive: false, value: -0.23 },
    { symbol: "GC=F", change: "+0.37%", category: "Commodities", isPositive: true, value: 0.37 },
    { symbol: "SI=F", change: "-0.05%", category: "Commodities", isPositive: false, value: -0.05 },
    { symbol: "CL=F", change: "+0.51%", category: "Energy", isPositive: true, value: 0.51 },
    { symbol: "NG=F", change: "-0.34%", category: "Energy", isPositive: false, value: -0.34 },
    
    { symbol: "EUR/USD", change: "-0.31%", category: "Forex", isPositive: false, value: -0.31 },
    { symbol: "GBP/USD", change: "+0.22%", category: "Forex", isPositive: true, value: 0.22 },
    { symbol: "USD/JPY", change: "+0.18%", category: "Forex", isPositive: true, value: 0.18 },
    { symbol: "AUD/USD", change: "-0.15%", category: "Forex", isPositive: false, value: -0.15 },
    { symbol: "USD/CAD", change: "+0.09%", category: "Forex", isPositive: true, value: 0.09 },
    { symbol: "USD/CHF", change: "-0.07%", category: "Forex", isPositive: false, value: -0.07 },
  ],
};

const TABS = ["Stocks", "Crypto", "Forex", "Commodities"];

export default function MarketHeatmap() {
  const [activeTab, setActiveTab] = useState("Stocks");

  const assets = HEATMAP_DATA[activeTab] || HEATMAP_DATA["Stocks"];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-base font-semibold text-gray-900">Market Heatmap</h3>
          <Info size={15} className="text-gray-400" />
        </div>

        <a 
          href="#" 
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          <span>See All Sectors</span>
          <ExternalLink size={13} />
        </a>
      </div>

      {/* Asset Type Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-100 pb-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === tab
                ? "bg-blue-50 text-blue-600 font-semibold"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid of Heatmap Tiles (6 Columns Layout) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 ">
        {assets.map((item, index) => (
          <div
            key={index}
            className={`flex flex-col items-center justify-center p-3 border text-center transition-transform hover:scale-[1.02] cursor-pointer ${
              item.isPositive
                ? "bg-green-400/70 border-emerald-200 text-emerald-950"
                : "bg-red-400/70 border-red-200 text-red-950"
            }`}
          >
            <span className="text-xs font-bold tracking-tight">{item.symbol}</span>
            <span
              className={`text-[11px] font-bold my-0.5 flex items-center gap-0.5 ${
                item.isPositive ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {item.isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {item.change}
            </span>
            <span className="text-[9px] text-gray-500 truncate max-w-full">
              {item.category}
            </span>
          </div>
        ))}
      </div>

      {/* Intensity Legend Bar */}
      <div className="pt-2 flex flex-col gap-1">
        <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-red-500 via-gray-200 to-emerald-500" />
        <div className="flex justify-between text-[10px] font-medium text-gray-400">
          <span>-2%</span>
          <span>-1%</span>
          <span>0%</span>
          <span>+1%</span>
          <span>+2%</span>
        </div>
      </div>

    </div>
  );
}