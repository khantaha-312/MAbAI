"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { LowPolyBackground } from "@/components/marketing/low-poly-background";
import { useApiClient } from "@/lib/api-client";

const TRADING_TYPE_MAP: Record<string, string> = {
  "Spot Trading": "SPOT",
  "Futures Trading": "FUTURES",
};
const TRADING_STYLE_MAP: Record<string, string> = {
  Scalping: "SCALPING",
  Intraday: "INTRADAY",
  Swing: "SWING",
  "Short Term": "SHORT_TERM_INVESTMENT",
  "Long Term": "LONG_TERM_INVESTMENT",
};
const ASSET_CLASS_TO_SEARCH_TYPE: Record<string, string[]> = {
  Stock: ["equity"],
  Forex: ["forex"],
  Crypto: ["crypto"],
  Commodities: ["metal", "oil"],
};
const RISK_MAP: Record<string, string> = { Low: "LOW", Medium: "MEDIUM", High: "HIGH" };

function resolveAssetTypeFilter(investmentOptions: string[]): string | undefined {
  const types = new Set<string>();
  for (const option of investmentOptions) {
    for (const t of ASSET_CLASS_TO_SEARCH_TYPE[option] ?? []) types.add(t);
  }
  return types.size === 1 ? [...types][0] : undefined;
}

interface InstrumentResult {
  symbol: string;
  name: string;
  assetType: string;
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] bg-white/90 p-3.5 shadow-sm border border-[#14121F]/10">
      <h2 className="text-[13px] font-semibold text-[#14121F]">{title}</h2>
      {subtitle && <p className="mt-0.5 text-[10.5px] text-[#63637A] leading-tight">{subtitle}</p>}
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

function OptionGroup({ options, selected, onToggle, multi }: { options: string[]; selected: string[]; onToggle: (option: string) => void; multi: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button key={option} type="button" onClick={() => onToggle(option)} aria-pressed={isSelected}
            className={`flex h-[30px] items-center gap-1.5 rounded-[7px] border px-2.5 text-[12px] transition-all ${isSelected ? "border-[#33368D] bg-white shadow-[0_0_6px_2px_rgba(0,100,141,0.16)]" : "border-[#14121F]/25 bg-white/60 hover:border-[#33368D]"}`}>
            <span className={`flex h-3 w-3 shrink-0 items-center justify-center border-2 ${multi ? "rounded-[3px]" : "rounded-full"} ${isSelected ? "border-[#33368D]" : "border-[#7895A3]"}`}>
              {isSelected && <span className={`bg-[#33368D] ${multi ? "h-1.5 w-1.5 rounded-[1px]" : "h-1.5 w-1.5 rounded-full"}`} />}
            </span>
            <span className="text-[#293746]">{option}</span>
          </button>
        );
      })}
    </div>
  );
}

