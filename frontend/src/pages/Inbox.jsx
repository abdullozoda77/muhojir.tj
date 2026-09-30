import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Eye, Inbox as InboxIcon, Mail, Phone, XCircle } from "lucide-react";
import { api } from "../api.js";
import { useApi } from "../hooks.js";
import { t } from "../i18n.js";
import { date } from "../format.js";
import { APPLICATION_STATUS } from "../constants.js";
import { ResumeCard } from "./Resume.jsx";
import { Button, EmptyState, ErrorBox, PageHeader, Skeleton } from "../components/ui.jsx";

// How to reach the worker: phone when they gave one, email always.
function Contacts({ app }) {
  return (
    <div className="flex flex-wrap gap-2">
      {app.applicant_phone && (
        <a href={`tel:${app.applicant_phone}`} className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-primary px-4 text-label-md text-on-primary">
          <Phone className="h-4 w-4" aria-hidden />
          {app.applicant_phone}
        </a>
      )}
      <a href={`mailto:${app.applicant_email}`} className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-surface-container-low px-4 text-label-md text-primary hover:bg-surface-container">
        <Mail className="h-4 w-4" aria-hidden />
        {app.applicant_email}
      </a>
    </div>
  );
}

function Application({ app, onChange }) {
  const [busy, setBusy] = useState(null);
  const status = APPLICATION_STATUS[app.status];
  const setStatus = async (value) => {
    setBusy(value);
    await api(`/jobs/applications/${app.id}/`, { method: "PATCH", body: { status: value } }).catch(() => {});
    setBusy(null);
    onChange();
  };

  const body = (
    <>
      {app.message && <p className="rounded-lg bg-surface-container-low p-3 text-body-md"><strong>{t("Паём")}:</strong> {app.message}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`rounded-full px-3 py-1.5 text-label-md ${status.box}`}>{status.label}</span>
        <span className="text-body-sm text-on-surface-variant">{date(app.created_at)}</span>
      </div>
      <Contacts app={app} />
      <div className="flex flex-wrap gap-2">
        {app.status === "sent" && <Button variant="plain" icon={Eye} loading={busy === "viewed"} onClick={() => setStatus("viewed")}>{t("Дидам")}</Button>}
        {app.status !== "invited" && <Button variant="soft" icon={CheckCircle2} loading={busy === "invited"} onClick={() => setStatus("invited")}>{t("Даъват кардан")}</Button>}
        {app.status !== "rejected" && <Button variant="ghost" icon={XCircle} loading={busy === "rejected"} onClick={() => setStatus("rejected")}>{t("Рад кардан")}</Button>}
      </div>
    </>
  );

  return app.resume ? (
    <ResumeCard resume={app.resume}>{body}</ResumeCard>
  ) : (
    <article className="card flex flex-col gap-3 p-4 md:p-6">
      <div>
        <h3 className="text-headline-sm">{app.applicant_name || app.applicant_email}</h3>
        <p className="text-body-sm text-on-surface-variant">{t("Коргар резюме надорад")}</p>
      </div>
      {body}
    </article>
  );
}

export default function Inbox() {
  const [params, setParams] = useSearchParams();
  const job = params.get("job");
  const status = params.get("status") || "";
  const q = new URLSearchParams({ page_size: 100, ...(job ? { job } : {}), ...(status ? { status } : {}) });
  const { data, loading, error, reload } = useApi(`/jobs/applications/?${q}`);
  const list = data?.results || [];
  const groups = [...new Set(list.map((a) => a.job_title))].map((title) => [title, list.filter((a) => a.job_title === title)]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t("Корфармо")} title={t("Аризаҳо")} text={t("Коргароне, ки ба эълонҳои шумо ариза додаанд.")} />
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {[["", t("Ҳама")], ...Object.entries(APPLICATION_STATUS).map(([k, v]) => [k, v.label])].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setParams(key ? { ...(job ? { job } : {}), status: key } : job ? { job } : {})} aria-pressed={status === key} className={`min-h-[44px] shrink-0 rounded-lg px-4 text-label-md ${status === key ? "bg-primary text-on-primary" : "bg-surface-container-lowest text-on-surface-variant shadow-sm"}`}>
            {label}
          </button>
        ))}
        {job && <button type="button" onClick={() => setParams(status ? { status } : {})} className="min-h-[44px] shrink-0 rounded-lg bg-secondary-fixed px-4 text-label-md text-on-secondary-fixed">{t("Ҳамаи эълонҳо")} ✕</button>}
      </div>
      <ErrorBox error={error} />
      {loading ? (
        <Skeleton className="h-64" />
      ) : list.length === 0 ? (
        <EmptyState icon={InboxIcon} title={t("Ҳоло ариза нест")} />
      ) : (
        groups.map(([title, apps]) => (
          <section key={title} className="flex flex-col gap-4">
            <h2 className="text-headline-sm">{title} <span className="text-on-surface-variant">({apps.length})</span></h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {apps.map((a) => (
                <Application key={a.id} app={a} onChange={reload} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
