"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { LowPolyBackground } from "@/components/marketing/low-poly-background";

type Market = {
  id: string;
  name: string;
  description: string;
  available: boolean;
};

const MARKETS: Market[] = [
  { id: "equities", name: "Equities", description: "In-depth equity analysis", available: true },
  { id: "crypto", name: "Crypto", description: "Verified blockchain insights", available: true },
  { id: "futures", name: "Futures", description: "Inter futures and cliate analytics", available: false },
  { id: "forex", name: "Forex", description: "Inter verified blockchain insights", available: false },
  { id: "commodities", name: "Commodities", description: "Inter commod. and commodities", available: false },
  { id: "sentiment", name: "Market Sentiment", description: "Inter marked market sentiment", available: false },
];

const PROGRESS = 70; // % of onboarding completed

export default function Page() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(["equities", "crypto"]);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleContinue() {
    // TODO: persist `selected` here (API call / Clerk user metadata / etc.)
    router.push("/");
  }

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center overflow-hidden bg-[#F7F6FB]">
      <LowPolyBackground />

      {/* Progress bar */}
      <div className="relative z-10 w-full px-6 pt-6">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#14121F]/10">
          <div
            className="h-full rounded-full bg-[#33368D] transition-all"
            style={{ width: `${PROGRESS}%` }}
          />
        </div>
      </div>

      <div className="relative z-10 flex w-full max-w-[780px] flex-1 flex-col items-center justify-center px-6 py-12">
        <h1
          className="text-center text-[26px] font-medium text-[#14121F]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Which markets do you want VeritasIQ to help you understand?
        </h1>

        <div className="mt-9 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          {MARKETS.map((m) => {
            const isSelected = selected.includes(m.id);

            if (!m.available) {
              return (
                <div
                  key={m.id}
                  className="rounded-[14px] border border-[#E7E5F0] bg-white/60 p-5"
                >
                  <h2 className="text-lg font-medium text-[#9694A8]">{m.name}</h2>
                  <p className="mt-1 text-sm text-[#9694A8]">{m.description}</p>
                  <span className="mt-3 inline-block rounded-full border border-[#EAD5D5] bg-[#FAEDEC] px-2.5 py-1 text-[11px] font-medium text-[#A25454]">
                    Coming Soon
                  </span>
                </div>
              );
            }

            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggle(m.id)}
                className={
                  "rounded-[14px] border p-5 text-left transition-all " +
                  (isSelected
                    ? "border-[#33368D] bg-white shadow-[0_0_0_3px_rgba(51,54,141,0.12),0_8px_24px_rgba(51,54,141,0.18)]"
                    : "border-[#E7E5F0] bg-white shadow-[0_2px_10px_rgba(20,18,31,0.05)] hover:border-[#C9C8E0]")
                }
              >
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-medium text-[#14121F]">{m.name}</h2>
                  {isSelected && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#33368D]">
                      <Check className="h-3 w-3 text-white" />
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-[#6B6B80]">{m.description}</p>
                <p className="mt-3 text-xs text-[#6B6B80]">
                  Status: <span className="font-medium text-[#33368D]">Fully active</span>
                </p>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={selected.length === 0}
          onClick={handleContinue}
          className="mt-9 flex h-[44px] items-center justify-center gap-1.5 rounded-[9px] bg-[#33368D] px-6 text-sm font-medium text-white transition-colors hover:bg-[#3d40a8] disabled:opacity-60"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </main>
  );
}