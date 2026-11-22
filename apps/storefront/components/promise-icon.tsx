/**
 * Hand-drawn line icons for the Our Story promises (owner, 2026-11-22: "something creative" in
 * place of the same leaf on every line). One per promise, in story-page order:
 * 0 recipe card (ঐতিহ্যবাহী রেসিপি), 1 শিল-পাটা grinding stone (শিলে বাটা মসলা),
 * 2 oil drop and mustard flower (ঘানি ভাঙা সরিষার তেল), 3 sprout (প্রিজারভেটিভ ছাড়া).
 * Strokes use `pathLength={1}` so the CSS can draw them in on hover; `.dot` circles are filled
 * grains and centres that only fade. Decorative.
 */
const ICONS: readonly React.ReactNode[] = [
  // Recipe card with handwritten lines and a small heart.
  <>
    <path pathLength={1} d="M6 3.5h9.5L19 7v13.5H6z" />
    <path pathLength={1} d="M15.5 3.5V7H19" />
    <path pathLength={1} d="M8.8 10.2c1.2-.6 2.4.6 3.6 0s2.4-.6 3.4 0" />
    <path pathLength={1} d="M8.8 13.4c1.4-.5 2.6.5 4 0" />
    <path pathLength={1} d="M13.2 17.6s-2.4-1.4-2.4-2.9c0-.8 1.2-1.3 2.4-.2 1.2-1.1 2.4-.6 2.4.2 0 1.5-2.4 2.9-2.4 2.9z" />
  </>,
  // শিল-পাটা: the flat grinding slab, its roller and a few spice grains.
  <>
    <path pathLength={1} d="M3 17.5c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v.5H3z" />
    <path pathLength={1} d="M4.5 18v1.5M19.5 18v1.5" />
    <rect pathLength={1} x="6.5" y="10.5" width="11" height="3.4" rx="1.7" />
    <circle className="dot" cx="9" cy="7.2" r="0.7" />
    <circle className="dot" cx="12.6" cy="6.2" r="0.7" />
    <circle className="dot" cx="15.4" cy="7.8" r="0.7" />
    <circle className="dot" cx="11.2" cy="8.6" r="0.6" />
  </>,
  // Wood-pressed mustard oil: a drop beside a small four-petal mustard flower.
  <>
    <path pathLength={1} d="M9.5 3.5S4.5 9.4 4.5 13.2a5 5 0 0 0 10 0C14.5 9.4 9.5 3.5 9.5 3.5z" />
    <path pathLength={1} d="M7.4 13.6a2.2 2.2 0 0 0 2.1 2.1" />
    <circle className="dot" cx="18" cy="6.6" r="0.9" />
    <circle pathLength={1} cx="18" cy="4.5" r="1.3" />
    <circle pathLength={1} cx="20.1" cy="6.6" r="1.3" />
    <circle pathLength={1} cx="18" cy="8.7" r="1.3" />
    <circle pathLength={1} cx="15.9" cy="6.6" r="1.3" />
  </>,
  // Nothing added: a fresh sprout from the soil, with a small sparkle.
  <>
    <path pathLength={1} d="M12 20.5v-8" />
    <path pathLength={1} d="M12 13.5c0-3.2-2.4-5.4-6-5.4 0 3.4 2.5 5.4 6 5.4z" />
    <path pathLength={1} d="M12 11.2c0-2.8 2.1-4.8 5.4-4.8 0 3-2.2 4.8-5.4 4.8z" />
    <path pathLength={1} d="M6.5 20.5h11" />
    <path pathLength={1} d="M18.6 13.2v2.6M17.3 14.5h2.6" />
  </>,
];

export function PromiseIcon({ index }: { index: number }) {
  const icon = ICONS[index % ICONS.length];
  return (
    <span className="st-pi" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
      >
        {icon}
      </svg>
    </span>
  );
}
