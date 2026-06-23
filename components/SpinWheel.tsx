"use client";

export interface WheelSeg {
  label: string;
  color: string;
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polar(cx, cy, r, end);
  const e = polar(cx, cy, r, start);
  const large = end - start <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y} Z`;
}

/**
 * Presentational spin wheel with EQUAL visual slices (odds are hidden;
 * the winner is decided server-side). The parent animates by changing
 * `rotation` (degrees) — CSS transitions handle the spin.
 */
export function SpinWheel({
  segments,
  rotation = 0,
  durationMs = 0,
  onSpinEnd,
  size = 280,
}: {
  segments: WheelSeg[];
  rotation?: number;
  durationMs?: number;
  onSpinEnd?: () => void;
  size?: number;
}) {
  const n = Math.max(segments.length, 1);
  const slice = 360 / n;
  const cx = 50;
  const cy = 50;
  const r = 48;

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      {/* Pointer */}
      <div
        className="absolute left-1/2 top-0 z-10 -translate-x-1/2"
        style={{
          width: 0,
          height: 0,
          borderLeft: "12px solid transparent",
          borderRight: "12px solid transparent",
          borderTop: "20px solid #111827",
        }}
      />
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: durationMs
            ? `transform ${durationMs}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`
            : undefined,
        }}
        onTransitionEnd={onSpinEnd}
      >
        <circle cx={cx} cy={cy} r={r + 1.5} fill="#111827" />
        {segments.map((seg, i) => {
          const start = i * slice;
          const end = start + slice;
          const mid = start + slice / 2;
          const labelPos = polar(cx, cy, r * 0.62, mid);
          return (
            <g key={i}>
              <path
                d={slicePath(cx, cy, r, start, end)}
                fill={seg.color}
                stroke="#ffffff"
                strokeWidth={0.5}
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                fill="#ffffff"
                fontSize={n > 8 ? 3 : 3.6}
                fontWeight="700"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${mid} ${labelPos.x} ${labelPos.y})`}
              >
                {seg.label.length > 14 ? seg.label.slice(0, 13) + "…" : seg.label}
              </text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={6} fill="#ffffff" stroke="#111827" strokeWidth={1} />
      </svg>
    </div>
  );
}
