import { Link } from "react-router-dom";
import { BadgeCheck, BedDouble, Clock3, ExternalLink, FileCheck2, Globe, MapPin, Soup } from "lucide-react";
import { t } from "../i18n.js";
import { salary } from "../format.js";
import { Chip } from "./ui.jsx";

// Every job comes from «Работа России» (trudvsem.ru); people apply there, on the ad's official page.
export const SOURCE_NAME = "Работа России";

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

export function SourceBadge({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-1 text-label-sm text-on-surface-variant ${className}`}>
      <Globe className="h-3.5 w-3.5" aria-hidden />
      {t("Аз сайти «{0}»", SOURCE_NAME)}
    </span>
  );
}

// The link to the ad on the official site, where people read the contacts and apply.
export function OfficialLink({ job, className = "" }) {
  if (!job.external_url) return null;
  return (
    <a href={job.external_url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 text-label-lg text-on-primary hover:brightness-110 ${className}`}>
      <ExternalLink className="h-4 w-4" aria-hidden />
      {t("Эълони расмӣ")}
    </a>
  );
}

export const placeOf = (job) => job.address || job.city;

// The short one-line job: letter, title, company, address and perks, salary on the right.
// compact (home page): the whole row is a link to the job; otherwise (jobs list) only the title is,
// and there is a button to the official ad.
export function JobRow({ job, compact = false }) {
  const perks = [
    job.housing_provided && t("манзил"),
    job.meals_provided && t("хӯрок"),
    job.helps_with_documents && t("ёрӣ бо ҳуҷҷатҳо"),
  ].filter(Boolean);

  const avatar = (
    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-fixed text-headline-sm font-bold text-primary" aria-hidden>
      {job.title[0]}
    </span>
  );
  const title = <span className="block truncate text-body-lg font-semibold">{job.title}</span>;
  const details = (
    <>
      <span className="flex min-w-0 items-center gap-1.5 text-body-sm text-on-surface-variant">
        {job.employer.is_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-tertiary-container" aria-label={t("Тасдиқшуда")} />}
        <span className="truncate">{[job.employer.name, ...perks].join(" · ")}</span>
      </span>
      {placeOf(job) && (
        <span className="flex min-w-0 items-center gap-1.5 text-body-sm text-on-surface-variant">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{placeOf(job)}</span>
        </span>
      )}
    </>
  );

  if (compact) {
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
      <OfficialLink job={job} className="col-span-2 min-h-[48px] shadow-sm md:col-span-1" />
    </div>
  );
}
