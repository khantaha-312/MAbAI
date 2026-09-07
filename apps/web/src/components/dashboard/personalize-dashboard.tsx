"use client";

import { useState } from "react";
import { SlidersHorizontal, Sun, Moon, LayoutGrid, RotateCcw, Check } from "lucide-react";

export interface WidgetOption {
  id: string;
  label: string;
  enabled: boolean;
}

const DEFAULT_WIDGETS: WidgetOption[] = [
  { id: "market-snapshot", label: "Market Snapshot", enabled: true },
  { id: "performance-overview", label: "Performance Overview", enabled: true },
  { id: "market-heatmap", label: "Market Heatmap", enabled: true },
  { id: "portfolio-risk", label: "Portfolio Risk", enabled: true },
  { id: "smart-alerts", label: "Smart Alerts", enabled: true },
];

export default function PersonalizeDashboard() {
  const [layoutMode, setLayoutMode] = useState<"compact" | "default" | "expanded">("default");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [widgets, setWidgets] = useState<WidgetOption[]>(DEFAULT_WIDGETS);

  const toggleWidget = (id: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );
  };

  const resetToDefault = () => {
    setLayoutMode("default");
    setTheme("light");
    setWidgets(DEFAULT_WIDGETS);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal size={16} className="text-blue-600" />
          <h3 className="text-base font-semibold text-gray-900">Personalize Dashboard</h3>
        </div>

        <button
          type="button"
          onClick={resetToDefault}
          className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>
      </div>

      {/* Section 1: Layout Density */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-500">Layout Density</label>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
          {(["compact", "default", "expanded"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setLayoutMode(mode)}
              className={`py-1.5 text-xs font-medium capitalize rounded-lg transition-all ${
                layoutMode === mode
                  ? "bg-white text-gray-900 shadow-sm font-semibold"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Section 2: Appearance Theme */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-500">Theme Preference</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
              theme === "light"
                ? "border-blue-500 bg-blue-50/50 text-blue-700 font-semibold"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Sun size={14} className={theme === "light" ? "text-blue-600" : "text-gray-400"} />
            <span>Light</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
              theme === "dark"
                ? "border-blue-500 bg-blue-50/50 text-blue-700 font-semibold"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Moon size={14} className={theme === "dark" ? "text-blue-600" : "text-gray-400"} />
            <span>Dark</span>
          </button>
        </div>
      </div>

      {/* Section 3: Visible Widgets Toggles */}
      <div className="space-y-2 pt-1 border-t border-gray-100">
        <label className="text-xs font-medium text-gray-500 flex items-center justify-between">
          <span>Active Widgets</span>
          <LayoutGrid size={13} className="text-gray-400" />
        </label>

        <div className="space-y-1.5">
          {widgets.map((widget) => (
            <div
              key={widget.id}
              onClick={() => toggleWidget(widget.id)}
              className="flex items-center justify-between p-2 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <span className="text-xs font-medium text-gray-700">{widget.label}</span>
              
              {/* Custom Toggle Switch */}
              <div
                className={`w-8 h-4.5 flex items-center rounded-full p-0.5 transition-colors ${
                  widget.enabled ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <div
                  className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform ${
                    widget.enabled ? "translate-x-3.5" : "translate-x-0"
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Apply Button */}
      <button
        type="button"
        className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
      >
        <Check size={14} />
        <span>Save Layout Settings</span>
      </button>

    </div>
  );
}