"use client";
import { motion } from "motion/react";

const CANDLES = [
  { x: 10, high: 60, low: 20, open: 45, close: 30 },
  { x: 34, high: 70, low: 35, open: 40, close: 62 },
  { x: 58, high: 55, low: 15, open: 20, close: 48 },
  { x: 82, high: 90, low: 40, open: 50, close: 80 },
  { x: 106, high: 75, low: 30, open: 65, close: 38 },
  { x: 130, high: 95, low: 45, open: 50, close: 88 },
  { x: 154, high: 80, low: 20, open: 70, close: 28 },
  { x: 178, high: 100, low: 50, open: 55, close: 92 },
  { x: 202, high: 85, low: 35, open: 40, close: 76 },
  { x: 226, high: 92, low: 42, open: 88, close: 50 },
];

export function CandlestickArt() {
  return (
    <svg
      viewBox="0 0 260 120"
      className="absolute inset-0 h-full w-full opacity-[0.18]"
      preserveAspectRatio="xMidYMid slice"
    >
      {CANDLES.map((c, i) => {
        const isUp = c.close > c.open;
        const bodyTop = 120 - Math.max(c.open, c.close);
        const bodyHeight = Math.abs(c.close - c.open) || 1;
        return (
          <g key={i}>
            <line
              x1={c.x + 6}
              x2={c.x + 6}
              y1={120 - c.high}
              y2={120 - c.low}
              stroke="var(--color-signal)"
              strokeWidth={1}
            />
            <rect
              x={c.x}
              y={bodyTop}
              width={12}
              height={bodyHeight}
              fill={isUp ? "var(--color-signal)" : "var(--color-muted)"}
              opacity={isUp ? 0.9 : 0.5}
            />
          </g>
        );
      })}
      <motion.path
        d="M 16,80 L 40,45 L 64,72 L 88,25 L 112,58 L 136,20 L 160,68 L 184,15 L 208,52 L 232,40"
        fill="none"
        stroke="var(--color-signal)"
        strokeWidth={1.5}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 2.2, ease: "easeInOut" }}
      />
    </svg>
  );
}
