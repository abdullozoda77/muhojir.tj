import { useSearchParams } from "react-router-dom";
import { Phone, Users } from "lucide-react";
import { useApi } from "../hooks.js";
import { t } from "../i18n.js";
import { INDUSTRIES } from "../constants.js";
import { ResumeCard } from "./Resume.jsx";
import { EmptyState, ErrorBox, PageHeader, Skeleton } from "../components/ui.jsx";

export default function Resumes() {
  const [params, setParams] = useSearchParams();
  const { data, loading, error } = useApi(`/jobs/resumes/?page_size=100&${params}`);
  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t("Корфармо")} title={t("Резюмеҳо")} text={t("Коргароне, ки ҳоло кор меҷӯянд.")} />
      <div className="card grid gap-3 p-4 sm:grid-cols-3">
        <input className="input" value={params.get("city") || ""} onChange={(e) => set("city", e.target.value)} placeholder={t("Шаҳр")} aria-label={t("Шаҳр")} />
        <select className="input" value={params.get("industry") || ""} onChange={(e) => set("industry", e.target.value)} aria-label={t("Соҳа")}>
          <option value="">{t("Ҳама соҳаҳо")}</option>
          {INDUSTRIES.map((i) => (
            <option key={i.value} value={i.value}>{i.label}</option>
          ))}
        </select>
        <label className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-lg bg-surface-container-low px-4">
          <input type="checkbox" className="h-5 w-5 rounded text-primary focus:ring-primary" checked={params.get("has_patent") === "true"} onChange={(e) => set("has_patent", e.target.checked ? "true" : "")} />
          <span className="text-label-lg">{t("Танҳо бо патент")}</span>
        </label>
      </div>
      <ErrorBox error={error} />
      {loading ? (
        <Skeleton className="h-64" />
      ) : data?.results?.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.results.map((r) => (
            <ResumeCard key={r.id} resume={r}>
              {r.phone && (
                <a href={`tel:${r.phone}`} className="inline-flex min-h-[48px] items-center gap-2 self-start rounded-xl bg-primary px-4 text-label-md text-on-primary">
                  <Phone className="h-4 w-4" aria-hidden />
                  {t("Занг задан")}: {r.phone}
                </a>
              )}
            </ResumeCard>
          ))}
        </div>
      ) : (
        <EmptyState icon={Users} title={t("Резюме ёфт нашуд")} text={t("Филтрҳоро кам кунед.")} />
      )}
    </div>
  );
}
