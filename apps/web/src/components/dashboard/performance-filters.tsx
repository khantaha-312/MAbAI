"use client";

import { useState } from "react";
import { Calendar, ChevronDown, RotateCcw } from "lucide-react";

export interface FilterState {
  rangeType: string;
  startDate: string;
  endDate: string;
  session: string;
  assetClass: string;
}

const DEFAULT_FILTERS: FilterState = {
  rangeType: "Custom Range",
  startDate: "2024-05-08",
  endDate: "2024-05-14",
  session: "All Day",
  assetClass: "All Asset Classes",
};

interface PerformanceFiltersProps {
  onFilterChange?: (filters: FilterState) => void;
}



export default function PerformanceFilters({ onFilterChange }: PerformanceFiltersProps) {

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Helper to update individual filter properties
  const updateFilter = (key: keyof FilterState, value: string) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    if (onFilterChange) onFilterChange(updated);
  };

  // Helper to reset filters back to default values
  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    if (onFilterChange) onFilterChange(DEFAULT_FILTERS);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full bg-white">
      
      {/* Container for both filter groups */}
      <div className="flex flex-wrap items-center gap-4 p-2 bg-gray-50 border border-slate-300 rounded-xl w-full sm:w-auto">
        
        {/* 1. Date & Time Filter Block */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-gray-700">Date & Time Filter</span>
          
          <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-lg border border-gray-200 text-xs">
            
            {/* Range Type Selector */}
            <div className="relative flex items-center">
              <select
                value={filters.rangeType}
                onChange={(e) => updateFilter("rangeType", e.target.value)}
                className="appearance-none bg-transparent pl-7 pr-6 py-1.5 font-medium text-gray-700 outline-none cursor-pointer"
              >
                <option value="Custom Range">Custom Range</option>
                <option value="Today">Today</option>
                <option value="Last 7 Days">Last 7 Days</option>
                <option value="Last 30 Days">Last 30 Days</option>
              </select>
              <Calendar size={14} className="absolute left-2 text-gray-500 pointer-events-none" />
              <ChevronDown size={14} className="absolute right-1 text-gray-400 pointer-events-none" />
            </div>

            {/* Start Date */}
            <input type="date" value={filters.startDate} onChange={(e) => updateFilter("startDate", e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-700 text-xs outline-none cursor-pointer"
            />

            <span className="text-gray-400 font-medium px-0.5">–</span>

            {/* End Date */}
            <div className="relative flex items-center">
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => updateFilter("endDate", e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded pl-2 pr-7 py-1 text-gray-700 text-xs outline-none cursor-pointer"
              />
              <Calendar size={14} className="absolute right-2 text-gray-400 pointer-events-none" />
            </div>

            {/* Time / Session Selector */}
            <div className="relative flex items-center border-l border-gray-200 pl-1.5">
              <select
                value={filters.session}
                onChange={(e) => updateFilter("session", e.target.value)}
                className="appearance-none bg-transparent pl-2 pr-6 py-1.5 font-medium text-gray-700 outline-none cursor-pointer"
              >
                <option value="All Day">All Day</option>
                <option value="Regular Hours">Regular Hours</option>
                <option value="Extended Hours">Extended Hours</option>
              </select>
              <ChevronDown size={14} className="absolute right-1 text-gray-400 pointer-events-none" />
            </div>

          </div>
        </div>

        {/* 2. Asset Class Filter Block */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-gray-700">Asset Class Filter</span>
          
          <div className="relative flex items-center bg-white p-1 rounded-lg border border-gray-200 text-xs">
            <select
              value={filters.assetClass}
              onChange={(e) => updateFilter("assetClass", e.target.value)}
              className="appearance-none bg-transparent pl-3 pr-7 py-1.5 font-medium text-gray-700 outline-none cursor-pointer min-w-[140px]"
            >
              <option value="All Asset Classes">All Asset Classes</option>
              <option value="Stocks">Stocks</option>
              <option value="Crypto">Crypto</option>
              <option value="Forex">Forex</option>
              <option value="Commodities">Commodities</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 text-gray-400 pointer-events-none" />
          </div>
        </div>

      </div>

      {/* 3. Reset Filters Action Button */}
      <button
        type="button"
        onClick={handleReset}
        className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors self-end sm:self-center py-2"
      >
        <RotateCcw size={13} />
        <span>Reset Filters</span>
      </button>

    </div>
  );
}