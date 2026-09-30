import { useEffect, useState } from "react";
import { BadgeCheck, Building2, Save, ShieldAlert, Hourglass } from "lucide-react";
import { api } from "../api.js";
import { useMyCompany } from "../employer.js";
import { t } from "../i18n.js";
import { Button, ErrorBox, Field, PageHeader, Skeleton } from "../components/ui.jsx";

const EMPTY = { name: "", inn: "", city: "", phone: "", description: "" };

export default function Company() {
  const { company, loading, error: loadError, reload } = useMyCompany();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (company) setForm({ ...EMPTY, ...company });
  }, [company]);

  const set = (key) => (e) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setError(null);
    const body = { name: form.name.trim(), inn: form.inn.trim(), city: form.city.trim(), phone: form.phone.trim(), description: form.description.trim() };
    try {
      await api(company ? `/jobs/employers/${company.id}/` : "/jobs/employers/", { method: company ? "PATCH" : "POST", body });
      setSaved(true);
      reload();
    } catch (err) {
      if (err.status === 400 && err.data && !err.data.detail) setErrors(err.data);
      else setError(err);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Skeleton className="h-96" />;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader eyebrow={t("Корфармо")} title={t("Ширкати ман")} text={t("Маълумоти дурустро нависед. Админ ширкатро аз рӯи ИНН месанҷад ва нишони «Тасдиқшуда» медиҳад.")} />
      {company &&
        (company.is_blacklisted ? (
          <div className="flex items-start gap-3 rounded-2xl bg-error-container p-4 text-on-error-container">
            <ShieldAlert className="h-6 w-6 shrink-0 text-error" aria-hidden />
            <div>
              <p className="font-bold">{t("Ширкати шумо дар рӯйхати сиёҳ аст")}</p>
              <p className="text-body-sm">{company.blacklist_reason}</p>
            </div>
          </div>
        ) : company.is_verified ? (
          <div className="flex items-center gap-3 rounded-2xl bg-tertiary-fixed p-4 text-on-tertiary-fixed">
            <BadgeCheck className="h-6 w-6" aria-hidden />
            <p className="text-label-lg">{t("Ширкат тасдиқ шудааст")}</p>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl bg-warning-fixed p-4 text-on-warning-fixed">
            <Hourglass className="h-6 w-6" aria-hidden />
            <p className="text-label-lg">{t("Дар санҷиши админ. Эълонҳо ҳоло ҳам намоёнанд, аммо бе нишони «Тасдиқшуда».")}</p>
          </div>
        ))}
      <ErrorBox error={loadError} />
      <form onSubmit={submit} className="card flex flex-col gap-4 p-4 md:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-fixed text-primary">
            <Building2 className="h-6 w-6" aria-hidden />
          </div>
          <h2 className="text-headline-sm">{company ? t("Маълумоти ширкат") : t("Ширкати нав")}</h2>
        </div>
        <Field label={t("Номи ширкат")} required error={errors.name}>
          <input className="input" required value={form.name} onChange={set("name")} placeholder={t("Масалан: ООО «СтройМир»")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ИНН" error={errors.inn} hint={t("10 ё 12 рақам")}>
            <input className="input font-mono" inputMode="numeric" maxLength={12} value={form.inn} onChange={set("inn")} />
          </Field>
          <Field label={t("Шаҳр")} required error={errors.city}>
            <input className="input" required value={form.city} onChange={set("city")} placeholder={t("Масалан: Москва")} />
          </Field>
        </div>
        <Field label={t("Телефон")} required error={errors.phone}>
          <input className="input" type="tel" required maxLength={16} value={form.phone} onChange={set("phone")} placeholder="+79991234567" />
        </Field>
        <Field label={t("Дар бораи ширкат")} error={errors.description}>
          <textarea className="input h-auto py-3" rows={4} value={form.description} onChange={set("description")} />
        </Field>
        <ErrorBox error={error} />
        {saved && <p role="status" className="rounded-xl bg-tertiary-fixed p-3 text-label-md text-on-tertiary-fixed">{t("Сабт шуд")}</p>}
        <Button type="submit" icon={Save} loading={busy}>{company ? t("Сабт кардан") : t("Ширкат сохтан")}</Button>
      </form>
    </div>
  );
}
