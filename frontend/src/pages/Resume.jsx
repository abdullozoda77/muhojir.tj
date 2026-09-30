import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, Eye, EyeOff, MapPin, Pencil, Save } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { useApi } from "../hooks.js";
import { t } from "../i18n.js";
import { INDUSTRIES, RUSSIAN_LEVELS, industry } from "../constants.js";
import { Button, ErrorBox, Field, PageHeader, Skeleton } from "../components/ui.jsx";

const EMPTY = { full_name: "", birth_year: "", city: "", industry: "", profession: "", experience_years: 0, russian_level: "basic", has_patent: false, about: "", is_visible: true };

export function ResumeCard({ resume, children }) {
  const level = RUSSIAN_LEVELS.find((l) => l.value === resume.russian_level)?.label;
  const Icon = industry(resume.industry).icon;
  return (
    <div className="card flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-headline-md text-on-primary">{resume.full_name?.[0] || "?"}</div>
        <div className="min-w-0 flex-1">
          <h3 className="text-headline-sm">{resume.full_name}</h3>
          <p className="text-label-lg text-primary">{resume.profession}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-on-surface-variant">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden />{resume.city}</span>
            <span className="inline-flex items-center gap-1"><Icon className="h-3.5 w-3.5" aria-hidden />{industry(resume.industry).label}</span>
            {resume.birth_year && <span>{t("{0} сол", new Date().getFullYear() - resume.birth_year)}</span>}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-surface-container-low p-2">
          <span className="block text-label-sm text-on-surface-variant">{t("Таҷриба")}</span>
          <span className="text-label-lg">{t("{0} сол", resume.experience_years)}</span>
        </div>
        <div className="rounded-lg bg-surface-container-low p-2">
          <span className="block text-label-sm text-on-surface-variant">{t("Забони русӣ")}</span>
          <span className="text-label-lg">{level}</span>
        </div>
        <div className={`rounded-lg p-2 ${resume.has_patent ? "bg-tertiary-fixed text-on-tertiary-fixed" : "bg-surface-container-low"}`}>
          <span className="block text-label-sm opacity-80">{t("Патент")}</span>
          <span className="text-label-lg">{resume.has_patent ? t("Дорад") : t("Надорад")}</span>
        </div>
      </div>
      {resume.about && <p className="whitespace-pre-line text-body-md">{resume.about}</p>}
      {children}
    </div>
  );
}

