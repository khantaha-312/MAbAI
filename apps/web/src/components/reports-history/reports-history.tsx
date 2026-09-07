"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  Search,
  CalendarDays,
  ArrowUpDown,
  RotateCcw,
  FilePlus2,
  MoreVertical,
  ArrowRight,
  Eye,
  Download,
  Trash2,
  Landmark,
  Globe2,
  TrendingUp,
} from "lucide-react";
import { useApiClient } from "@/lib/api-client";


// ==============================
// TYPES
// ==============================

type ReportEntry = {
  id: string;
  symbol: string;
  assetType: string;
  createdAt: string;
};

type Report = ReportEntry & {
  group: string;
  date: string;
  time: string;
};

/** Map backend assetType to a human-friendly label. */
function assetTypeLabel(t: string): string {
  switch (t) {
    case "equity": return "Stock";
    case "crypto": return "Crypto";
    case "forex":  return "Forex";
    case "metal":  return "Commodity";
    case "oil":    return "Commodity";
    default:       return t;
  }
}

/** Bucket a date into Today / Previous 7 Days / Older. */
function bucketDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (d >= startOfToday) return "Today";
  const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (d >= sevenDaysAgo) return "Previous 7 Days";
  return "Older";
}

function formatEntry(e: ReportEntry): Report {
  const d = new Date(e.createdAt);
  return {
    ...e,
    group: bucketDate(e.createdAt),
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  };
}


// ==============================
// MAIN COMPONENT
// ==============================

export default function ReportsHistory() {
  const api = useApiClient();
  const router = useRouter();

  // Real data from GET /report-history
  const [reportsData, setReportsData] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<ReportEntry[]>("/report-history")
      .then((entries) => {
        if (cancelled) return;
        setReportsData(entries.map(formatEntry));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFetchError("Could not load report history.");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Search value
  const [search, setSearch] = useState("");

  // Filter values
  const [dateRange, setDateRange] = useState("Last 7 Days");
  const [assetClass, setAssetClass] = useState("All Classes");
  const [sortBy, setSortBy] = useState("Newest First");

  // Three-dot menu
  const [activeMenu, setActiveMenu] = useState<string | null>(null);


  // Filter reports
  const filteredReports = reportsData.filter((report) => {
    const searchText = report.symbol.toLowerCase();

    const matchesSearch = searchText.includes(search.toLowerCase());

    const matchesAssetClass =
      assetClass === "All Classes" ||
      assetTypeLabel(report.assetType) === assetClass;

    return matchesSearch && matchesAssetClass;
  });

  // Sort
  const sorted = [...filteredReports].sort((a, b) => {
    const da = new Date(a.createdAt).getTime();
    const db = new Date(b.createdAt).getTime();
    return sortBy === "Newest First" ? db - da : da - db;
  });


  // Separate reports into groups
  const todayReports = sorted.filter(
    (report) => report.group === "Today"
  );

  const previousReports = sorted.filter(
    (report) => report.group === "Previous 7 Days"
  );

  const olderReports = sorted.filter(
    (report) => report.group === "Older"
  );


  // Reset all filters
  function handleResetFilters() {
    setSearch("");
    setDateRange("Last 7 Days");
    setAssetClass("All Classes");
    setSortBy("Newest First");
  }


  return (
    <main className="min-h-screen w-full bg-[#f8fafc] p-6 lg:p-8">

      {/* =========================
          PAGE HEADER
      ========================= */}

      <div className="mb-5 flex items-start justify-between gap-4">

        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Reports History
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            View and manage all your previously generated AI market reports.
          </p>
        </div>


        {/* New Report button */}

        <Link href="/onboarding/new-report" className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white" >
           <FilePlus2 size={17} />
           New Report
        </Link>

      </div>


      {/* =========================
          MAIN CONTENT BOX
      ========================= */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">


        {/* =========================
            FILTERS
        ========================= */}

        <div className="grid gap-4 border-b border-slate-200 p-5 xl:grid-cols-[1.5fr_0.9fr_0.9fr_0.9fr_auto]">


          {/* Search */}

          <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3">

            <Search
              size={19}
              className="text-slate-500"
            />

            <input
              type="text"
              placeholder="Search by asset name or symbol..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />

          </div>


          {/* Date Range */}

          <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">

            <CalendarDays
              size={18}
              className="text-slate-500"
            />

            <select
              value={dateRange}
              onChange={(event) =>
                setDateRange(event.target.value)
              }
              className="w-full bg-transparent text-sm text-slate-700 outline-none"
            >
              <option>Last 7 Days</option>
              <option>Today</option>
              <option>Last 30 Days</option>
              <option>All Time</option>
            </select>

          </div>


          {/* Asset Class */}

          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">

            <select
              value={assetClass}
              onChange={(event) =>
                setAssetClass(event.target.value)
              }
              className="w-full bg-transparent text-sm text-slate-700 outline-none"
            >
              <option>All Classes</option>
              <option>Stock</option>
              <option>Crypto</option>
              <option>Forex</option>
              <option>Commodity</option>
            </select>


          </div>


          {/* Sort By */}

          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">

            <ArrowUpDown
              size={18}
              className="text-slate-500"
            />

            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value)
              }
              className="w-full bg-transparent text-sm text-slate-700 outline-none"
            >
              <option>Newest First</option>
              <option>Oldest First</option>
            </select>

          </div>


          {/* Reset Filters */}

          <button
            onClick={handleResetFilters}
            className="flex items-center justify-center gap-2 whitespace-nowrap px-2 text-sm font-medium text-violet-700"
          >
            <RotateCcw size={17} />

            Reset Filters
          </button>

        </div>


        {/* =========================
            REPORT GROUPS
        ========================= */}

        <div className="space-y-6 p-5">

          {loading && (
            <p className="py-10 text-center text-sm text-slate-400">Loading reports…</p>
          )}

          {fetchError && (
            <p className="py-10 text-center text-sm text-red-500">{fetchError}</p>
          )}

          {!loading && !fetchError && sorted.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400">No reports found.</p>
          )}

          <ReportGroup
            title="Today"
            reports={todayReports}
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
            onOpen={(id) => router.push(`/onboarding/report?id=${id}`)}
          />

          <ReportGroup
            title="Previous 7 Days"
            reports={previousReports}
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
            onOpen={(id) => router.push(`/onboarding/report?id=${id}`)}
          />

          <ReportGroup
            title="Older"
            reports={olderReports}
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
            onOpen={(id) => router.push(`/onboarding/report?id=${id}`)}
          />

        </div>


        {/* =========================
            PAGINATION
        ========================= */}

        <div className="flex flex-col gap-4 border-t border-slate-200 p-5 md:flex-row md:items-center md:justify-between">

          <p className="text-sm text-slate-500">
            Showing {sorted.length} report{sorted.length !== 1 ? "s" : ""}
          </p>


          <div className="flex items-center gap-2">

            <button className="rounded-md border border-slate-200 px-3 py-2 text-sm">
              ‹
            </button>

            <button className="rounded-md bg-violet-700 px-3 py-2 text-sm text-white">
              1
            </button>

            <button className="rounded-md border border-slate-200 px-3 py-2 text-sm">
              2
            </button>

            <button className="rounded-md border border-slate-200 px-3 py-2 text-sm">
              3
            </button>

            <span className="text-sm text-slate-500">
              ...
            </span>

            <button className="rounded-md border border-slate-200 px-3 py-2 text-sm">
              6
            </button>

            <button className="rounded-md border border-slate-200 px-3 py-2 text-sm">
              ›
            </button>

          </div>

        </div>

      </div>

    </main>
  );
}


