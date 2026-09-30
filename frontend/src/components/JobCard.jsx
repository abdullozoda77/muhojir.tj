import { Link } from "react-router-dom";
import { BadgeCheck, ChevronRight, Clock3, FileCheck2, Flame, MapPin, Send, Soup, BedDouble } from "lucide-react";
import { t } from "../i18n.js";
import { ago, salary } from "../format.js";
import { industry } from "../constants.js";
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

// compact: the short card for the home page grid; otherwise the full card of the jobs list.
export default function JobCard({ job, onApply, compact }) {
  const Industry = industry(job.industry).icon;
  return (
    <article className="card flex flex-col justify-between gap-4 p-4 transition-shadow hover:shadow-md md:p-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {isPromoted(job) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-label-sm text-on-secondary">
                <Flame className="h-3.5 w-3.5" aria-hidden />
                TOP
              </span>
            )}
            {job.employer.is_verified && <VerifiedBadge />}
          </div>
          <span className="text-body-sm text-on-surface-variant">{ago(job.created_at)}</span>
        </div>

        <div className={compact ? "" : "flex flex-col justify-between gap-2 md:flex-row md:items-start"}>
          <div className="min-w-0">
            <Link to={`/jobs/${job.id}`} className="text-headline-sm hover:text-primary">
              {job.title}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-on-surface-variant">
              <Link to={`/employers/${job.employer.id}`} className="text-label-md text-primary hover:underline">
                {job.employer.name}
              </Link>
              <span aria-hidden>•</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {job.city}
              </span>
              <span aria-hidden>•</span>
              <span className="inline-flex items-center gap-1">
                <Industry className="h-3.5 w-3.5" aria-hidden />
                {industry(job.industry).label}
              </span>
            </div>
          </div>
          <p className={`shrink-0 font-bold text-primary ${compact ? "mt-3 text-headline-sm" : "text-headline-sm md:text-right md:text-headline-md"}`}>{salary(job)}</p>
        </div>
        <Perks job={job} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {onApply ? (
          <button type="button" onClick={() => onApply(job)} className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-label-lg text-on-primary shadow-sm hover:bg-primary-container sm:w-auto">
            <Send className="h-5 w-5" aria-hidden />
            {t("Ариза додан")}
          </button>
        ) : (
          <Link to={`/jobs/${job.id}`} className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-surface-container px-6 text-label-md hover:bg-primary hover:text-on-primary sm:w-auto">
            {t("Муфассал")}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
    </article>
  );
}
