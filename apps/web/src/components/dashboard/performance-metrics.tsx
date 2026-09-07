"use client";

import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useWinRate } from "./useWinRate"; // adjust path if useWinRate.ts lives elsewhere

export interface MetricItem {
  id: string;
  label: string;
  value: string;
  change: string;
  comparisonText: string;
  isPositive: boolean;
  type?: "ring-green" | "ring-red" | "numeric";
  percentage?: number; // 0 to 100 for SVG ring charts
}

interface PerformanceMetricsProps {
  metrics?: MetricItem[]; // optional override, still supported for storybook/tests
}

/**
 * Real data wiring for Win Rate / Loss Rate / Total Analysis.
 *
 * Honest scope: backend tracks AI prediction accuracy (correct /
 * incorrect / partial directional calls), not real trade P&L or
 * position hold duration. "Avg. Hold Time" and "Profit Factor" from
 * the original mock data have no backing endpoint right now and are
 * intentionally left out — add them back only once a real source
 * exists, don't fake them.
 */
export default function PerformanceMetrics({ metrics: metricsOverride }: PerformanceMetricsProps) {
  const { data, loading, error } = useWinRate();

  if (metricsOverride) {
    // explicit override path — unchanged from original component
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 w-full">
        {metricsOverride.map((item) => (
          <MetricCard key={item.id} item={item} />
        ))}
      </div>
    );
  }

  if (loading) {
    return <div className="text-sm text-gray-400 p-4">Loading performance metrics…</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500 p-4">Couldn't load performance metrics: {error}</div>;
  }

  if (!data || data.status === "insufficient_data") {
    // Expected default state for any real user under 10 resolved entries —
    // not an error, and not shown as a fake 0%.
    return (
      <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl text-sm text-gray-600">
        Not enough resolved predictions yet to show a win rate.{" "}
        {data ? `${data.resolvedCount} of ${data.minimumRequired} needed.` : ""}
      </div>
    );
  }

  const { counts, winRatePct, totalPredictions } = data;
  if (!counts || winRatePct === undefined) {
    return <div className="text-sm text-red-500 p-4">Unexpected response shape from win-rate endpoint.</div>;
  }

  const lossRatePct = Math.round((100 - winRatePct) * 100) / 100;

  const metrics: MetricItem[] = [
    {
      id: "win-rate",
      label: "Win Rate",
      value: `${winRatePct.toFixed(1)}%`,
      change: `${counts.correct}`,
      comparisonText: "correct calls",
      isPositive: true,
      type: "ring-green",
      percentage: winRatePct,
    },
    {
      id: "loss-rate",
      label: "Loss Rate",
      value: `${lossRatePct.toFixed(1)}%`,
      change: `${counts.incorrect}`,
      comparisonText: "incorrect calls",
      isPositive: false,
      type: "ring-red",
      percentage: lossRatePct,
    },
    {
      id: "total-analysis",
      label: "Total Analysis",
      value: `${totalPredictions}`,
      change: "",
      comparisonText: "AI analyses logged",
      isPositive: true,
      type: "numeric",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 w-full">
      {metrics.map((item) => (
        <MetricCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function MetricCard({ item }: { item: MetricItem }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-100 border border-slate-200 rounded-2xl shadow-sm hover:border-gray-200 transition-all">
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-500">{item.label}</p>
        <h4 className="text-xl font-bold text-gray-900 tracking-tight">{item.value}</h4>

        {/* Trend Indicator / Count Row */}
        <div className="flex items-center gap-1 text-[11px]">
          {item.change && (
            <span
              className={`flex items-center font-semibold ${
                item.isPositive ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {item.isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {item.change}
            </span>
          )}
          <span className="text-gray-400 truncate max-w-[140px]">{item.comparisonText}</span>
        </div>
      </div>

      {/* Ring Visualizer for Win/Loss Rates */}
      {item.type && item.type !== "numeric" && item.percentage !== undefined && (
        <CircularProgress
          percentage={item.percentage}
          color={item.type === "ring-green" ? "#10B981" : "#EF4444"}
        />
      )}
    </div>
  );
}

// SVG Ring Chart Component
function CircularProgress({ percentage, color }: { percentage: number; color: string }) {
  const size = 48;
  const strokeWidth = 4;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-12 h-12 flex-shrink-0">
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          stroke="#F3F4F6"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={center}
          cy={center}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          r={radius}
          cx={center}
          cy={center}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-gray-700">
        {Math.round(percentage)}%
      </span>
    </div>
  );
}
























// "use client";

// import { ArrowUpRight, ArrowDownRight } from "lucide-react";

// export interface MetricItem {
//   id: string;
//   label: string;
//   value: string;
//   change: string;
//   comparisonText: string;
//   isPositive: boolean;
//   type?: "ring-green" | "ring-red" | "numeric";
//   percentage?: number; // 0 to 100 for SVG ring charts
// }

// const DEFAULT_METRICS: MetricItem[] = [
//   {
//     id: "win-rate",
//     label: "Win Rate",
//     value: "62.4%",
//     change: "5.6%",
//     comparisonText: "vs Apr 30 – May 7",
//     isPositive: true,
//     type: "ring-green",
//     percentage: 62.4,
//   },
//   {
//     id: "loss-rate",
//     label: "Loss Rate",
//     value: "37.6%",
//     change: "5.6%",
//     comparisonText: "vs Apr 30 – May 7",
//     isPositive: false,
//     type: "ring-red",
//     percentage: 37.6,
//   },
//   {
//     id: "total-trades",
//     label: "Total Trades",
//     value: "48",
//     change: "8",
//     comparisonText: "vs Apr 30 – May 7",
//     isPositive: true,
//     type: "numeric",
//   },
//   {
//     id: "avg-hold-time",
//     label: "Avg. Hold Time",
//     value: "2h 45m",
//     change: "18m",
//     comparisonText: "vs Apr 30 – May 7",
//     isPositive: true,
//     type: "numeric",
//   },
//   {
//     id: "profit-factor",
//     label: "Profit Factor",
//     value: "1.67",
//     change: "0.23",
//     comparisonText: "vs Apr 30 – May 7",
//     isPositive: true,
//     type: "numeric",
//   },
// ];

// interface PerformanceMetricsProps {
//   metrics?: MetricItem[];
// }

// export default function PerformanceMetrics({ metrics = DEFAULT_METRICS }: PerformanceMetricsProps) {
//   return (
//     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full">
//       {metrics.map((item) => (
//         <MetricCard key={item.id} item={item} />
//       ))}
//     </div>
//   );
// }

// function MetricCard({ item }: { item: MetricItem }) {
//   return (
//     <div className="flex justify-between p-4 bg-white border border-gray-900 rounded-2xl shadow-sm hover:border-gray-200 transition-all">
//       <div className="space-y-1">
//         <p className="text-xs font-medium text-gray-500">{item.label}</p>
//         <h4 className="text-xl font-bold text-gray-900 tracking-tight">{item.value}</h4>
        
//         {/* Trend Indicator */}
//         <div className="flex items-center gap-1 text-[11px]">
//           <span
//             className={`flex items-center font-semibold ${
//               item.isPositive ? "text-emerald-500" : "text-red-500"
//             }`}
//           >
//             {item.isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
//             {item.change}
//           </span>
//           <span className="text-gray-400">{item.comparisonText}</span>
//         </div>
//       </div>

//       {/* Ring Visualizer for Win/Loss Rates */}
//       {item.type && item.type !== "numeric" && item.percentage !== undefined && (
//         <CircularProgress
//           percentage={item.percentage}
//           color={item.type === "ring-green" ? "#10B981" : "#EF4444"}
//         />
//       )}
//     </div>
//   );
// }

// // SVG Ring Chart Component
// function CircularProgress({ percentage, color }: { percentage: number; color: string }) {
//   const radius = 18;
//   const strokeWidth = 3.5;
//   const normalizedRadius = radius - strokeWidth * 0.5;
//   const circumference = normalizedRadius * 2 * Math.PI;
//   const strokeDashoffset = circumference - (percentage / 100) * circumference;

//   return (
//     <div className="relative flex items-center justify-center w-12 h-12 flex-shrink-0">
//       <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
//         {/* Track */}
//         <circle
//           stroke="#F3F4F6"
//           fill="transparent"
//           strokeWidth={strokeWidth}
//           r={normalizedRadius}
//           cx={radius}
//           cy={radius}
//         />
//         {/* Progress Bar */}
//         <circle
//           stroke={color}
//           fill="transparent"
//           strokeWidth={strokeWidth}
//           strokeDasharray={`${circumference} ${circumference}`}
//           style={{ strokeDashoffset }}
//           strokeLinecap="round"
//           r={normalizedRadius}
//           cx={radius}
//           cy={radius}
//           className="transition-all duration-500 ease-out"
//         />
//       </svg>
//     </div>
//   );
// }