function SymbolSearch({ selected, onAdd, onRemove, investmentOptions }: { selected: InstrumentResult[]; onAdd: (item: InstrumentResult) => void; onRemove: (symbol: string) => void; investmentOptions: string[] }) {
  const api = useApiClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InstrumentResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "unavailable">("idle");

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setStatus("idle"); return; }
    const timeout = setTimeout(async () => {
      setStatus("loading");
      try {
        const assetType = resolveAssetTypeFilter(investmentOptions);
        const params = new URLSearchParams({ q: query });
        if (assetType) params.set("assetType", assetType);
        const data = await api.get<InstrumentResult[]>(`/instruments/search?${params.toString()}`);
        setResults(data);
        setStatus("idle");
      } catch {
        setResults([]);
        setStatus("unavailable");
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, investmentOptions]);

  return (
    <div>
      <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
        placeholder="Search stocks, crypto, forex, commodities (e.g. AAPL, BTC, XAU)"
        className="h-[46px] w-full rounded-[9px] bg-[#E3E7F5] px-4 text-[14px] text-[#181826] outline-none placeholder:text-[#989DB4] focus:ring-2 focus:ring-[#3F4AA8]/25" />
      {status === "unavailable" && <p className="mt-2 text-[12.5px] text-[#B0561D]">Symbol search is temporarily unavailable.</p>}
      {status === "loading" && <p className="mt-2 text-[12.5px] text-[#63637A]">Searching...</p>}
      {results.length > 0 && (
        <div className="mt-2 flex flex-col gap-1 rounded-[9px] border border-[#14121F]/10 bg-white p-1">
          {results.map((r) => (
            <button key={`${r.assetType}-${r.symbol}`} type="button"
              onClick={() => { onAdd(r); setQuery(""); setResults([]); }}
              className="flex items-center justify-between rounded-[6px] px-3 py-2 text-left text-[14px] hover:bg-[#F0F0FA]">
              <span><span className="font-medium text-[#181826]">{r.symbol}</span> <span className="text-[#63637A]">{r.name}</span></span>
              <span className="text-[11px] uppercase text-[#989DB4]">{r.assetType}</span>
            </button>
          ))}
        </div>
      )}
      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((s) => (
            <span key={`${s.assetType}-${s.symbol}`} className="flex items-center gap-1.5 rounded-full bg-[#E3E7F5] px-3 py-1.5 text-[13px] text-[#181826]">
              {s.symbol}
              <button type="button" onClick={() => onRemove(s.symbol)}><X className="h-3.5 w-3.5 text-[#63637A] hover:text-[#181826]" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MarketsPage() {
  const router = useRouter();
  const api = useApiClient();

  const [tradingType, setTradingType] = useState<string[]>([]);
  const [tradingStyle, setTradingStyle] = useState<string[]>([]);
  const [investmentOptions, setInvestmentOptions] = useState<string[]>([]);
  const [riskTolerance, setRiskTolerance] = useState<string | null>(null);
  const [selectedInstruments, setSelectedInstruments] = useState<InstrumentResult[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function toggle(list: string[], setList: (v: string[]) => void, option: string) {
    setList(list.includes(option) ? list.filter((o) => o !== option) : [...list, option]);
  }

  const canSubmit = tradingType.length > 0 && tradingStyle.length > 0 && investmentOptions.length > 0 && !!riskTolerance && selectedInstruments.length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const sharedConfig = {
        tradingType: tradingType.map((o) => TRADING_TYPE_MAP[o]).filter(Boolean),
        tradingStyle: tradingStyle.map((o) => TRADING_STYLE_MAP[o]).filter(Boolean),
        riskAppetite: riskTolerance ? RISK_MAP[riskTolerance] : undefined,
      };
      const created = await Promise.all(
        selectedInstruments.map((instrument) =>
          api.post<{ id: string }>("/report-history/generate", { symbol: instrument.symbol, assetType: instrument.assetType, ...sharedConfig })
        )
      );
      router.push(`/onboarding/report?id=${created[0].id}&justCreated=true`);
    } catch (err: any) {
      setSubmitError(err?.message ?? "Could not generate report. Please check your answers and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#F7F6FB] py-10">
      <LowPolyBackground />
      <div className="relative z-10 mx-auto w-full max-w-[720px] px-6">
        <h1 className="text-[26px] font-semibold text-[#14121F]" style={{ fontFamily: "var(--font-display)" }}>New Report</h1>
        <p className="mt-1 text-[13px] text-[#63637A]">Pick the style and symbols for this report — this won&apos;t change your saved trading profile.</p>
        <div className="mt-6 flex flex-col gap-5">
          <Section title="Trading type" subtitle="Select one or more">
            <OptionGroup options={["Spot Trading", "Futures Trading"]} selected={tradingType} onToggle={(o) => toggle(tradingType, setTradingType, o)} multi />
          </Section>
          <Section title="Trading style" subtitle="How you trade day-to-day — select one or more">
            <OptionGroup options={["Scalping", "Intraday", "Swing", "Short Term", "Long Term"]} selected={tradingStyle} onToggle={(o) => toggle(tradingStyle, setTradingStyle, o)} multi />
          </Section>
          <Section title="Asset classes" subtitle="Select one or more">
            <OptionGroup options={["Stock", "Forex", "Commodities", "Crypto"]} selected={investmentOptions} onToggle={(o) => toggle(investmentOptions, setInvestmentOptions, o)} multi />
          </Section>
          <Section title="Symbols you want to watch" subtitle="Search for any stock, crypto, forex pair, or commodity">
            <SymbolSearch selected={selectedInstruments} investmentOptions={investmentOptions}
              onAdd={(item) => setSelectedInstruments((prev) => (prev.some((p) => p.symbol === item.symbol) ? prev : [...prev, item]))}
              onRemove={(symbol) => setSelectedInstruments((prev) => prev.filter((p) => p.symbol !== symbol))} />
          </Section>
          <Section title="Risk tolerance" subtitle="One overall answer, applies across everything above">
            <OptionGroup options={["Low", "Medium", "High"]} selected={riskTolerance ? [riskTolerance] : []} onToggle={(o) => setRiskTolerance(o === riskTolerance ? null : o)} multi={false} />
          </Section>
          {submitError && <p className="text-sm text-red-500">{submitError}</p>}
          <button type="button" disabled={!canSubmit || submitting} onClick={handleSubmit}
            className="h-[48px] w-full rounded-[10px] bg-[#3F4AA8] text-[14px] font-medium text-white transition-colors hover:bg-[#333D94] disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? "Generating..." : "Generate report"}
          </button>
        </div>
      </div>
    </main>
  );
}
