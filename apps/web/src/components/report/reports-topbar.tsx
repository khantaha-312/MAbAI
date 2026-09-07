"use client";

import { FilePlus2, History } from "lucide-react";
import Link from "next/link";

type ReportsTopbarProps = {
  startDate: string;
  endDate: string;
  assetClass: string;
};

export default function ReportsTopbar({
  startDate,
  endDate,
  assetClass,
}: ReportsTopbarProps) {
  return (
    <div className="flex items-start justify-between gap-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reports</h1>

        <p className="mt-1 text-sm text-slate-500">Market Analysis by AI</p>
      </div>

      {/* Top controls */}
      <div className="flex items-center gap-3">
        <Link
          href="/onboarding/reports-history"
          className="flex items-center gap-2 rounded-lg border border-indigo-300 bg-white px-4 py-3 text-sm font-medium text-indigo-700 hover:bg-indigo-50 transition-colors"
        >
          <History size={17} />
          Reports History
        </Link>

        <Link
          href="/onboarding/new-report"
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <FilePlus2 size={17} />
          New Report
        </Link>
      </div>
    </div>
  );
}