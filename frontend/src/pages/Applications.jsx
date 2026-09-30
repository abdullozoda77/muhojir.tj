import { useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Send, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { useApi } from "../hooks.js";
import { t } from "../i18n.js";
import { date } from "../format.js";
import { APPLICATION_STATUS } from "../constants.js";
import { Button, EmptyState, ErrorBox, PageHeader, Skeleton } from "../components/ui.jsx";

const STEPS = ["sent", "viewed", "invited"];

function Progress({ status }) {
  const rejected = status === "rejected";
  const reached = rejected ? 2 : STEPS.indexOf(status) + 1;
  const labels = [APPLICATION_STATUS.sent.label, APPLICATION_STATUS.viewed.label, rejected ? APPLICATION_STATUS.rejected.label : APPLICATION_STATUS.invited.label];
  return (
    <ol className="grid grid-cols-3 gap-1.5" aria-label={t("Ҳолати ариза")}>
      {labels.map((label, i) => {
        const done = i < reached || (rejected && i === 2);
        const tone = rejected && i === 2 ? "bg-error" : done ? "bg-primary" : "bg-surface-container-high";
        return (
          <li key={label} className="flex flex-col gap-1">
            <span className={`h-2 rounded-full ${tone}`} />
            <span className={`text-label-sm ${done ? (rejected && i === 2 ? "text-error" : "text-primary") : "text-on-surface-variant"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Application({ app, onChange }) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState(app.message);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const status = APPLICATION_STATUS[app.status];

  const save = async () => {
    setBusy(true);
    try {
      await api(`/jobs/applications/${app.id}/`, { method: "PATCH", body: { message } });
      setEditing(false);
      onChange();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    if (!window.confirm(t("Аризаро бозпас гирем?"))) return;
    setBusy(true);
    try {
      await api(`/jobs/applications/${app.id}/`, { method: "DELETE" });
      onChange();
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <article className="card flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link to={`/jobs/${app.job}`} className="text-headline-sm hover:text-primary">{app.job_title}</Link>
          <p className="text-body-sm text-on-surface-variant">{app.employer_name} • {date(app.created_at)}</p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-label-md ${status.box}`}>{status.label}</span>
      </div>
      <Progress status={app.status} />
      {app.status === "invited" && <p className="rounded-xl bg-tertiary-fixed p-3 text-body-md text-on-tertiary-fixed">{t("Корфармо шуморо даъват кард! Ӯ бо шумо тамос мегирад.")}</p>}
      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea className="input h-auto py-3" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="plain" onClick={() => setEditing(false)}>{t("Бекор кардан")}</Button>
            <Button loading={busy} onClick={save}>{t("Сабт кардан")}</Button>
          </div>
        </div>
      ) : (
        app.message && <p className="rounded-lg bg-surface-container-low p-3 text-body-md">{app.message}</p>
      )}
      <ErrorBox error={error} />
      {!editing && (
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" icon={Pencil} onClick={() => setEditing(true)}>{t("Паёмро иваз кардан")}</Button>
          <Button variant="ghost" icon={Trash2} onClick={withdraw} disabled={busy}>{t("Бозпас гирифтан")}</Button>
        </div>
      )}
    </article>
  );
}

export default function Applications() {
  const { data, loading, error, reload } = useApi("/jobs/applications/?page_size=100");
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader eyebrow={t("Ҷойи кор")} title={t("Аризаҳои ман")} text={t("Дар ин ҷо ҷавоби корфармоёнро мебинед.")} />
      <ErrorBox error={error} />
      {loading ? (
        <Skeleton className="h-48" />
      ) : data?.results?.length ? (
        data.results.map((app) => <Application key={app.id} app={app} onChange={reload} />)
      ) : (
        <EmptyState icon={Send} title={t("Шумо ҳоло ариза надодаед")} text={t("Кори мувофиқро ёбед ва бо як тугма ариза диҳед.")}>
          <Link to="/jobs" className="inline-flex min-h-[48px] items-center rounded-xl bg-primary px-6 text-label-lg text-on-primary">{t("Кор ҷустан")}</Link>
        </EmptyState>
      )}
    </div>
  );
}
