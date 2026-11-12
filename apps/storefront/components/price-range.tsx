"use client";

/**
 * Two-knob price slider over the design's .range visual (Shop.dc.html filter panel). Values are
 * whole taka; the list updates as the knobs move. The knobs cannot cross.
 */
export function PriceRange({
  lo,
  hi,
  min,
  max,
  onChange,
}: {
  lo: number;
  hi: number;
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
}) {
  const span = Math.max(1, hi - lo);
  const pct = (v: number) => ((v - lo) / span) * 100;

  return (
    <div className="range">
      <span className="track" aria-hidden="true" />
      <span
        className="fill"
        aria-hidden="true"
        style={{ left: `${pct(min)}%`, right: `${100 - pct(max)}%` }}
      />
      <span className="knob" aria-hidden="true" style={{ left: `${pct(min)}%` }} />
      <span className="knob" aria-hidden="true" style={{ left: `${pct(max)}%` }} />
      <input
        type="range"
        className="rng"
        min={lo}
        max={hi}
        step={1}
        value={min}
        aria-label="Lowest price, taka"
        aria-valuetext={`৳${min}`}
        onChange={(e) => onChange(Math.min(Number(e.target.value), max), max)}
      />
      <input
        type="range"
        className="rng"
        min={lo}
        max={hi}
        step={1}
        value={max}
        aria-label="Highest price, taka"
        aria-valuetext={`৳${max}`}
        onChange={(e) => onChange(min, Math.max(Number(e.target.value), min))}
      />
    </div>
  );
}
