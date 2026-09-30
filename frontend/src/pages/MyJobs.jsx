import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, ClipboardList, Eye, Pencil, PlusCircle } from "lucide-react";
import { api } from "../api.js";
import { useMyCompany } from "../employer.js";
import { useApi } from "../hooks.js";
import { t } from "../i18n.js";
import { date, salary } from "../format.js";
import JobForm from "../components/JobForm.jsx";
import { Button, EmptyState, ErrorBox, PageHeader, Skeleton } from "../components/ui.jsx";

const isOpen = (job) => job.is_active && new Date(job.expires_at) > new Date();

export default function MyJobs() {
  const { company, loading: loadingCompany } = useMyCompany();
  const { data, loading, error, reload } = useApi(company ? `/jobs/jobs/?employer=${company.id}&page_size=100` : null);
  const [tab, setTab] = useState("open");
  const [editing, setEditing] = useState(null);

  if (loadingCompany) return <Skeleton className="h-64" />;
  if (!company) {
    return (
      <EmptyState icon={Building2} title={t("Аввал профили ширкатро созед")} text={t("Баъд аз он эълони кор гузошта метавонед.")}>
        <Link to="/company" className="inline-flex min-h-[48px] items-center rounded-xl bg-primary px-6 text-label-lg text-on-primary">{t("Ширкат сохтан")}</Link>
      </EmptyState>
    );
  }

  const jobs = data?.results || [];
  const shown = jobs.filter((j) => (tab === "open" ? isOpen(j) : !isOpen(j)));

  const toggle = async (job) => {
    await api(`/jobs/jobs/${job.id}/`, { method: "PATCH", body: { is_active: !job.is_active } }).catch(() => {});
    reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={company.name} title={t("Эълонҳои ман")}>
        <Button variant="accent" icon={PlusCircle} onClick={() => setEditing({})} disabled={company.is_blacklisted}>{t("Эълони нав")}</Button>
      </PageHeader>
      <div className="flex gap-1 self-start rounded-xl bg-surface-container-lowest p-1 shadow-sm" role="tablist">
        {[
          ["open", t("Фаъол"), jobs.filter(isOpen).length],
          ["closed", t("Пӯшида"), jobs.filter((j) => !isOpen(j)).length],
        ].map(([key, label, n]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`min-h-[44px] rounded-lg px-4 text-label-md ${tab === key ? "bg-primary text-on-primary" : "text-on-surface-variant"}`}>
            {label} ({n})
          </button>
        ))}
      </div>
      <ErrorBox error={error} />
      {loading ? (
        <Skeleton className="h-40" />
      ) : shown.length === 0 ? (
        <EmptyState icon={ClipboardList} title={tab === "open" ? t("Эълони фаъол нест") : t("Эълони пӯшида нест")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {shown.map((job) => (
            <article key={job.id} className="card flex flex-col gap-3 p-4 md:p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-headline-sm">{job.title}</h3>
                  <p className="text-body-sm text-on-surface-variant">{job.city} • {t("то {0}", date(job.expires_at))}</p>
                </div>
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-label-md">
                  <input type="checkbox" className="h-5 w-5 rounded text-primary focus:ring-primary" checked={job.is_active} onChange={() => toggle(job)} />
                  {t("Фаъол")}
                </label>
              </div>
              <p className="text-label-lg text-primary">{salary(job)}</p>
              {job.is_active && !isOpen(job) && <p className="text-body-sm text-warning">{t("Мӯҳлати эълон гузашт — санаро нав кунед.")}</p>}
              <div className="flex flex-wrap gap-2">
                <Button variant="soft" icon={Pencil} onClick={() => setEditing(job)}>{t("Таҳрир")}</Button>
                <Link to={`/inbox?job=${job.id}`} className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-surface-container-low px-4 text-label-md hover:bg-surface-container">
                  <Eye className="h-4 w-4" aria-hidden />
                  {t("Аризаҳо")}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
      <JobForm
        job={editing}
        defaultCity={company.city}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />
    </div>
  );
}
