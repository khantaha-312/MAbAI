"use client";

import {
  Activity,
  Building2,
  CheckCircle2,
  Globe2,
  Newspaper,
  TrendingUp,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useEvidencePackage, type SentimentData } from "./useEvidencePackage";
import { useMacroSnapshot } from "./useMacroSnapshot";
import { useSymbolNarrative } from "./useSymbolNarrative";

type SectionKey = 'technical' | 'fundamental' | 'macro' | 'news' | 'sentiment';

// Explicit interfaces to satisfy TypeScript compiler
interface TechnicalData {
  rsi: { rsi: number | null; barsUsed: number };
  macd: { macd: { histogram: number } | null };
  sma: { sma: Record<number, number | null>; barsUsed: number };
  ema: { ema: Record<number, number | null>; barsUsed: number };
  bollinger: {
    bollinger: { upper: number; lower: number; percentB: number | null } | null;
    barsUsed: number;
  };
  atr: { atr: number | null; barsUsed: number };
  trend: {
    trend: {
      strength: number | null;
      direction: string;
      evidenceCount: number;
    };
  };
}

interface NewsArticle {
  headline: string;
  source: string;
  timestamp: string | number | Date;
}



type ReportAnalysisProps = {
  startDate: string;
  endDate: string;
  setStartDateAction: (date: string) => void;
  setEndDateAction: (date: string) => void;

  assetClass: string;
  setAssetClassAction: (assetClass: string) => void;

  symbol: string;
  reportHistoryId?: string;
};

