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
const ASSET_CLASS_MAP: Record<string, string> = {
  Stock: "STOCKS",
  Forex: "FOREX",
  Commodities: "COMMODITIES",
  Crypto: "CRYPTO",
};
const RISK_MAP: Record<string, string> = { Low: "LOW", Medium: "MEDIUM", High: "HIGH" };

const ASSET_CLASS_TO_SEARCH_TYPE: Record<string, string[]> = {
  Stock: ["equity"],
  Forex: ["forex"],
  Crypto: ["crypto"],
  Commodities: ["metal", "oil"], // ambiguous — don't auto-narrow if this is the only/one of several selections
};

function resolveAssetTypeFilter(investmentOptions: string[]): string | undefined {
  const types = new Set<string>();
  for (const option of investmentOptions) {
    for (const t of ASSET_CLASS_TO_SEARCH_TYPE[option] ?? []) types.add(t);
  }
  // Only filter when it narrows to exactly one unambiguous type.
  return types.size === 1 ? [...types][0] : undefined;
}

interface InstrumentResult {
  symbol: string;
  name: string;
  assetType: string; // crypto | equity | forex | metal | oil
}

function Section({
  title,
  subtitle,
  children,
  full = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div
      className={`rounded-[10px] bg-white/90 p-3.5 shadow-sm border border-[#14121F]/10 ${
        full ? "sm:col-span-2" : ""
      }`}
    >
      <h2 className="text-[13px] font-semibold text-[#14121F]">{title}</h2>
      {subtitle && <p className="mt-0.5 text-[10.5px] text-[#63637A] leading-tight">{subtitle}</p>}
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

function OptionGroup({
  options,
  selected,
  onToggle,
  multi,
}: {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
  multi: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            aria-pressed={isSelected}
            className={`flex h-[30px] items-center gap-1.5 rounded-[7px] border px-2.5 text-[12px] transition-all ${
              isSelected
                ? "border-[#33368D] bg-white shadow-[0_0_6px_2px_rgba(0,100,141,0.16)]"
                : "border-[#14121F]/25 bg-white/60 hover:border-[#33368D]"
            }`}
          >
            <span
              className={`flex h-3 w-3 shrink-0 items-center justify-center border-2 ${
                multi ? "rounded-[3px]" : "rounded-full"
              } ${isSelected ? "border-[#33368D]" : "border-[#7895A3]"}`}
            >
              {isSelected && (
                <span
                  className={`bg-[#33368D] ${multi ? "h-1.5 w-1.5 rounded-[1px]" : "h-1.5 w-1.5 rounded-full"}`}
                />
              )}
            </span>
            <span className="text-[#293746]">{option}</span>
          </button>
        );
      })}
    </div>
  );
}

