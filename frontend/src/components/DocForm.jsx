import { useEffect, useState } from "react";
import { Camera, FilePlus2, Save, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { t } from "../i18n.js";
import { Button, Drawer, ErrorBox, Field, SoonTag } from "./ui.jsx";

const EMPTY = { document_type: "", region: "", number: "", issued_at: "", expires_at: "", note: "" };

// Pure date math in UTC: local midnight in Moscow (UTC+3) would turn into the previous day in toISOString().
function addDays(isoDate, days) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Add or edit one of the user's documents. doc = null: closed, {}: new, a document: edit it.
export default function DocForm({ doc, types, regions, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const editing = Boolean(doc?.id);

  useEffect(() => {
    if (!doc) return;
    setForm(doc.id ? { ...EMPTY, ...doc, region: doc.region ?? "", issued_at: doc.issued_at ?? "" } : { ...EMPTY, ...doc });
    setErrors({});
    setError(null);
  }, [doc]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // A new registration is usually 90 days and so on: suggest the end date from the issue date when it is empty.
  const type = types.find((x) => String(x.id) === String(form.document_type));
  const suggest = type?.default_validity_days && form.issued_at && !form.expires_at ? addDays(form.issued_at, type.default_validity_days) : null;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setError(null);
    const body = {
      document_type: Number(form.document_type),
      region: form.region ? Number(form.region) : null,
      number: form.number.trim(),
      issued_at: form.issued_at || null,
      expires_at: form.expires_at,
      note: form.note.trim(),
    };
    try {
      await api(editing ? `/documents/my-documents/${doc.id}/` : "/documents/my-documents/", { method: editing ? "PATCH" : "POST", body });
      onSaved();
    } catch (err) {
      if (err.status === 400 && err.data && !err.data.detail) setErrors(err.data);
      else setError(err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(t("Ин ҳуҷҷатро нест кунем?"))) return;
    setBusy(true);
    try {
      await api(`/documents/my-documents/${doc.id}/`, { method: "DELETE" });
      onSaved();
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={Boolean(doc)}
      onClose={onClose}
      icon={FilePlus2}
      title={editing ? t("Таҳрири ҳуҷҷат") : t("Ҳуҷҷати нав илова кардан")}
      subtitle={t("Маълумотро аз рӯи худи ҳуҷҷат нависед")}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label={t("Намуди ҳуҷҷат")} required error={errors.document_type}>
          <select className="input" required value={form.document_type} onChange={set("document_type")}>
            <option value="">{t("— интихоб кунед —")}</option>
            {types.map((x) => (
              <option key={x.id} value={x.id}>{x.title}</option>
            ))}
          </select>
        </Field>
        <Field label={t("Минтақа (дар куҷо дода шудааст)")} error={errors.region}>
          <select className="input" value={form.region} onChange={set("region")}>
            <option value="">{t("— нишон надодан —")}</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </Field>
        <Field label={t("Серия ва рақами ҳуҷҷат")} error={errors.number}>
          <input className="input font-mono" value={form.number} onChange={set("number")} placeholder={t("Масалан: 77 № 1234567")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Санаи додан")} error={errors.issued_at}>
            <input className="input" type="date" value={form.issued_at} onChange={set("issued_at")} />
          </Field>
          <Field label={t("Санаи анҷом")} required error={errors.expires_at}>
            <input className="input" type="date" required value={form.expires_at} onChange={set("expires_at")} />
          </Field>
        </div>
        {suggest && (
          <button type="button" onClick={() => setForm((f) => ({ ...f, expires_at: suggest }))} className="self-start rounded-lg bg-primary-fixed px-3 py-2 text-label-md text-on-primary-fixed">
            {t("Одатан {0} рӯз: санаи анҷомро {1} гузорем?", type.default_validity_days, suggest.split("-").reverse().join("."))}
          </button>
        )}

        <div>
          <span className="label flex items-center gap-2">{t("Кай ёдрас кунем?")} <SoonTag /></span>
          <div className="grid grid-cols-3 gap-2 opacity-60">
            {[t("30 рӯз пеш"), t("7 рӯз пеш"), t("1 рӯз пеш")].map((x) => (
              <span key={x} className="flex min-h-[48px] items-center justify-center rounded-lg bg-surface-container-low text-center text-label-md">{x}</span>
            ))}
          </div>
        </div>
        <div>
          <span className="label flex items-center gap-2">{t("Сурати ҳуҷҷат (нусхаи эҳтиётӣ)")} <SoonTag /></span>
          <div className="flex min-h-[96px] cursor-not-allowed flex-col items-center justify-center rounded-xl bg-surface-container-low p-4 text-center opacity-60">
            <Camera className="mb-1 h-7 w-7 text-primary" aria-hidden />
            <span className="text-label-md">{t("Сурати ҳуҷҷатро интихоб кунед")}</span>
          </div>
        </div>

        <Field label={t("Ёддошти шахсӣ")} error={errors.note}>
          <textarea className="input h-auto py-3" rows={3} maxLength={255} value={form.note} onChange={set("note")} placeholder={t("Масалан: чек дар папкаи кабуд")} />
        </Field>
        <ErrorBox error={error} />

        <div className="sticky bottom-0 flex gap-2 bg-surface-container-lowest pt-2">
          {editing ? (
            <Button variant="danger" icon={Trash2} onClick={remove} disabled={busy} aria-label={t("Нест кардан")} className="px-4" />
          ) : (
            <Button variant="plain" onClick={onClose} className="w-1/3">{t("Бекор кардан")}</Button>
          )}
          <Button type="submit" icon={Save} loading={busy} className="flex-1">{t("Сабт кардан")}</Button>
        </div>
      </form>
    </Drawer>
  );
}