// ==============================
// REPORT GROUP COMPONENT
// ==============================

function ReportGroup({
  title,
  reports,
  activeMenu,
  setActiveMenu,
  onOpen,
}: {
  title: string;
  reports: Report[];
  activeMenu: string | null;
  setActiveMenu: (id: string | null) => void;
  onOpen: (id: string) => void;
}) {

  // Do not show the section if it has no reports
  if (reports.length === 0) {
    return null;
  }


  return (
    <section>

      <h2 className="mb-3 text-sm font-medium text-slate-700">
        {title}
      </h2>


      <div className="space-y-3">

        {reports.map((report) => (

          <ReportCard
            key={report.id}
            report={report}
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
            onOpen={onOpen}
          />

        ))}

      </div>

    </section>
  );
}


// ==============================
// SINGLE REPORT CARD
// ==============================

function ReportCard({
  report,
  activeMenu,
  setActiveMenu,
  onOpen,
}: {
  report: Report;
  activeMenu: string | null;
  setActiveMenu: (id: string | null) => void;
  onOpen: (id: string) => void;
}) {

  // Simple first-letter icon
  const assetIcon = report.symbol.charAt(0).toUpperCase();
  const typeLabel = assetTypeLabel(report.assetType);


  return (
    <div className="relative grid gap-5 rounded-xl border border-slate-200 bg-white p-5 xl:grid-cols-[1.6fr_1fr_auto] xl:items-center">


      {/* Asset Information */}

      <div className="flex items-center gap-4">

        {/* Asset Icon */}

        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xl font-semibold text-slate-700">
          {assetIcon}
        </div>


        {/* Asset Name */}

        <div>

          <div className="flex flex-wrap items-center gap-2">

            <h3 className="font-semibold text-slate-800">
              {report.symbol}
            </h3>


            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs text-violet-700">
              {typeLabel}
            </span>

          </div>


          <p className="mt-2 text-sm text-slate-500">
            Generated: {report.date} &bull; {report.time}
          </p>

        </div>

      </div>


      {/* Analysis Types */}

      <div className="space-y-2 border-slate-100 text-sm text-slate-600 xl:border-l xl:pl-5">

        <div className="flex items-center gap-2">
          <TrendingUp size={14} />

          Technical Analysis
        </div>


        <div className="flex items-center gap-2">
          <Landmark size={14} />

          Fundamental Analysis
        </div>


        <div className="flex items-center gap-2">
          <Globe2 size={14} />

          Macro Analysis
        </div>

      </div>


      {/* Actions */}

      <div className="flex items-center justify-end gap-3">


        {/* View Report */}

        <button
          onClick={() => onOpen(report.id)}
          className="flex items-center gap-3 rounded-lg border border-violet-500 px-5 py-3 text-sm font-medium text-violet-700"
        >

          View Report

          <ArrowRight size={17} />

        </button>


        {/* Three Dot Menu */}

        <div className="relative">

          <button
            onClick={() =>
              setActiveMenu(
                activeMenu === report.id
                  ? null
                  : report.id
              )
            }
            className="rounded-lg border border-slate-200 p-3 text-slate-600"
          >
            <MoreVertical size={18} />
          </button>


          {/* Dropdown */}

          {activeMenu === report.id && (

            <div className="absolute right-0 top-12 z-20 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-2 shadow-lg">

              <button
                onClick={() => onOpen(report.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700"
              >

                <Eye size={16} />

                Open Report

              </button>


              <button className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700">

                <Download size={16} />

                Download PDF

              </button>


              <button className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-600">

                <Trash2 size={16} />

                Delete Report

              </button>

            </div>

          )}

        </div>

      </div>

    </div>
  );
}