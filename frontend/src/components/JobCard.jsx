import { Link } from "react-router-dom";
import { BadgeCheck, BedDouble, Clock3, ExternalLink, FileCheck2, Globe, Send, Soup } from "lucide-react";
import { t } from "../i18n.js";
import { salary } from "../format.js";
import { Chip } from "./ui.jsx";

export const isPromoted = (job) => job.promoted_until && new Date(job.promoted_until) > new Date();

export function Perks({ job }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {job.housing_provided && <Chip icon={BedDouble}>{t("Манзил медиҳанд")}</Chip>}
      {job.meals_provided && <Chip icon={Soup}>{t("Хӯрок медиҳанд")}</Chip>}
      {job.helps_with_documents && <Chip icon={FileCheck2}>{t("Дар ҳуҷҷатҳо ёрӣ медиҳад")}</Chip>}
      {job.schedule && <Chip icon={Clock3}>{job.schedule}</Chip>}
    </div>
  );
}

export function VerifiedBadge({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-tertiary-fixed px-2.5 py-1 text-label-sm text-on-tertiary-fixed ${className}`}>
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
      {t("Тасдиқшуда")}
    </span>
  );
}

// Ads imported from «Работа России» (trudvsem.ru): people apply on that site, not here.
export const isImported = (job) => job.source === "trudvsem";
export const SOURCE_NAME = "Работа России";

export function SourceBadge({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-1 text-label-sm text-on-surface-variant ${className}`}>
      <Globe className="h-3.5 w-3.5" aria-hidden />
      {t("Аз сайти «{0}»", SOURCE_NAME)}
    </span>
  );
}

// The "Apply" control: our drawer for our ads, a link to the original ad for imported ones.
export function ApplyButton({ job, onApply, className = "" }) {
  const look = `inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 text-label-lg text-on-primary hover:brightness-110 ${className}`;
  if (isImported(job)) {
    return (
      <a href={job.external_url} target="_blank" rel="noopener noreferrer" className={look}>
        <ExternalLink className="h-4 w-4" aria-hidden />
        {t("Ариза дар сайти манбаъ")}
      </a>
    );
  }
  return (
    <button type="button" onClick={() => onApply(job)} className={look}>
      <Send className="h-4 w-4" aria-hidden />
      {t("Ариза додан")}
    </button>
  );
}

// The short one-line job: letter, title, company and perks, salary on the right.
// Without onApply the whole row is a link (home page); with it there is an "Apply" button (jobs list),
// and only the title is a link, since a button may not sit inside a link.
export function JobRow({ job, onApply }) {
  const meta = [
    job.employer.name,
    onApply && job.city,
    job.housing_provided && t("манзил"),
    job.meals_provided && t("хӯрок"),
    job.helps_with_documents && t("ёрӣ бо ҳуҷҷатҳо"),
  ].filter(Boolean);

  const avatar = (
    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-fixed text-headline-sm font-bold text-primary" aria-hidden>
      {job.title[0]}
    </span>
  );
  const title = (
    <span className="flex items-center gap-2 text-body-lg font-semibold">
      <span className="truncate">{job.title}</span>
      {isPromoted(job) && <span className="rounded-md bg-secondary px-2 py-0.5 text-label-sm text-on-secondary">TOP</span>}
    </span>
  );
  const details = (
    <span className="flex min-w-0 items-center gap-1.5 text-body-sm text-on-surface-variant">
      {job.employer.is_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-tertiary-container" aria-label={t("Тасдиқшуда")} />}
      {isImported(job) && <Globe className="h-4 w-4 shrink-0" aria-label={t("Аз сайти «{0}»", SOURCE_NAME)} />}
      <span className="truncate">{meta.join(" · ")}</span>
    </span>
  );

  if (!onApply) {
    return (
      <Link to={`/jobs/${job.id}`} className="grid grid-cols-[44px_1fr_auto] items-center gap-4 rounded-2xl px-3 py-4 transition-colors hover:bg-surface-container-low">
        {avatar}
        <span className="flex min-w-0 flex-col gap-1">
          {title}
          {details}
        </span>
        <span className="text-right text-body-lg font-bold text-primary">{salary(job)}</span>
      </Link>
    );
  }
  return (
    <div className="grid grid-cols-[44px_1fr] items-center gap-x-4 gap-y-3 rounded-2xl px-3 py-4 transition-colors hover:bg-surface-container-low md:grid-cols-[44px_1fr_auto_auto]">
      {avatar}
      <span className="flex min-w-0 flex-col gap-1">
        <Link to={`/jobs/${job.id}`} className="hover:text-primary">{title}</Link>
        {details}
      </span>
      <span className="col-start-2 text-body-lg font-bold text-primary md:col-start-auto md:text-right">{salary(job)}</span>
      <ApplyButton job={job} onApply={onApply} className="col-span-2 min-h-[48px] shadow-sm md:col-span-1" />
    </div>
  );
}
