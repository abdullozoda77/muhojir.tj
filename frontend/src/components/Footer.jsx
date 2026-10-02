import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { t } from "../i18n.js";
import Pattern from "./Pattern.jsx";

const MVD = "https://xn--b1aew.xn--p1ai/mvd/structure1/Glavnie_upravlenija/guvm/inostrannim_grazhdanam";

const COLUMNS = [
  {
    title: () => t("Хизматҳо"),
    links: [
      ["/documents", () => t("Ҳуҷҷатҳои ман")],
      ["/calculator", () => t("Калкулятори патент")],
      ["/jobs", () => t("Ҷойи кор")],
      ["/exam", () => t("Машқ барои имтиҳон")],
    ],
  },
  {
    title: () => t("Маълумот"),
    links: [
      ["/guides", () => t("Роҳнамо ва қонунҳо")],
      ["/checks", () => t("Санҷиши ҳуҷҷатҳо")],
      ["/help", () => t("Маркази ёрии ҳуқуқӣ")],
      ["/guides#news", () => t("Хабарҳои қонун")],
    ],
  },
];

// Official sites people need most; the full list is on the help page.
const OFFICIAL = [
  [MVD, "МВД России"],
  ["https://www.gosuslugi.ru/", "Госуслуги"],
  ["https://migration.tj/", () => t("Хадамоти муҳоҷирати ҶТ")],
  ["https://tajembassy.ru/", () => t("Сафорати ҶТ дар Русия")],
];

const linkStyle = "inline-flex min-h-[36px] items-center gap-1.5 text-body-md text-on-navy transition-colors hover:text-white";

export default function Footer() {
  return (
    <footer className="relative mt-10 overflow-hidden bg-banner text-white">
      <Pattern opacity={0.07} motion="none" />
      {/* The same papers, bright, lit only where the light passes (see .paper-shine in index.css). */}
      <div aria-hidden className="paper-shine pointer-events-none absolute inset-0">
        <Pattern opacity={0.45} motion="none" />
      </div>
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-28 pt-10 md:px-8 lg:pb-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div className="col-span-2 flex flex-col gap-3 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 self-start">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white p-0.5">
                <img src="/logo.png" alt="" className="h-full w-full" />
              </span>
              <span className="font-display text-[24px] font-bold">Muhojir</span>
            </Link>
            <p className="max-w-xs text-body-md text-on-navy">{t("Ҳуҷҷатҳо сари вақт, кори боэътимод — барои муҳоҷирони тоҷик дар Русия. Ройгон ва бо забони тоҷикӣ.")}</p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title()} aria-label={col.title()} className="flex flex-col gap-1">
              <h2 className="mb-1 text-label-md uppercase tracking-wider text-navy-muted">{col.title()}</h2>
              {col.links.map(([to, label]) => (
                <Link key={to} to={to} className={linkStyle}>{label()}</Link>
              ))}
            </nav>
          ))}

          <nav aria-label={t("Сайтҳои расмӣ")} className="col-span-2 flex flex-col gap-1 lg:col-span-1">
            <h2 className="mb-1 text-label-md uppercase tracking-wider text-navy-muted">{t("Сайтҳои расмӣ")}</h2>
            {OFFICIAL.map(([href, label]) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer" className={linkStyle}>
                {typeof label === "function" ? label() : label}
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              </a>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/15 pt-5 text-body-sm text-on-navy md:flex-row md:items-start md:justify-between md:gap-8">
          <p className="whitespace-nowrap">© {new Date().getFullYear()} Muhojir</p>
          <p className="max-w-2xl md:text-right">
            {t("Muhojir сайти давлатӣ нест. Маълумот барои кӯмак аст — қоидаҳо ва нархҳоро дар сайтҳои расмӣ санҷед. Ҷойҳои кор аз сайти давлатии «Работа России» гирифта мешаванд.")}
          </p>
        </div>
      </div>
    </footer>
  );
}