export default function ReportAnalysis({
  startDate,
  endDate,
  setStartDateAction,
  setEndDateAction,
  assetClass,
  setAssetClassAction,
  symbol,
  reportHistoryId,
}: ReportAnalysisProps) {
  const { data, loading, error } = useEvidencePackage(symbol, assetClass);
  const { data: macro, loading: macroLoading, error: macroError } = useMacroSnapshot();
  const narrativeState = useSymbolNarrative();

  // Track the last symbol/assetClass combo to prevent duplicate generation calls
  const lastGenerationKey = useRef<string | null>(null);

  // Auto-generate narrative when symbol/assetClass changes
  useEffect(() => {
    if (symbol && assetClass && data) {
      const generationKey = `${symbol}-${assetClass}`;
      
      // Only generate if this is a new symbol/assetType combo (prevent double-firing)
      if (lastGenerationKey.current !== generationKey && !narrativeState.narrative) {
        lastGenerationKey.current = generationKey;
        narrativeState.generate(symbol, assetClass, reportHistoryId);
      }
    }
  }, [symbol, assetClass, data, narrativeState, reportHistoryId]);

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

  // Type assertions for complex dynamic properties
  const evidenceData = data as any;
  const priceAvailable = evidenceData.market?.available && evidenceData.market?.data;
  const techAvailable = evidenceData.technical?.available && evidenceData.technical?.data;
  const tech = techAvailable ? (evidenceData.technical.data as TechnicalData) : null;
  
  const newsAvailable = evidenceData.news?.available && evidenceData.news?.data;
  const newsData = newsAvailable ? (evidenceData.news.data as { articleCount: number; articles: NewsArticle[] }) : null;

  const sentimentPayload = evidenceData.sentiment?.data as SentimentData | undefined;
  const sentimentAvailable = evidenceData.sentiment?.available && !!sentimentPayload && 
    (sentimentPayload.positivePercent !== null || sentimentPayload.neutralPercent !== null || sentimentPayload.negativePercent !== null);

  // Shorthand for the six-category fundamental breakdown (null-safe)
  const c = evidenceData.fundamental?.data?.categories as import("./useEvidencePackage").EquityFundamentalCategories | undefined;

  const applicableSections: { key: SectionKey; label: string }[] = [
    { key: 'technical', label: 'Technical' },
    ...(evidenceData.assetType === 'equity' ? [{ key: 'fundamental' as SectionKey, label: 'Fundamental' }] : []),
    { key: 'macro', label: 'Macro' },
    ...(evidenceData.assetType === 'equity' ? [{ key: 'news' as SectionKey, label: 'News' }] : []),
    ...(evidenceData.assetType === 'equity' ? [{ key: 'sentiment' as SectionKey, label: 'Sentiment' }] : []),
  ];

  const sectionAvailability: Record<SectionKey, boolean> = {
    technical: !!evidenceData.technical?.available,
    fundamental: !!evidenceData.fundamental?.available,
    macro: !!macro,
    news: evidenceData.assetType === 'equity' ? !!evidenceData.news?.available : false,
    sentiment: evidenceData.assetType === 'equity' ? !!evidenceData.sentiment?.available : false,
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
              {String(evidenceData.assetType).toUpperCase()}
            </div>

            <h2 className="mt-3 text-2xl font-semibold text-slate-800">
              {evidenceData.symbol}
            </h2>

            {priceAvailable ? (
              <div className="mt-2 flex items-center gap-3">
                <span className="text-2xl font-bold text-slate-800">
                  ${evidenceData.market.data.price.toFixed(2)}
                </span>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-400">
                Price unavailable — {evidenceData.market?.reason ?? "no reason given"}
              </p>
            )}

            <p className="mt-4 text-sm text-slate-500">
              As of {new Date(evidenceData.timestamp).toLocaleString()}
            </p>
          </div>

          <div className="flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg h-28">
            Price history chart not wired yet
          </div>
        </div>
      </section>

      {/* AI synthesis */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="text-indigo-600" size={22} />
          <h2 className="font-semibold text-slate-800">AI Synthesis</h2>
        </div>
        {narrativeState.loading && (
          <p className="mt-4 text-sm text-slate-400">Generating AI synthesis…</p>
        )}
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
            Generating AI synthesis for this symbol…
          </p>
        )}
      </section>

      {/* Analysis cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Technical analysis */}
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
                <Metric
                  title="Bollinger Upper"
                  value={tech.bollinger.bollinger ? `$${tech.bollinger.bollinger.upper.toFixed(2)}` : "N/A"}
                  status={`${tech.bollinger.barsUsed} bars used`}
                />
                <Metric
                  title="Bollinger Lower"
                  value={tech.bollinger.bollinger ? `$${tech.bollinger.bollinger.lower.toFixed(2)}` : "N/A"}
                  status={`${tech.bollinger.barsUsed} bars used`}
                />
                <Metric
                  title="ATR (14)"
                  value={tech.atr.atr !== null ? `$${tech.atr.atr.toFixed(2)}` : "N/A"}
                  status={`${tech.atr.barsUsed} bars used`}
                />
                <Metric
                  title="Bollinger %B"
                  value={tech.bollinger.bollinger && tech.bollinger.bollinger.percentB !== null ? tech.bollinger.bollinger.percentB.toFixed(2) : "N/A"}
                  status={`${tech.bollinger.barsUsed} bars used`}
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
              {evidenceData.technical?.reason ?? "Technical data unavailable"}
            </p>
          )}
        </section>

        {/* Fundamental analysis */}
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-indigo-600" />
            <h2 className="font-semibold text-slate-800">Fundamental Analysis</h2>
            {evidenceData.fundamental?.data?.calculationVersion && (
              <span className="ml-auto rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                {evidenceData.fundamental.data.calculationVersion}
              </span>
            )}
          </div>

          {evidenceData.fundamental?.available && evidenceData.fundamental?.data ? (
            <div className="mt-4 space-y-4">
              {evidenceData.assetType === 'equity' ? (
                <>
                  {/* Backward-compatible headline metrics for equities */}
                  <div className="grid grid-cols-2 gap-2">
                    <Metric
                      title="P/E Ratio"
                      value={fmt(evidenceData.fundamental.data.peRatio, 2)}
                      status="TTM"
                    />
                    <Metric
                      title="EPS"
                      value={fmt(evidenceData.fundamental.data.eps, 2, "$")}
                      status="TTM"
                    />
                    <Metric
                      title="Market Cap"
                      value={
                        evidenceData.fundamental.data.marketCapitalization !== null &&
                        evidenceData.fundamental.data.marketCapitalization !== undefined
                          ? `$${(evidenceData.fundamental.data.marketCapitalization / 1_000_000).toFixed(2)}T`
                          : "N/A"
                      }
                      status="USD"
                    />
                    <Metric
                      title="Profit Margin"
                      value={fmt(evidenceData.fundamental.data.profitMargin, 2, "", "%")}
                      status="TTM"
                    />
                  </div>

                  {/* Six-category structured breakdown */}
                  {evidenceData.fundamental.data.categories && (
                    <div className="space-y-3">
                      <FundCategory title="Valuation" items={[
                        ["P/E Ratio", fmt(c!.valuation.peRatio, 2)],
                        ["Forward P/E", fmt(c!.valuation.forwardPE, 2)],
                        ["PEG", fmt(c!.valuation.peg, 2)],
                        ["P/S", fmt(c!.valuation.ps, 2)],
                        ["EV/EBITDA", fmt(c!.valuation.evEbitda, 2)],
                        ["P/B", fmt(c!.valuation.priceToBook, 2)],
                        ["Div Yield", fmt(c!.valuation.dividendYield, 2, "", "%")],
                      ]} />
                      <FundCategory title="Growth" items={[
                        ["Rev Growth (TTM)", fmt(c!.growth.revenueGrowthTTM, 2, "", "%")],
                        ["Rev Growth (3Y)", fmt(c!.growth.revenueGrowth3Y, 2, "", "%")],
                        ["Rev Growth (5Y)", fmt(c!.growth.revenueGrowth5Y, 2, "", "%")],
                        ["EPS Growth (TTM)", fmt(c!.growth.epsGrowthTTM, 2, "", "%")],
                        ["EPS Growth (3Y)", fmt(c!.growth.epsGrowth3Y, 2, "", "%")],
                      ]} />
                      <FundCategory title="Profitability" items={[
                        ["Gross Margin", fmt(c!.profitability.grossMargin, 2, "", "%")],
                        ["Operating Margin", fmt(c!.profitability.operatingMargin, 2, "", "%")],
                        ["Net Margin", fmt(c!.profitability.netMargin, 2, "", "%")],
                        ["ROE", fmt(c!.profitability.roe, 2, "", "%")],
                        ["ROA", fmt(c!.profitability.roa, 2, "", "%")],
                        ["ROI", fmt(c!.profitability.roi, 2, "", "%")],
                      ]} />
                      <FundCategory title="Financial Health" items={[
                        ["Debt / Equity", fmt(c!.financialHealth.debtToEquity, 2)],
                        ["Current Ratio", fmt(c!.financialHealth.currentRatio, 2)],
                        ["Quick Ratio", fmt(c!.financialHealth.quickRatio, 2)],
                      ]} />
                      <FundCategory title="Cash Flow" items={[
                        ["CF / Share", fmt(c!.cashFlow.cashFlowPerShare, 2, "$")],
                        ["P/FCF (Share)", fmt(c!.cashFlow.pfcfShare, 2)],
                        ["EV / FCF", fmt(c!.cashFlow.evFreeCashFlow, 2)],
                      ]} />
                      <FundCategory title="Shareholder Returns" items={[
                        ["Div / Share", fmt(c!.shareholderReturns.dividendPerShare, 2, "$")],
                        ["Payout Ratio", fmt(c!.shareholderReturns.payoutRatio, 2, "", "%")],
                        ["Div Growth (5Y)", fmt(c!.shareholderReturns.dividendGrowth5Y, 2, "", "%")],
                      ]} />
                    </div>
                  )}
                </>
              ) : evidenceData.assetType === 'crypto' ? (
                <>
                  {/* Crypto-specific headline metrics from tokenomics */}
                  {(evidenceData.fundamental.data as any).tokenomics?.available && (evidenceData.fundamental.data as any).tokenomics?.data ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Metric
                        title="Market Cap"
                        value={fmt((evidenceData.fundamental.data as any).tokenomics.data.marketCap, 2, "$")}
                        status="USD"
                      />
                      <Metric
                        title="Fully Diluted Valuation"
                        value={fmt((evidenceData.fundamental.data as any).tokenomics.data.fullyDilutedValuation, 2, "$")}
                        status="USD"
                      />
                      <Metric
                        title="Circulating Supply"
                        value={fmt((evidenceData.fundamental.data as any).tokenomics.data.circulatingSupply, 2)}
                        status="Coins"
                      />
                      <Metric
                        title="Max Supply"
                        value={fmt((evidenceData.fundamental.data as any).tokenomics.data.maxSupply, 2)}
                        status="Coins"
                      />
                      <Metric
                        title="Circulating / Max Ratio"
                        value={fmt((evidenceData.fundamental.data as any).tokenomics.data.circulatingToMaxRatio, 2, "", "%")}
                        status="Ratio"
                      />
                      <Metric
                        title="Market Cap / FDV Ratio"
                        value={fmt((evidenceData.fundamental.data as any).tokenomics.data.marketCapToFdvRatio, 2, "", "%")}
                        status="Ratio"
                      />
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-400">
                      Tokenomics data unavailable for this crypto asset
                    </p>
                  )}
                  {(evidenceData.fundamental.data as any).onChain && !(evidenceData.fundamental.data as any).onChain.available && (
                    <p className="mt-2 text-xs text-slate-400">
                      {(evidenceData.fundamental.data as any).onChain.reason}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-400">
                  Fundamental metrics not available for {evidenceData.assetType}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              {evidenceData.fundamental?.reason ?? "Fundamental data unavailable"}
            </p>
          )}
        </section>

        {/* News & Sentiment analysis */}
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Newspaper size={20} className="text-indigo-600" />
            <h2 className="font-semibold text-slate-800">News & Sentiment</h2>
          </div>

          {evidenceData.assetType === 'equity' ? (
            <>
              {newsData ? (
                <div className="mt-4 space-y-2">
                  <div className="text-xs text-slate-500">
                    {newsData.articleCount} recent headlines
                  </div>
                  {newsData.articles.slice(0, 3).map((article, index) => (
                    <div key={index} className="rounded-lg border border-slate-100 p-3">
                      <p className="text-xs font-medium text-slate-700">{article.headline}</p>
                      <p className="mt-1 text-xs text-slate-400">{article.source} • {new Date(article.timestamp).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-400">
                  {evidenceData.news?.reason ?? "News data unavailable"}
                </p>
              )}

              {sentimentAvailable && sentimentPayload ? (
                <div className="mt-3 rounded-lg border border-slate-100 p-3">
                  <div className="text-xs text-slate-500 mb-2">Sentiment Analysis</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <p className="text-xs text-green-600 font-semibold">
                        {sentimentPayload.positivePercent !== null ? `${sentimentPayload.positivePercent}%` : "N/A"}
                      </p>
                      <p className="text-xs text-slate-400">Positive</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-600 font-semibold">
                        {sentimentPayload.neutralPercent !== null ? `${sentimentPayload.neutralPercent}%` : "N/A"}
                      </p>
                      <p className="text-xs text-slate-400">Neutral</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-red-600 font-semibold">
                        {sentimentPayload.negativePercent !== null ? `${sentimentPayload.negativePercent}%` : "N/A"}
                      </p>
                      <p className="text-xs text-slate-400">Negative</p>
                    </div>
                  </div>
                  {sentimentPayload.source && (
                    <p className="mt-2 text-xs text-slate-400">
                      Source: {sentimentPayload.source}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">
                  {evidenceData.sentiment?.reason ?? "Sentiment data unavailable"}
                </p>
              )}
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              News & Sentiment not available for {evidenceData.assetType} yet — equity-only feature via Finnhub
            </p>
          )}
        </section>

        {/* Macro analysis */}
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Globe2 size={20} className="text-indigo-600" />
            <h2 className="font-semibold text-slate-800">Macro Analysis</h2>
          </div>

          {macro ? (
            <div className="mt-4 space-y-2">
              {macro.oil?.available && macro.oil?.data ? (
                <MacroItem name="WTI Crude" value={formatMacroNumber(macro.oil.data.wti, "$")} />
              ) : (
                <MacroItem name="Oil" value="Unavailable" />
              )}
              {macro.gold?.available && macro.gold?.data ? (
                <MacroItem name="Gold (Spot)" value={formatMacroNumber(macro.gold.data.priceUsd, "$")} />
              ) : (
                <MacroItem name="Gold" value="Unavailable" />
              )}
              {macro.usdStrength?.available && macro.usdStrength?.data ? (
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

      {/* Final meaning section */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-[1.7fr_0.8fr] gap-6">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-indigo-700">
              <CheckCircle2 size={19} />
              What This Means for {evidenceData.symbol}
            </h2>
            {narrativeState.narrative ? (
              <p className="mt-4 text-sm leading-6 text-slate-600 whitespace-pre-wrap">
                {narrativeState.narrative}
              </p>
            ) : narrativeState.loading ? (
              <p className="mt-4 text-sm text-slate-400">
                Generating AI synthesis for {evidenceData.symbol}…
              </p>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                AI synthesis will appear here once generated.
              </p>
            )}
          </div>

          <div className="rounded-xl bg-slate-50 p-5 text-center">
            <p className="text-sm text-slate-500">Confidence Score</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">{confidenceScore}%</p>
            <p className="mt-1 text-xs text-slate-400">
              Based on {availableSections.length} of {applicableSections.length} applicable
              data sections available for {evidenceData.symbol} ({includedLabel}).
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

/**
 * Null-safe number formatter.
 * Returns "N/A" for null/undefined, otherwise formats to `decimals` places
 * with optional prefix (e.g. "$") and suffix (e.g. "%").
 */
function fmt(val: number | null | undefined, decimals = 2, prefix = "", suffix = ""): string {
  if (val === null || val === undefined) return "N/A";
  return `${prefix}${val.toFixed(decimals)}${suffix}`;
}

/** Renders one category card inside the Fundamental Analysis section. */
function FundCategory({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div className="rounded-lg border border-slate-100 p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="grid grid-cols-2 gap-1.5">
        {items.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
            <span className="text-xs text-slate-500">{label}</span>
            <span className={`text-xs font-medium ${value === "N/A" ? "text-slate-300" : "text-slate-700"}`}>
              {value}
            </span>
          </div>
        ))}
      </div>
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

function formatMacroNumber(value: unknown, prefix = "", decimals = 2): string {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? `${prefix}${n.toFixed(decimals)}` : "N/A";
}