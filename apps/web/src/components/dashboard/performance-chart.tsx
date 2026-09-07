"use client";

import { useState } from "react";
import { ChevronDown, AlertCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface AlertItem {
  id: string;
  type: "HIGH" | "MEDIUM" | "LOW";
  message: string;
  time: string;
  color: string;
}

const ALERTS: AlertItem[] = [
  { id: "1", type: "HIGH", message: "BTC crossed $65,000", time: "10 mins ago", color: "bg-red-50 text-red-600 border-red-200" },
  { id: "2", type: "MEDIUM", message: "AAPL fell more than 5%", time: "25 mins ago", color: "bg-amber-50 text-amber-600 border-amber-200" },
  { id: "3", type: "LOW", message: "Gold reached target $2,350", time: "1 hr ago", color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  { id: "4", type: "MEDIUM", message: "Bullish signal on ETH/USDT", time: "2 hrs ago", color: "bg-blue-50 text-blue-600 border-blue-200" },
];

export default function PerformanceChart() {
  const [returnType, setReturnType] = useState("Cumulative Return");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full">
      
      {/* Main Chart Card (8 Columns) */}
      <div className="lg:col-span-8 p-4 bg-white border border-gray-300 rounded-2xl space-y-3 shadow-lg">
        
        {/* Chart Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-semibold text-gray-800">Market Performance Trend</h4>
            <AlertCircle size={13} className="text-gray-400" />
          </div>

          <div className="relative flex items-center">
            <select value={returnType} onChange={(e) => setReturnType(e.target.value)}
              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 pr-6 text-[11px] font-medium text-gray-700 outline-none cursor-pointer"
            >
              <option value="Cumulative Return">Cumulative Return</option>
              <option value="Daily Return">Daily Return</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Pure SVG Line Chart */}
        <div className="relative h-48 w-full pt-2 ">
          
          {/* Y-Axis Grid Guidelines */}
          <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-gray-400 pointer-events-none">
            <div className="border-b border-gray-100 flex justify-between"><span>3%</span></div>
            <div className="border-b border-gray-100 flex justify-between"><span>2%</span></div>
            <div className="border-b border-gray-100 flex justify-between"><span>1%</span></div>
            <div className="border-b border-dashed border-gray-300 flex justify-between"><span>0%</span></div>
            <div className="border-b border-gray-100 flex justify-between"><span>-1%</span></div>
            <div className="border-b border-gray-100 flex justify-between"><span>-2%</span></div>
            <div className="border-b border-gray-100 flex justify-between"><span>-3%</span></div>
          </div>

          {/* SVG Chart Graphic */}
          <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
            <defs>
              <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.0" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0.25" />
              </linearGradient>
            </defs>

            {/* Gain/Loss Area Fill Path */}
            <path
              d="M 0,75 Q 40,90 80,60 T 160,40 T 240,110 T 320,30 T 400,60 T 500,45 L 500,75 L 0,75 Z"
              fill="url(#greenGrad)"
            />

            {/* Performance Line */}
            <path
              d="M 0,75 Q 40,90 80,60 T 160,40 T 240,110 T 320,30 T 400,60 T 500,45"
              fill="none"
              stroke="#10B981"
              strokeWidth="2"
            />
          </svg>

          {/* Callout Badges on Points */}
          <div className="absolute top-[22%] left-[34%] bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
            +2.35%
          </div>

          <div className="absolute bottom-[20%] left-[53%] bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
            -1.45%
          </div>

          <div className="absolute top-[32%] right-[1%] bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
            +1.82%
          </div>
        </div>

        {/* X-Axis Timeline Labels */}
        <div className="flex justify-between text-[10px] font-medium text-gray-400 pt-1">
          <span>May 8</span>
          <span>May 9</span>
          <span>May 10</span>
          <span>May 11</span>
          <span>May 12</span>
          <span>May 13</span>
          <span>May 14</span>
        </div>

      </div>

      {/* Smart Alerts Box (4 Columns) */}
      <div className="lg:col-span-4 p-4 bg-slate-200 border border-gray-100 rounded-2xl flex flex-col justify-between">
        
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-gray-800">Smart Alerts</h4>
          <a href="#" className="text-[11px] font-semibold text-blue-600 hover:text-blue-800">View All</a>
        </div>

        <div className="space-y-2.5">
          {ALERTS.map((alert) => (
            <div key={alert.id} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${alert.color}`}>
                  {alert.type}
                </span>
                <span className="text-xs font-medium text-gray-700">{alert.message}</span>
              </div>
              <span className="text-[10px] text-gray-400">{alert.time}</span>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}