// Symbol search box. Calls GET /instruments/search — NOT YET CONFIRMED LIVE on the
// backend (spec sent to backend chat). Fails gracefully with a message instead of
// a raw fetch error until that endpoint exists.
function SymbolSearch({
  selected,
  onAdd,
  onRemove,
  investmentOptions,
}: {
  selected: InstrumentResult[];
  onAdd: (item: InstrumentResult) => void;
  onRemove: (symbol: string) => void;
  investmentOptions: string[];
}) {
  const api = useApiClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InstrumentResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "unavailable">("idle");

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setStatus("idle");
      return;
    }
    const timeout = setTimeout(async () => {
      setStatus("loading");
      try {
        const assetType = resolveAssetTypeFilter(investmentOptions);
        const params = new URLSearchParams({ q: query });
        if (assetType) params.set("assetType", assetType);

        const data = await api.get<InstrumentResult[]>(
          `/instruments/search?${params.toString()}`
        );
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
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search stocks, crypto, forex, commodities (e.g. AAPL, BTC, XAU)"
        className="h-[46px] w-full rounded-[9px] bg-[#E3E7F5] px-4 text-[14px] text-[#181826] outline-none placeholder:text-[#989DB4] focus:ring-2 focus:ring-[#3F4AA8]/25"
      />

      {status === "unavailable" && (
        <p className="mt-2 text-[12.5px] text-[#B0561D]">
          Symbol search isn&apos;t available yet — this is a pending backend feature, not
          something wrong with your search.
        </p>
      )}

      {status === "loading" && (
        <p className="mt-2 text-[12.5px] text-[#63637A]">Searching...</p>
      )}

      {results.length > 0 && (
        <div className="mt-2 flex flex-col gap-1 rounded-[9px] border border-[#14121F]/10 bg-white p-1">
          {results.map((r) => (
            <button
              key={`${r.assetType}-${r.symbol}`}
              type="button"
              onClick={() => {
                onAdd(r);
                setQuery("");
                setResults([]);
              }}
              className="flex items-center justify-between rounded-[6px] px-3 py-2 text-left text-[14px] hover:bg-[#F0F0FA]"
            >
              <span>
                <span className="font-medium text-[#181826]">{r.symbol}</span>{" "}
                <span className="text-[#63637A]">{r.name}</span>
              </span>
              <span className="text-[11px] uppercase text-[#989DB4]">{r.assetType}</span>
            </button>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((s) => (
            <span
              key={`${s.assetType}-${s.symbol}`}
              className="flex items-center gap-1.5 rounded-full bg-[#E3E7F5] px-3 py-1.5 text-[13px] text-[#181826]"
            >
              {s.symbol}
              <button type="button" onClick={() => onRemove(s.symbol)}>
                <X className="h-3.5 w-3.5 text-[#63637A] hover:text-[#181826]" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  const router = useRouter();
  const api = useApiClient();

  const [tradingType, setTradingType] = useState<string[]>([]);
  const [tradingStyle, setTradingStyle] = useState<string[]>([]);
  const [investmentOptions, setInvestmentOptions] = useState<string[]>([]);
  const [riskTolerance, setRiskTolerance] = useState<string | null>(null);
  const [selectedInstruments, setSelectedInstruments] = useState<InstrumentResult[]>([]);

  const [spotHoldingPeriod, setSpotHoldingPeriod] = useState<string | null>(null);
  const [futuresMarket, setFuturesMarket] = useState<string | null>(null);
  const [futuresLeverage, setFuturesLeverage] = useState<string | null>(null);
  const [forexPairs, setForexPairs] = useState<string[]>([]);
  const [commodities, setCommodities] = useState<string[]>([]);
  const [cryptoAssets, setCryptoAssets] = useState<string[]>([]);
  const [investmentGoal, setInvestmentGoal] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function toggle(list: string[], setList: (v: string[]) => void, option: string) {
    setList(list.includes(option) ? list.filter((o) => o !== option) : [...list, option]);
  }

  const hasForex = investmentOptions.includes("Forex");
  const hasCommodities = investmentOptions.includes("Commodities");
  const hasCrypto = investmentOptions.includes("Crypto");
  const hasSpot = tradingType.includes("Spot Trading");
  const hasFutures = tradingType.includes("Futures Trading");

  const canSubmit =
    tradingType.length > 0 &&
    tradingStyle.length > 0 &&
    investmentOptions.length > 0 &&
    !!riskTolerance;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitError(null);
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        tradingType: tradingType.map((o) => TRADING_TYPE_MAP[o]).filter(Boolean),
        tradingStyle: tradingStyle.map((o) => TRADING_STYLE_MAP[o]).filter(Boolean),
        assetClasses: investmentOptions.map((o) => ASSET_CLASS_MAP[o]).filter(Boolean),
        selectedSymbols: selectedInstruments.map((s) => s.symbol),
        riskAppetite: riskTolerance ? RISK_MAP[riskTolerance] : undefined,
        onboardingDetails: {
          spotHoldingPeriod,
          futuresMarket,
          futuresLeverage,
          forexPairs,
          commodities,
          cryptoAssets,
          investmentGoal,
        },
      };

      await api.post("/onboarding/profile", payload);
      await api.put("/profile", { onboardingCompleted: true });

      router.push("/onboarding/dashboard");
    } catch (err: any) {
      setSubmitError(
        err?.message ?? "Could not save your profile. Please check your answers and try again."
      );
    } opacity: 1;
    setSubmitting(false);
  }

  return (
    <main className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#F7F6FB] py-10">
      <LowPolyBackground />

      <div className="relative z-10 mx-auto w-full max-w-[720px] px-6">
        <h1
          className="text-[26px] font-semibold text-[#14121F]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Set up your trading profile
        </h1>
        <p className="mt-1 text-[13px] text-[#63637A]">
          A few quick questions — pick everything that applies, then submit once.
        </p>

        <div className="mt-6 flex flex-col gap-5">
          <Section title="Trading type" subtitle="Select one or more">
            <OptionGroup
              options={["Spot Trading", "Futures Trading"]}
              selected={tradingType}
              onToggle={(o) => toggle(tradingType, setTradingType, o)}
              multi
            />
          </Section>

          {hasSpot && (
            <Section title="Spot: preferred holding period">
              <OptionGroup
                options={["Same Day", "Few Days", "Few Weeks", "Several Months"]}
                selected={spotHoldingPeriod ? [spotHoldingPeriod] : []}
                onToggle={(o) => setSpotHoldingPeriod(o === spotHoldingPeriod ? null : o)}
                multi={false}
              />
            </Section>
          )}

          {hasFutures && (
            <Section title="Futures details" subtitle="Leverage applies here — spot trading has none">
              <p className="text-[13px] text-[#33334A] mb-2">Market</p>
              <OptionGroup
                options={["Crypto", "Stock Indices", "Commodities"]}
                selected={futuresMarket ? [futuresMarket] : []}
                onToggle={(o) => setFuturesMarket(o === futuresMarket ? null : o)}
                multi={false}
              />
              <p className="text-[13px] text-[#33334A] mt-4 mb-2">Leverage level</p>
              <OptionGroup
                options={["Low", "Medium", "High"]}
                selected={futuresLeverage ? [futuresLeverage] : []}
                onToggle={(o) => setFuturesLeverage(o === futuresLeverage ? null : o)}
                multi={false}
              />
            </Section>
          )}

          <Section title="Trading style" subtitle="How you trade day-to-day — select one or more">
            <OptionGroup
              options={["Scalping", "Intraday", "Swing", "Short Term", "Long Term"]}
              selected={tradingStyle}
              onToggle={(o) => toggle(tradingStyle, setTradingStyle, o)}
              multi
            />
          </Section>

          <Section title="Asset classes" subtitle="Select one or more">
            <OptionGroup
              options={["Stock", "Forex", "Commodities", "Crypto"]}
              selected={investmentOptions}
              onToggle={(o) => toggle(investmentOptions, setInvestmentOptions, o)}
              multi
            />
          </Section>

          {hasForex && (
            <Section title="Currency pairs" subtitle="Stopgap list — will move to search once available">
              <OptionGroup
                options={["Major Pairs", "Minor Pairs", "Exotic Pairs"]}
                selected={forexPairs}
                onToggle={(o) => toggle(forexPairs, setForexPairs, o)}
                multi
              />
            </Section>
          )}

          {hasCommodities && (
            <Section title="Commodities" subtitle="Stopgap list — will move to search once available">
              <OptionGroup
                options={["Gold", "Silver", "Oil", "Natural Gas"]}
                selected={commodities}
                onToggle={(o) => toggle(commodities, setCommodities, o)}
                multi
              />
            </Section>
          )}

          {hasCrypto && (
            <Section title="Crypto assets" subtitle="Stopgap list — will move to search once available">
              <OptionGroup
                options={["Bitcoin", "Ethereum", "Altcoins", "DeFi"]}
                selected={cryptoAssets}
                onToggle={(o) => toggle(cryptoAssets, setCryptoAssets, o)}
                multi
              />
            </Section>
          )}

          <Section
            title="Symbols you want to watch"
            subtitle="Search for any stock, crypto, forex pair, or commodity"
          >
            <SymbolSearch
              selected={selectedInstruments}
              investmentOptions={investmentOptions}
              onAdd={(item) =>
                setSelectedInstruments((prev) =>
                  prev.some((p) => p.symbol === item.symbol) ? prev : [...prev, item]
                )
              }
              onRemove={(symbol) =>
                setSelectedInstruments((prev) => prev.filter((p) => p.symbol !== symbol))
              }
            />
          </Section>

          <Section title="Risk tolerance" subtitle="One overall answer, applies across everything above">
            <OptionGroup
              options={["Low", "Medium", "High"]}
              selected={riskTolerance ? [riskTolerance] : []}
              onToggle={(o) => setRiskTolerance(o === riskTolerance ? null : o)}
              multi={false}
            />
          </Section>

          <Section title="Primary investment goal" subtitle="Optional">
            <OptionGroup
              options={[
                "Short-term profit",
                "Long-term growth",
                "Capital preservation",
                "Portfolio diversification",
              ]}
              selected={investmentGoal ? [investmentGoal] : []}
              onToggle={(o) => setInvestmentGoal(o === investmentGoal ? null : o)}
              multi={false}
            />
          </Section>

          {submitError && <p className="text-sm text-red-500">{submitError}</p>}

          <button
            type="button"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            className="h-[48px] w-full rounded-[10px] bg-[#3F4AA8] text-[14px] font-medium text-white transition-colors hover:bg-[#333D94] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Complete setup"}
          </button>
        </div>
      </div>
    </main>
  );
}





































// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { ArrowRight, Check } from "lucide-react";
// import { LowPolyBackground } from "@/components/marketing/low-poly-background";

// type Market = {
//   id: string;
//   name: string;
//   description: string;
//   available: boolean;
// };

// const MARKETS: Market[] = [
//   { id: "equities", name: "Equities", description: "In-depth equity analysis", available: true },
//   { id: "crypto", name: "Crypto", description: "Verified blockchain insights", available: true },
//   { id: "futures", name: "Futures", description: "Inter futures and cliate analytics", available: false },
//   { id: "forex", name: "Forex", description: "Inter verified blockchain insights", available: false },
//   { id: "commodities", name: "Commodities", description: "Inter commod. and commodities", available: false },
//   { id: "sentiment", name: "Market Sentiment", description: "Inter marked market sentiment", available: false },
// ];

// const PROGRESS = 70; // % of onboarding completed

// export default function Page() {
//   const router = useRouter();
//   const [selected, setSelected] = useState<string[]>(["equities", "crypto"]);

//   function toggle(id: string) {
//     setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
//   }

//   function handleContinue() {
//     // TODO: persist `selected` here (API call / Clerk user metadata / etc.)
//     router.push("/");
//   }

//   return (
//     <main className="relative flex min-h-screen w-full flex-col items-center overflow-hidden bg-[#F7F6FB]">
//       <LowPolyBackground />

//       {/* Progress bar */}
//       <div className="relative z-10 w-full px-6 pt-6">
//         <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#14121F]/10">
//           <div
//             className="h-full rounded-full bg-[#33368D] transition-all"
//             style={{ width: `${PROGRESS}%` }}
//           />
//         </div>
//       </div>

//       <div className="relative z-10 flex w-full max-w-[780px] flex-1 flex-col items-center justify-center px-6 py-12">
//         <h1
//           className="text-center text-[26px] font-medium text-[#14121F]"
//           style={{ fontFamily: "var(--font-display)" }}
//         >
//           Which markets do you want VeritasIQ to help you understand?
//         </h1>

//         <div className="mt-9 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
//           {MARKETS.map((m) => {
//             const isSelected = selected.includes(m.id);

//             if (!m.available) {
//               return (
//                 <div
//                   key={m.id}
//                   className="rounded-[14px] border border-[#E7E5F0] bg-white/60 p-5"
//                 >
//                   <h2 className="text-lg font-medium text-[#9694A8]">{m.name}</h2>
//                   <p className="mt-1 text-sm text-[#9694A8]">{m.description}</p>
//                   <span className="mt-3 inline-block rounded-full border border-[#EAD5D5] bg-[#FAEDEC] px-2.5 py-1 text-[11px] font-medium text-[#A25454]">
//                     Coming Soon
//                   </span>
//                 </div>
//               );
//             }

//             return (
//               <button
//                 key={m.id}
//                 type="button"
//                 aria-pressed={isSelected}
//                 onClick={() => toggle(m.id)}
//                 className={
//                   "rounded-[14px] border p-5 text-left transition-all " +
//                   (isSelected
//                     ? "border-[#33368D] bg-white shadow-[0_0_0_3px_rgba(51,54,141,0.12),0_8px_24px_rgba(51,54,141,0.18)]"
//                     : "border-[#E7E5F0] bg-white shadow-[0_2px_10px_rgba(20,18,31,0.05)] hover:border-[#C9C8E0]")
//                 }
//               >
//                 <div className="flex items-start justify-between">
//                   <h2 className="text-lg font-medium text-[#14121F]">{m.name}</h2>
//                   {isSelected && (
//                     <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#33368D]">
//                       <Check className="h-3 w-3 text-white" />
//                     </span>
//                   )}
//                 </div>
//                 <p className="mt-1 text-sm text-[#6B6B80]">{m.description}</p>
//                 <p className="mt-3 text-xs text-[#6B6B80]">
//                   Status: <span className="font-medium text-[#33368D]">Fully active</span>
//                 </p>
//               </button>
//             );
//           })}
//         </div>

//         <button
//           type="button"
//           disabled={selected.length === 0}
//           onClick={handleContinue}
//           className="mt-9 flex h-[44px] items-center justify-center gap-1.5 rounded-[9px] bg-[#33368D] px-6 text-sm font-medium text-white transition-colors hover:bg-[#3d40a8] disabled:opacity-60"
//         >
//           Continue
//           <ArrowRight className="h-4 w-4" />
//         </button>
//       </div>
//     </main>
//   );
// }




/*
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { LowPolyBackground } from "@/components/marketing/low-poly-background";

// All onboarding questions and their options.
const QUESTIONS = [
  {
    id: "tradingType",
    question: "1) Which type of trading are you interested in?",
    options: ["Spot Trading", "Futures Trading"],
  },
  {
    id: "tradingStyle",
    question: "2) Which trading style are you interested in?",
    options: [
      "Scalping",
      "Intraday",
      "Swing",
      "Short Term Investment",
      "Long Term Investment",
    ],
  },
  {
    id: "investmentOption",
    question: "3) Which investment option are you interested in?",
    options: ["Stock", "Forex", "Commodities", "Crypto"],
  },
  {
    id: "companyShares",
    question: "4) Which company shares are you interested in?",
    options: ["Microsoft", "Apple", "Amazon", "Tesla", "Google"],
  },
  {
    id: "investmentPlan",
    question: "5) What is your investment plan?",
    options: ["Weekly", "Monthly", "Quarterly", "Yearly"],
  },
];

export default function Page() {
  const router = useRouter();

  // Keeps track of which question the user is currently viewing.
  const [currentQuestion, setCurrentQuestion] = useState(0);

  // Stores the selected answer for each question.
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Get the question currently being displayed.
  const question = QUESTIONS[currentQuestion];

  // Get the answer selected for the current question.
  const selectedAnswer = answers[question.id];

  // Select an answer.
  function selectAnswer(option: string) {
    setAnswers((previousAnswers) => ({
      ...previousAnswers,
      [question.id]: option,
    }));
  }

  // Move to the next question.
  function handleNext() {
    if (!selectedAnswer) return;

    setCurrentQuestion((previousQuestion) => previousQuestion + 1);
  }

  // Save answers and finish onboarding.
  function handleContinue() {
    // TODO:
    // Save `answers` to the user's profile/database here.

    console.log("Onboarding answers:", answers);

    router.push("/");
  }

  // Check whether the user is currently on the last question.
  const isLastQuestion = currentQuestion === QUESTIONS.length - 1;

  // Progress based on the current question.
  const progress =
    ((currentQuestion + 1) / QUESTIONS.length) * 100;

  return (
    <main className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#F7F6FB]">
      // Low-poly background 
      <LowPolyBackground />

      // Progress bar 
      <div className="relative z-10 w-full px-6 pt-6">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#14121F]/10">
          <div
            className="h-full rounded-full bg-[#33368D] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      // Main question area 
      <div className="questions-container relative z-10 flex flex-1 items-center justify-center px-6 py-12">
        <div className="questions-div w-full max-w-[900px]">
          // Question 
          <h1
            className="text-[22px] font-semibold text-[#14121F]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {question.question}
          </h1>

          // Answer options 
          <div className="options-div mt-5 flex flex-wrap gap-2.5">
            {question.options.map((option) => {
              const isSelected = selectedAnswer === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => selectAnswer(option)}
                  aria-pressed={isSelected}
                  className={`
                    flex h-[52px] items-center gap-3
                    rounded-[12px] border px-4
                    text-[16px] transition-all
                    ${
                      isSelected
                        ? "border-[#33368D] bg-white shadow-[0_0_0_2px_rgba(51,54,141,0.12)]"
                        : "border-[#14121F] bg-white/60 hover:border-[#33368D]"
                    }
                  `}
                >
                  // Radio circle
                  <span className={` flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2
                      ${ isSelected ? "border-[#33368D]" : "border-[#7895A3]"} `} >
                    {isSelected && (
                      <span className="h-2.5 w-2.5 rounded-full bg-[#33368D]" />
                    )}
                  </span>

                  // Option text
                  <span className="text-[#293746]">
                    {option}
                  </span>
                </button>
              );
            })}
          </div>

          // Navigation button 
          <div className="mt-10 flex justify-center">
            {!isLastQuestion ? (
              <button
                type="button"
                disabled={!selectedAnswer}
                onClick={handleNext}
                className="
                  flex h-[44px] items-center justify-center
                  gap-1.5 rounded-[9px] bg-[#33368D]
                  px-6 text-sm font-medium text-white
                  transition-colors hover:bg-[#3d40a8]
                  disabled:cursor-not-allowed disabled:opacity-60
                "
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" disabled={!selectedAnswer} onClick={handleContinue} className="
                  flex h-[44px] items-center justify-center
                  gap-1.5 rounded-[9px] bg-[#33368D]
                  px-6 text-sm font-medium text-white
                  transition-colors hover:bg-[#3d40a8]
                  disabled:cursor-not-allowed disabled:opacity-60">
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
*/
