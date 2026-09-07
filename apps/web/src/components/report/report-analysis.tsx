"use client";

import {
  Activity,
  Building2,
  CheckCircle2,
  Globe2,
  TrendingUp,
} from "lucide-react";
import { useEvidencePackage } from "./useEvidencePackage"; // adjust path if placed elsewhere
import { useMacroSnapshot } from "./useMacroSnapshot";
import { useSymbolNarrative } from "./useSymbolNarrative";

type SectionKey = 'technical' | 'fundamental' | 'macro' | 'news' | 'sentiment';

type ReportAnalysisProps = {
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;

  assetClass: string;
  setAssetClass: (assetClass: string) => void;

  // New: which symbol this report is for. Previously hardcoded to "AAPL"
  // in JSX — now a real prop so the page/parent controls it.
  symbol: string;

  // Report-history entry id this report was generated under (?id=).
  // Present when the user arrived via the New Report form — used to
  // persist the AI narrative back onto that entry. Undefined on direct
  // visits, in which case persistence is skipped silently.
  reportHistoryId?: string;
};

export default function ReportAnalysis({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  assetClass,
  setAssetClass,
  symbol,
  reportHistoryId,
}: ReportAnalysisProps) {
  // assetClass here is expected to already be the backend's lowercase
  // assetType string ('equity' | 'crypto' | 'forex' | 'metal' | 'oil').
  // If your filter UI stores display labels like "Stocks" instead, map
  // them to real assetType values before passing down — not done here
  // since I haven't seen that mapping confirmed anywhere.
  const { data, loading, error } = useEvidencePackage(symbol, assetClass);
  const { data: macro, loading: macroLoading, error: macroError } = useMacroSnapshot();
  const narrativeState = useSymbolNarrative();

  if (loading && symbol && assetClass) {
    return <div className="p-6 text-sm text-slate-400">Loading report…</div>;
  }

  if (!symbol || !assetClass) {
    return (
      <div className="p-6 text-sm text-amber-600">
        No symbol/asset type selected yet — pass a real `symbol` prop (e.g. "AAPL") and a
        real `assetClass` value (e.g. "equity", not a display label like "Stocks") to load a report.
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-sm text-red-500">Couldn't load report: {error}</div>;
  }

  if (!data) {
    return <div className="p-6 text-sm text-slate-400">No data yet.</div>;
  }

  const priceAvailable = data.market.available && data.market.data;
  const techAvailable = data.technical.available && data.technical.data;
  const tech = techAvailable ? data.technical.data! : null;

  const applicableSections: { key: SectionKey; label: string }[] = [
    { key: 'technical', label: 'Technical' },
    ...(data.assetType === 'equity' ? [{ key: 'fundamental' as SectionKey, label: 'Fundamental' }] : []),
    { key: 'macro', label: 'Macro' },
    { key: 'news', label: 'News' },
    { key: 'sentiment', label: 'Sentiment' },
  ];

  const sectionAvailability: Record<SectionKey, boolean> = {
    technical: (data.technical as { available: boolean }).available,
    fundamental: (data.fundamental as { available: boolean })?.available ?? false,
    // Macro's real signal comes from the separate useMacroSnapshot hook (live data),
    // NOT data.macro (which is still an unwired backend stub).
    macro: !!macro,
    news: (data.news as { available: boolean })?.available ?? false,
    sentiment: (data.sentiment as { available: boolean })?.available ?? false,
  };

  const availableSections = applicableSections.filter((s) => sectionAvailability[s.key]);

  const confidenceScore = Math.round(
    (availableSections.length / applicableSections.length) * 100,
  );

  const includedLabel =
    availableSections.length > 0
      ? availableSections.map((s) => s.label).join(', ')
      : 'none yet';

  return (
    <div className="space-y-3">
      {/* Stock overview */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="grid grid-cols-[1fr_1.3fr] gap-6">
          <div>
            <div className="inline-block rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
              {data.assetType.toUpperCase()}
            </div>

            <h2 className="mt-3 text-2xl font-semibold text-slate-800">
              {data.symbol}
            </h2>

            {priceAvailable ? (
              <div className="mt-2 flex items-center gap-3">
                <span className="text-2xl font-bold text-slate-800">
                  ${data.market.data!.price.toFixed(2)}
                </span>
                {/* No % change field exists on this endpoint — would need a
                    previous-close comparison, not currently returned. */}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-400">
                Price unavailable — {data.market.reason ?? "no reason given"}
              </p>
            )}

            <p className="mt-4 text-sm text-slate-500">
              As of {new Date(data.timestamp).toLocaleString()}
            </p>
          </div>

          {/* Chart placeholder — real history requires a separate call to
              GET /market-data/history/:assetClass/:symbol, confirmed
              equity-only right now. Not wired here yet; wire once that
              endpoint's shape is confirmed for this component's needs. */}
          <div className="flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg h-28">
            Price history chart not wired yet
          </div>
        </div>
      </section>

      {/* AI synthesis — real, on-demand (not auto-fetched, costs an LLM call) */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-indigo-600" size={22} />
            <h2 className="font-semibold text-slate-800">AI Synthesis</h2>
          </div>
          {!narrativeState.narrative && (
            <button
              onClick={() => narrativeState.generate(symbol, assetClass, reportHistoryId)}
              disabled={narrativeState.loading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {narrativeState.loading ? "Generating…" : "Generate AI Synthesis"}
            </button>
          )}
        </div>
        {narrativeState.error && (
          <p className="mt-4 text-sm text-red-500">Couldn't generate: {narrativeState.error}</p>
        )}
        {narrativeState.narrative && (
          <p className="mt-4 text-sm leading-6 text-slate-600 whitespace-pre-wrap">
            {narrativeState.narrative}
          </p>
        )}
        {!narrativeState.narrative && !narrativeState.loading && !narrativeState.error && (
          <p className="mt-4 text-sm leading-6 text-slate-400">
            Click "Generate AI Synthesis" for a real, evidence-grounded explanation of this symbol.
          </p>
        )}
      </section>

      {/* Analysis cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Technical analysis — real */}
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-indigo-600" />
            <h2 className="font-semibold text-slate-800">Technical Analysis</h2>
          </div>

          {tech ? (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Metric
                  title="RSI (14)"
                  value={tech.rsi.rsi !== null ? tech.rsi.rsi.toFixed(1) : "N/A"}
                  status={`${tech.rsi.barsUsed} bars used`}
                />
                <Metric
                  title="MACD"
                  value={tech.macd.macd ? tech.macd.macd.histogram.toFixed(2) : "N/A"}
                  status="Histogram"
                />
                <Metric
                  title="SMA (50)"
                  value={tech.sma.sma[50] !== null && tech.sma.sma[50] !== undefined ? `$${tech.sma.sma[50]!.toFixed(2)}` : "N/A"}
                  status={`${tech.sma.barsUsed} bars used`}
                />
                <Metric
                  title="EMA (26)"
                  value={tech.ema.ema[26] !== null && tech.ema.ema[26] !== undefined ? `$${tech.ema.ema[26]!.toFixed(2)}` : "N/A"}
                  status={`${tech.ema.barsUsed} bars used`}
                />
              </div>

              <div className="mt-3 rounded-lg border border-slate-100 p-3">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Trend Strength</span>
                  <span className="font-semibold text-slate-700">
                    {tech.trend.trend.strength !== null ? `${Math.round(tech.trend.trend.strength * 100)}%` : "N/A"}
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-600"
                    style={{ width: `${tech.trend.trend.strength !== null ? tech.trend.trend.strength * 100 : 0}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Direction: {tech.trend.trend.direction} ({tech.trend.trend.evidenceCount} signals)
                </p>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              {data.technical.reason ?? "Technical data unavailable"}
            </p>
          )}
        </section>

        {/* Fundamental analysis — real, via Finnhub (verified: field mappings
            confirmed correct against a real payload for AAPL) */}
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-indigo-600" />
            <h2 className="font-semibold text-slate-800">Fundamental Analysis</h2>
          </div>

          {data.fundamental.available && data.fundamental.data ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Metric
                title="P/E Ratio"
                value={data.fundamental.data.peRatio !== null ? data.fundamental.data.peRatio.toFixed(2) : "N/A"}
                status="TTM"
              />
              <Metric
                title="EPS"
                value={data.fundamental.data.eps !== null ? `$${data.fundamental.data.eps.toFixed(2)}` : "N/A"}
                status="TTM"
              />
              <Metric
                title="Market Cap"
                value={
                  data.fundamental.data.marketCapitalization !== null
                    ? `$${(data.fundamental.data.marketCapitalization / 1_000_000).toFixed(2)}T`
                    : "N/A"
                }
                status="USD"
              />
              <Metric
                title="Profit Margin"
                value={data.fundamental.data.profitMargin !== null ? `${data.fundamental.data.profitMargin.toFixed(2)}%` : "N/A"}
                status="TTM"
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              {data.fundamental.reason ?? "Fundamental data unavailable"}
            </p>
          )}
        </section>

        {/* Macro analysis — real, via MacroAnalysisController */}
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Globe2 size={20} className="text-indigo-600" />
            <h2 className="font-semibold text-slate-800">Macro Analysis</h2>
          </div>

          {macro ? (
            <div className="mt-4 space-y-2">
              {macro.oil.available && macro.oil.data ? (
                <MacroItem name="WTI Crude" value={formatMacroNumber(macro.oil.data.wti, "$")} />
              ) : (
                <MacroItem name="Oil" value="Unavailable" />
              )}
              {macro.gold.available && macro.gold.data ? (
                <MacroItem name="Gold (Spot)" value={formatMacroNumber(macro.gold.data.priceUsd, "$")} />
              ) : (
                <MacroItem name="Gold" value="Unavailable" />
              )}
              {macro.usdStrength.available && macro.usdStrength.data ? (
                Object.entries(macro.usdStrength.data.pairs).map(([code, rate]) => (
                  <MacroItem key={code} name={`USD/${code}`} value={formatMacroNumber(rate, "", 4)} />
                ))
              ) : (
                <MacroItem name="USD Strength" value="Unavailable" />
              )}
            </div>
          ) : macroLoading ? (
            <p className="mt-4 text-sm text-slate-400">Loading macro data…</p>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              {macroError ?? "Macro data unavailable"}
            </p>
          )}
        </section>
      </div>

      {/* Final meaning section — reactive to AI narrative state */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-[1.7fr_0.8fr] gap-6">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-indigo-700">
              <CheckCircle2 size={19} />
              What This Means for {data.symbol}
            </h2>
            {narrativeState.narrative ? (
              <p className="mt-4 text-sm leading-6 text-slate-600 whitespace-pre-wrap">
                {narrativeState.narrative}
              </p>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                Click "Generate AI Synthesis" above for a plain-language summary of {data.symbol}.
              </p>
            )}
          </div>

          <div className="rounded-xl bg-slate-50 p-5 text-center">
            <p className="text-sm text-slate-500">Confidence Score</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">{confidenceScore}%</p>
            <p className="mt-1 text-xs text-slate-400">
              Based on {availableSections.length} of {applicableSections.length} applicable
              data sections available for {data.symbol} ({includedLabel}).
            </p>
            <div className="mt-4 h-2 rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-indigo-600"
                style={{ width: `${confidenceScore}%` }}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ title, value, status }: { title: string; value: string; status: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="mt-1 font-semibold text-slate-800">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{status}</p>
    </div>
  );
}

function MacroItem({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
      <p className="text-sm font-medium text-slate-700">{name}</p>
      <span className="text-xs font-medium text-slate-500">{value}</span>
    </div>
  );
}

/**
 * Defensive number formatting for macro values. Real cause of the original
 * "toFixed is not a function" bug was never confirmed (could be a string
 * from JSON, could be null slipping past a check) — rather than guess
 * which, this coerces via Number() and falls back to "N/A" for anything
 * that isn't a finite number, so a bad value degrades visibly instead of
 * crashing the page.
 */
function formatMacroNumber(value: unknown, prefix = "", decimals = 2): string {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? `${prefix}${n.toFixed(decimals)}` : "N/A";
}