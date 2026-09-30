import { useEffect, useState } from "react";
import { BedDouble, BriefcaseBusiness, FileCheck2, Save, Soup, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { t } from "../i18n.js";
import { INDUSTRIES, PERIODS } from "../constants.js";
import { Button, Drawer, ErrorBox, Field } from "./ui.jsx";

const EMPTY = {
  title: "", description: "", industry: "", city: "", address: "", salary_from: "", salary_to: "", salary_period: "month",
  schedule: "", housing_provided: false, meals_provided: false, helps_with_documents: false, is_active: true, expires_at: "",
};

// Create or edit a job ad. job = null: closed, {}: new, a job: edit it.
export default function JobForm({ job, defaultCity, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const editing = Boolean(job?.id);

  useEffect(() => {
    if (!job) return;
    setForm(job.id ? { ...EMPTY, ...job, salary_from: job.salary_from ?? "", salary_to: job.salary_to ?? "", expires_at: job.expires_at?.slice(0, 10) || "" } : { ...EMPTY, city: defaultCity || "" });
    setErrors({});
    setError(null);
  }, [job, defaultCity]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setError(null);
    const body = {
      ...form,
      salary_from: form.salary_from === "" ? null : Number(form.salary_from),
      salary_to: form.salary_to === "" ? null : Number(form.salary_to),
    };
    delete body.employer;
    // An empty end date on a new ad lets the server use its default (30 days).
    if (form.expires_at) body.expires_at = `${form.expires_at}T23:59:00`;
    else delete body.expires_at;
    try {
      await api(editing ? `/jobs/jobs/${job.id}/` : "/jobs/jobs/", { method: editing ? "PATCH" : "POST", body });
      onSaved();
    } catch (err) {
      if (err.status === 400 && err.data && !err.data.detail) setErrors(err.data);
      else setError(err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(t("Ин эълонро нест кунем?"))) return;
    setBusy(true);
    try {
      await api(`/jobs/jobs/${job.id}/`, { method: "DELETE" });
      onSaved();
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <Drawer open={Boolean(job)} onClose={onClose} icon={BriefcaseBusiness} title={editing ? t("Таҳрири эълон") : t("Эълони нави кор")}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label={t("Номи вазифа")} required error={errors.title}>
          <input className="input" required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder={t("Масалан: Кафшергар")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Соҳа")} required error={errors.industry}>
            <select className="input" required value={form.industry} onChange={(e) => set("industry", e.target.value)}>
              <option value="">{t("— интихоб кунед —")}</option>
              {INDUSTRIES.map((i) => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </Field>
          <Field label={t("Шаҳр")} required error={errors.city}>
            <input className="input" required value={form.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
        </div>
        <Field label={t("Суроға")} error={errors.address}>
          <input className="input" value={form.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label={t("Маош аз (₽)")} error={errors.salary_from}>
            <input className="input" type="number" inputMode="numeric" min={0} value={form.salary_from} onChange={(e) => set("salary_from", e.target.value)} />
          </Field>
          <Field label={t("Маош то (₽)")} error={errors.salary_to}>
            <input className="input" type="number" inputMode="numeric" min={0} value={form.salary_to} onChange={(e) => set("salary_to", e.target.value)} />
          </Field>
          <Field label={t("Давра")} error={errors.salary_period}>
            <select className="input" value={form.salary_period} onChange={(e) => set("salary_period", e.target.value)}>
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={t("Ҷадвали кор")} error={errors.schedule}>
          <input className="input" value={form.schedule} onChange={(e) => set("schedule", e.target.value)} placeholder={t("Масалан: 6/1, 10 соат")} />
        </Field>
        <Field label={t("Тавсифи кор")} required error={errors.description}>
          <textarea className="input h-auto py-3" rows={5} required value={form.description} onChange={(e) => set("description", e.target.value)} placeholder={t("Чӣ кор бояд кард, талабот, шароит")} />
        </Field>
        <div className="grid gap-2">
          {[
            ["housing_provided", BedDouble, t("Манзил медиҳем")],
            ["meals_provided", Soup, t("Хӯрок медиҳем")],
            ["helps_with_documents", FileCheck2, t("Дар гирифтани патент ва қайд ёрӣ медиҳем")],
          ].map(([key, Icon, label]) => (
            <label key={key} className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl bg-surface-container-low px-4">
              <input type="checkbox" className="h-5 w-5 rounded text-primary focus:ring-primary" checked={form[key]} onChange={(e) => set(key, e.target.checked)} />
              <Icon className="h-5 w-5 text-primary" aria-hidden />
              <span className="text-label-lg">{label}</span>
            </label>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Эълон фаъол то")} error={errors.expires_at} hint={editing ? null : t("Холӣ монед — 30 рӯз")}>
            <input className="input" type="date" value={form.expires_at} onChange={(e) => set("expires_at", e.target.value)} />
          </Field>
          <label className="flex min-h-[52px] cursor-pointer items-center gap-3 self-end rounded-xl bg-surface-container-low px-4">
            <input type="checkbox" className="h-5 w-5 rounded text-primary focus:ring-primary" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
            <span className="text-label-lg">{t("Эълон фаъол аст")}</span>
          </label>
        </div>
        <ErrorBox error={error} />
        <div className="sticky bottom-0 flex gap-2 bg-surface-container-lowest pt-2">
          {editing ? (
            <Button variant="danger" icon={Trash2} onClick={remove} disabled={busy} aria-label={t("Нест кардан")} className="px-4" />
          ) : (
            <Button variant="plain" onClick={onClose} className="w-1/3">{t("Бекор кардан")}</Button>
          )}
          <Button type="submit" icon={Save} loading={busy} className="flex-1">{editing ? t("Сабт кардан") : t("Эълон гузоштан")}</Button>
        </div>
      </form>
    </Drawer>
  );
}
