"use client";

import { useMemo } from "react";

/* ------------------------------------------------------------------ */
/* Low-poly background matching the mockup:                            */
/*  - left part  : smooth light gradient (NO triangles)                */
/*  - right part : slate triangle facets, darkest bottom-right         */
/*  - 4-point sparkle star in the dark corner                          */
/* ------------------------------------------------------------------ */

const W = 1440;
const H = 900;
const COLS = 9;
const ROWS = 6;

/* Where the faceted region starts (fraction of width) and fade width */
const FACET_START = 0.52;
const FACET_FADE = 0.16;

/* Seeded PRNG so SSR + client render the exact same pattern */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type RGB = [number, number, number];

/* icy white-blue → slate → dark navy-slate */
const STOPS: Array<[number, RGB]> = [
  [0.0, [243, 248, 252]],
  [0.45, [224, 234, 243]],
  [0.62, [196, 210, 224]],
  [0.8, [126, 148, 168]],
  [1.0, [43, 62, 82]],
];

function baseColor(t: number): RGB {
  const x = Math.min(1, Math.max(0, t));
  for (let i = 1; i < STOPS.length; i++) {
    if (x <= STOPS[i][0]) {
      const [t0, c0] = STOPS[i - 1];
      const [t1, c1] = STOPS[i];
      const f = (x - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * f),
        Math.round(c0[1] + (c1[1] - c0[1]) * f),
        Math.round(c0[2] + (c1[2] - c0[2]) * f),
      ];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

function buildMesh() {
  const rand = mulberry32(20260812); // change seed for a different arrangement
  const cellW = W / COLS;
  const cellH = H / ROWS;

  /* jittered lattice points */
  const pts: Array<[number, number]> = [];
  for (let r = 0; r <= ROWS; r++) {
    for (let c = 0; c <= COLS; c++) {
      let x = c * cellW;
      let y = r * cellH;
      if (c > 0 && c < COLS) x += (rand() - 0.5) * cellW * 0.9;
      if (r > 0 && r < ROWS) y += (rand() - 0.5) * cellH * 0.9;
      pts.push([x, y]);
    }
  }
  const at = (r: number, c: number) => pts[r * (COLS + 1) + c];

  const tris: Array<{ points: string; fill: string; opacity: number }> = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p00 = at(r, c);
      const p10 = at(r, c + 1);
      const p01 = at(r + 1, c);
      const p11 = at(r + 1, c + 1);

      const quads =
        (r + c) % 2 === 0
          ? [
              [p00, p10, p11],
              [p00, p11, p01],
            ]
          : [
              [p00, p10, p01],
              [p10, p11, p01],
            ];

      for (const tri of quads) {
        const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3;
        const cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        const nx = cx / W;
        const ny = cy / H;

        /* triangles only fade in on the right — left stays smooth */
        const opacity = Math.min(1, Math.max(0, (nx - FACET_START) / FACET_FADE));
        if (opacity <= 0.02) continue;

        /* darkness: light top-right → darkest bottom-right */
        let t = nx * 0.7 + ny * 0.3;
        t += (rand() - 0.5) * 0.08;
        t = Math.min(1, Math.max(0, t));

        const [br, bg, bb] = baseColor(t);

        /* strong facet contrast on the dark side */
        const amp = 6 + 28 * t;
        const d = (rand() - 0.5) * 2 * amp;

        tris.push({
          points: tri.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" "),
          fill: `rgb(${clamp255(br + d)}, ${clamp255(bg + d)}, ${clamp255(bb + d)})`,
          opacity,
        });
      }
    }
  }
  return tris;
}

/* 4-point sparkle star */
const STAR =
  "M 0 -34 C 3 -10 10 -3 34 0 C 10 3 3 10 0 34 C -3 10 -10 3 -34 0 C -10 -3 -3 -10 0 -34 Z";

export function LowPolyBackground() {
  const tris = useMemo(buildMesh, []);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* smooth light gradient for the left (non-faceted) part */}
          <linearGradient id="lp-base" x1="0" y1="0" x2="1" y2="0.25">
            <stop offset="0" stopColor="#f5fafd" />
            <stop offset="0.5" stopColor="#eaf1f8" />
            <stop offset="1" stopColor="#dce7f0" />
          </linearGradient>
        </defs>

        <rect width={W} height={H} fill="url(#lp-base)" />

        {tris.map((t, i) => (
          <polygon
            key={i}
            points={t.points}
            fill={t.fill}
            opacity={t.opacity}
            stroke={t.fill}
            strokeWidth="1"
            strokeLinejoin="round"
          />
        ))}

        <path
          d={STAR}
          transform={`translate(${W * 0.905} ${H * 0.84}) scale(1.15)`}
          fill="#9caebf"
          opacity="0.85"
        />
      </svg>
    </div>
  );
}