import { useId } from "react";

// The Tajik geometric ornament (an eight-point star lattice) drawn over the blue banners, in thin white lines.
export default function Pattern({ opacity = 0.14, size = 56 }) {
  const id = useId().replace(/:/g, "");
  const c = size / 2;
  const star = [
    [c, size * 0.11], [c + size * 0.09, c - size * 0.09], [size * 0.89, c], [c + size * 0.09, c + size * 0.09],
    [c, size * 0.89], [c - size * 0.09, c + size * 0.09], [size * 0.11, c], [c - size * 0.09, c - size * 0.09],
  ];
  const diamond = [[c, size * 0.29], [size * 0.71, c], [c, size * 0.71], [size * 0.29, c]];
  const points = (list) => list.map((p) => p.join(",")).join(" ");
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity }}>
      <defs>
        <pattern id={`girih-${id}`} width={size} height={size} patternUnits="userSpaceOnUse">
          <polygon points={points(star)} fill="none" stroke="#fff" strokeWidth="1.2" />
          <polygon points={points(diamond)} fill="none" stroke="#fff" strokeWidth="1.2" />
          {[[0, 0], [size, 0], [0, size], [size, size]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="#fff" />
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#girih-${id})`} />
    </svg>
  );
}

// A blue banner with the ornament. Content that should lie over its bottom edge goes right after it,
// wrapped in <Overlap>.
export function Hero({ eyebrow, title, text, children, tall = false }) {
  return (
    <section className={`relative overflow-hidden rounded-[28px] bg-primary px-6 pt-8 text-on-primary md:px-10 md:pt-10 ${tall ? "pb-28 md:pb-32" : "pb-8 md:pb-10"}`}>
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