function Wizard({ initial, onSaved, onCancel }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => (initial ? { ...EMPTY, ...initial, birth_year: initial.birth_year ?? "" } : { ...EMPTY, full_name: user.full_name || "", city: user.city || "" }));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const stepsOk = [form.full_name.trim() && form.city.trim(), form.industry && form.profession.trim(), true];

  const save = async () => {
    setBusy(true);
    setErrors({});
    setError(null);
    const body = { ...form, birth_year: form.birth_year ? Number(form.birth_year) : null, experience_years: Number(form.experience_years) || 0 };
    try {
      await api(initial ? `/jobs/resumes/${initial.id}/` : "/jobs/resumes/", { method: initial ? "PATCH" : "POST", body });
      onSaved();
    } catch (err) {
      if (err.status === 400 && err.data && !err.data.detail) {
        setErrors(err.data);
        setStep(err.data.full_name || err.data.city || err.data.birth_year ? 0 : err.data.industry || err.data.profession ? 1 : 2);
      } else setError(err);
    } finally {
      setBusy(false);
    }
  };

  const titles = [t("Дар бораи шумо"), t("Кор ва таҷриба"), t("Забон ва ҳуҷҷатҳо")];

  return (
    <div className="card flex flex-col gap-6 p-4 md:p-8">
      <div>
        <div className="mb-2 flex justify-between text-label-md text-on-surface-variant">
          <span>{t("Қадами {0} аз 3", step + 1)}</span>
          <span>{titles[step]}</span>
        </div>
        <div className="flex gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-2 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-surface-container-high"}`} />
          ))}
        </div>
      </div>

      {step === 0 && (
        <div className="flex flex-col gap-4">
          <Field label={t("Ному насаб")} required error={errors.full_name}>
            <input className="input" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} autoComplete="name" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("Соли таваллуд")} error={errors.birth_year}>
              <input className="input" type="number" inputMode="numeric" min={1940} max={2012} value={form.birth_year} onChange={(e) => set("birth_year", e.target.value)} placeholder="1995" />
            </Field>
            <Field label={t("Шаҳр")} required error={errors.city}>
              <input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder={t("Масалан: Москва")} />
            </Field>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div>
            <span className="label">{t("Соҳа")} <span className="text-error">*</span></span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {INDUSTRIES.map((i) => (
                <button key={i.value} type="button" onClick={() => set("industry", i.value)} aria-pressed={form.industry === i.value} className={`flex min-h-[56px] items-center gap-2 rounded-xl px-3 text-left text-label-md ${form.industry === i.value ? "bg-primary text-on-primary" : "bg-surface-container-low hover:bg-surface-container"}`}>
                  <i.icon className="h-5 w-5 shrink-0" aria-hidden />
                  {i.label}
                </button>
              ))}
            </div>
            {errors.industry && <span className="mt-1 block text-body-sm text-error">{errors.industry}</span>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("Касб")} required error={errors.profession}>
              <input className="input" value={form.profession} onChange={(e) => set("profession", e.target.value)} placeholder={t("Масалан: кафшергар")} />
            </Field>
            <Field label={t("Таҷриба (сол)")} error={errors.experience_years}>
              <input className="input" type="number" inputMode="numeric" min={0} max={60} value={form.experience_years} onChange={(e) => set("experience_years", e.target.value)} />
            </Field>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div>
            <span className="label">{t("Забони русиро чӣ қадар медонед?")}</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RUSSIAN_LEVELS.map((l) => (
                <button key={l.value} type="button" onClick={() => set("russian_level", l.value)} aria-pressed={form.russian_level === l.value} className={`min-h-[56px] rounded-xl text-label-lg ${form.russian_level === l.value ? "bg-primary text-on-primary" : "bg-surface-container-low hover:bg-surface-container"}`}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <label className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl p-4 ${form.has_patent ? "bg-tertiary-fixed text-on-tertiary-fixed" : "bg-surface-container-low"}`}>
            <input type="checkbox" className="h-5 w-5 rounded text-primary focus:ring-primary" checked={form.has_patent} onChange={(e) => set("has_patent", e.target.checked)} />
            <BadgeCheck className="h-5 w-5" aria-hidden />
            <span className="text-label-lg">{t("Патент дорам")}</span>
          </label>
          <Field label={t("Дар бораи худ (ихтиёрӣ)")} error={errors.about}>
            <textarea className="input h-auto py-3" rows={3} value={form.about} onChange={(e) => set("about", e.target.value)} placeholder={t("Масалан: кори вазнинро метавонам, шабона ҳам кор мекунам")} />
          </Field>
          <label className="flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl bg-surface-container-low p-4">
            <input type="checkbox" className="h-5 w-5 rounded text-primary focus:ring-primary" checked={form.is_visible} onChange={(e) => set("is_visible", e.target.checked)} />
            <Eye className="h-5 w-5 text-primary" aria-hidden />
            <span className="text-label-lg">{t("Резюме ба корфармоён намоён бошад")}</span>
          </label>
        </div>
      )}

      <ErrorBox error={error} />
      <div className="flex gap-2">
        {step > 0 ? (
          <Button variant="plain" icon={ArrowLeft} onClick={() => setStep(step - 1)}>{t("Қафо")}</Button>
        ) : (
          onCancel && <Button variant="plain" onClick={onCancel}>{t("Бекор кардан")}</Button>
        )}
        {step < 2 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!stepsOk[step]} className="flex-1">
            {t("Давом")}
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Button>
        ) : (
          <Button icon={Save} loading={busy} onClick={save} className="flex-1">{t("Сабт кардан")}</Button>
        )}
      </div>
    </div>
  );
}

export default function Resume() {
  const { data, loading, error, reload } = useApi("/jobs/resumes/");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const resume = data?.results?.[0];

  useEffect(() => {
    if (data && !resume) setEditing(true);
  }, [data, resume]);

  const toggleVisible = async () => {
    setBusy(true);
    await api(`/jobs/resumes/${resume.id}/`, { method: "PATCH", body: { is_visible: !resume.is_visible } }).catch(() => {});
    setBusy(false);
    reload();
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader eyebrow={t("Ҷойи кор")} title={t("Резюмеи ман")} text={t("Резюмеи кӯтоҳ, ки дар 2 дақиқа пур мешавад. Корфармо онро ҳамроҳи аризаи шумо мебинад.")} />
      <ErrorBox error={error} />
      {loading ? (
        <Skeleton className="h-72" />
      ) : editing ? (
        <Wizard
          initial={resume}
          onCancel={resume ? () => setEditing(false) : null}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
        />
      ) : resume ? (
        <>
          <div className={`flex items-center gap-3 rounded-2xl p-4 ${resume.is_visible ? "bg-tertiary-fixed text-on-tertiary-fixed" : "bg-surface-container-high"}`}>
            {resume.is_visible ? <Eye className="h-6 w-6" aria-hidden /> : <EyeOff className="h-6 w-6" aria-hidden />}
            <p className="flex-1 text-label-lg">{resume.is_visible ? t("Корфармоён резюмеи шуморо мебинанд") : t("Резюме пинҳон аст")}</p>
            <Button variant="plain" loading={busy} onClick={toggleVisible}>{resume.is_visible ? t("Пинҳон кардан") : t("Нишон додан")}</Button>
          </div>
          <ResumeCard resume={resume}>
            <Button variant="soft" icon={Pencil} onClick={() => setEditing(true)} className="self-start">{t("Таҳрир")}</Button>
          </ResumeCard>
        </>
      ) : null}
    </div>
  );
}
