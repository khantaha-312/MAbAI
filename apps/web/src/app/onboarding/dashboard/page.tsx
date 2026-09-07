"use client";

import DashboardHeader from "@/components/dashboard/dashboard-header";
import DashboardSidebar from "@/components/dashboard/dashboard-sidebar";
import PerformanceFilters, { FilterState } from "@/components/dashboard/performance-filters";
import PerformanceMetrics from "@/components/dashboard/performance-metrics";
import PerformanceChart from "@/components/dashboard/performance-chart";
import MarketHeatmap from "@/components/dashboard/market-heatmap";
import MarketSnapshot from "@/components/dashboard/market-snapshot";
import PersonalizeDashboard from "@/components/dashboard/personalize-dashboard";

export default function DashboardPage() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-[#F4F7FA] via-[#EBF1F7] to-[#DFE6EE]">
      {/* 1. LEFT SIDEBAR CONTAINER */}
      <aside className="left-panel hidden w-64 flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-sm md:flex">
        <div className="p-4 font-medium text-slate-500 h-full overflow-y-auto">
          <DashboardSidebar />
        </div>
      </aside>

      {/* RIGHT SIDE LAYOUT WRAPPER (Header + Dashboard Body) */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <DashboardHeader />

        {/* 2. MAIN CONTENT BODY AREA */}
        <main className="body-main-wrapper flex flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Standardized 12-Column Grid Wrapper */}
          <div className="center-div mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-6 lg:grid-cols-12">
            {/* MIDDLE SPACE (Main Dashboard Content) - Takes 8 of 12 columns */}
            <section className="center-body space-y-6 lg:col-span-8">
              {/* Market Snapshot Cards */}
              <MarketSnapshot />

              {/* Performance Overview Section */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">Performance Overview</h3>
                </div>

                <PerformanceFilters />
                <PerformanceMetrics />
                <PerformanceChart />
              </div>

              {/* Market Heatmap */}
              <MarketHeatmap />
            </section>

            {/* RIGHT SPACE (Personalization) - Takes 4 of 12 columns */}
            <aside className="right-panel space-y-6 lg:col-span-4">
              <PersonalizeDashboard />
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}