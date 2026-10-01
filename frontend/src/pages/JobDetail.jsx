import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Building2, CalendarClock, ChevronRight, MapPin, ShieldAlert } from "lucide-react";
import { useAuth } from "../auth.jsx";
import { useApi } from "../hooks.js";
import { t } from "../i18n.js";
import { ago, date, salary } from "../format.js";
import { industry } from "../constants.js";
import ApplyDrawer from "../components/ApplyDrawer.jsx";
import { ApplyButton, Perks, SOURCE_NAME, SourceBadge, VerifiedBadge, isImported, isPromoted } from "../components/JobCard.jsx";
import { Stars, average } from "../components/Stars.jsx";
import { EmptyState, ErrorBox, Skeleton } from "../components/ui.jsx";

export default function JobDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: job, error, loading } = useApi(`/jobs/jobs/${id}/`);
  const reviews = useApi(job ? `/jobs/reviews/?employer=${job.employer.id}&page_size=100` : null);
  const [applying, setApplying] = useState(null);

  if (loading) return <Skeleton className="h-96" />;
  if (error) return error.status === 404 ? <EmptyState title={t("Ин ҷойи кор ёфт нашуд ё пӯшида шудааст")} /> : <ErrorBox error={error} />;

  const rating = average(reviews.data?.results);
  const Industry = industry(job.industry).icon;
  const own = user && user.role === "employer";
  const closed = !job.is_active || new Date(job.expires_at) <= new Date();

  return (
    <div className="flex flex-col gap-6 pb-20 lg:pb-0">
      <Link to="/jobs" className="inline-flex min-h-[44px] items-center gap-2 self-start text-label-md text-on-surface-variant hover:text-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("Ҳамаи ҷойҳои корӣ")}
      </Link>

      {job.employer.is_blacklisted && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl bg-error-container p-4 text-on-error-container">
          <ShieldAlert className="h-6 w-6 shrink-0 text-error" aria-hidden />
          <p className="font-bold">{t("Ин корфармо дар рӯйхати сиёҳ аст. Эҳтиёт шавед!")}</p>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <article className="card flex flex-col gap-5 p-4 md:p-8 lg:col-span-8">
          <div className="flex flex-wrap items-center gap-2">
            {isPromoted(job) && <span className="rounded-full bg-secondary px-2.5 py-1 text-label-sm text-on-secondary">TOP</span>}
            {job.employer.is_verified && <VerifiedBadge />}
            {isImported(job) && <SourceBadge />}
            <span className="text-body-sm text-on-surface-variant">{ago(job.created_at)}</span>
          </div>
          <div>
            <h1 className="text-headline-lg">{job.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-md text-on-surface-variant">
              <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden />{[job.city, job.address].filter(Boolean).join(", ")}</span>
              <span className="inline-flex items-center gap-1"><Industry className="h-4 w-4" aria-hidden />{industry(job.industry).label}</span>
            </div>
          </div>
          <p className="text-headline-md font-bold text-primary">{salary(job)}</p>
          <Perks job={job} />
          <div className="border-t border-surface-container pt-5">
            <h2 className="mb-2 text-headline-sm">{t("Тавсифи кор")}</h2>
            <p className="whitespace-pre-line text-body-lg">{job.description}</p>
          </div>
          <p className="flex items-center gap-2 text-body-sm text-on-surface-variant">
            <CalendarClock className="h-4 w-4" aria-hidden />
            {t("Эълон то {0} фаъол аст", date(job.expires_at))}
          </p>
        </article>

        <aside className="flex flex-col gap-4 lg:col-span-4">
          <Link to={`/employers/${job.employer.id}`} className="card flex flex-col gap-3 p-4 transition-shadow hover:shadow-md md:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-fixed text-primary">
                <Building2 className="h-6 w-6" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="truncate text-label-lg">{job.employer.name}</p>
                <p className="text-body-sm text-on-surface-variant">{job.employer.city}</p>
              </div>
              <ChevronRight className="ml-auto h-5 w-5 text-outline" aria-hidden />
            </div>
            <div className="flex items-center gap-2">
              <Stars value={rating ?? 0} />
              <span className="text-label-md">{rating ? rating.toFixed(1) : "—"}</span>
              <span className="text-body-sm text-on-surface-variant">({t("{0} шарҳ", reviews.data?.count ?? 0)})</span>
            </div>
          </Link>
          {!own && !closed && (
            <ApplyButton job={job} onApply={setApplying} className="fixed bottom-[76px] left-4 right-4 z-40 min-h-[52px] shadow-lg lg:static lg:shadow-sm" />
          )}
          {isImported(job) && (
            <p className="card p-4 text-body-sm text-on-surface-variant">
              {t("Ин эълон аз сайти давлатии «{0}» гирифта шудааст. Ариза ва тамос бо корфармо — дар он сайт. Пеш аз сафар шартҳоро бо корфармо санҷед.", SOURCE_NAME)}
            </p>
          )}
          {closed && <p className="card p-4 text-body-md text-on-surface-variant">{t("Ин эълон пӯшида аст.")}</p>}
        </aside>
      </div>
      <ApplyDrawer job={applying} onClose={() => setApplying(null)} />
    </div>
  );
}
