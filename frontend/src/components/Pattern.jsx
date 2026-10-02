import { useId } from "react";

// Papers and books drawn over the blue banners in thin white lines: a document with a folded corner,
// an open book and a closed book, repeated in a slightly tilted grid. One 120×120 tile:
const TILE = 120;
// How the papers move. "drift" (banners): slowly across, one tile in DRIFT_SECONDS, then again from where
// they began, so the loop has no jump. "none": standing still.
const DRIFT_SECONDS = 24;

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function Pattern({ opacity = 0.14, motion = "drift" }) {
  const id = useId().replace(/:/g, "");
  const move = reducedMotion() ? "none" : motion; // people who turned animations off on the phone see it standing
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity }}>
      <defs>
        <pattern id={`papers-${id}`} width={TILE} height={TILE} patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
          {move === "drift" && (
            <animateTransform attributeName="patternTransform" type="translate" from="0 0" to={`${TILE} ${-TILE}`} dur={`${DRIFT_SECONDS}s`} repeatCount="indefinite" additive="sum" />
          )}
          <g fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            {/* document: page, folded corner, text lines */}
            <path d="M12 8h22l9 9v33H12z" />
            <path d="M34 8v9h9" />
            <path d="M18 26h18M18 32h18M18 38h12" />
            {/* open book */}
            <path d="M64 70c7-4 15-4 22 0v28c-7-4-15-4-22 0z" />
            <path d="M86 70c7-4 15-4 22 0v28c-7-4-15-4-22 0z" />
            <path d="M70 78h10M70 84h10M92 78h10M92 84h10" />
            {/* closed book with its spine */}
            <path d="M74 12h26v34H74z" />
            <path d="M80 12v34" />
            <path d="M85 22h10" />
            {/* a second small document, for rhythm */}
            <path d="M16 70h16l6 6v24H16z" />
            <path d="M32 70v6h6" />
            <path d="M21 84h12M21 90h8" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#papers-${id})`} />
    </svg>
  );
}

// On phones the banner touches the screen edges and the blue header above it, so both read as one blue block;
// from md on it is a rounded card. (The page container has px-4 py-6 on phones.)
export const EDGE_TO_EDGE = "-mx-4 -mt-6 rounded-b-[28px] md:mx-0 md:mt-0 md:rounded-[28px]";

// A blue banner with the ornament. Content that should lie over its bottom edge goes right after it,
// wrapped in <Overlap>.
export function Hero({ eyebrow, title, text, children, tall = false }) {
  return (
    <section className={`${EDGE_TO_EDGE} relative overflow-hidden bg-banner px-6 pt-8 text-white md:px-10 md:pt-10 ${tall ? "pb-28 md:pb-32" : "pb-8 md:pb-10"}`}>
      <Pattern />
      <div className="relative flex max-w-3xl flex-col gap-2">
        {eyebrow && <span className="text-label-md uppercase tracking-wider text-navy-muted">{eyebrow}</span>}
        <h1 className="font-display text-[34px] font-bold leading-[42px] md:text-[48px] md:leading-[56px]">{title}</h1>
        {text && <p className="text-body-lg text-on-navy md:text-[18px] md:leading-7">{text}</p>}
        {children}
      </div>
    </section>
  );
}

export function Overlap({ children, className = "" }) {
  return <div className={`relative z-10 -mt-20 flex flex-col gap-7 px-2 md:-mt-24 md:px-6 ${className}`}>{children}</div>;
}
