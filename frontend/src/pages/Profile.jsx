import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, LogOut, Mail, RefreshCw, Save, Send } from "lucide-react";
import { api } from "../api.js";
import { useApi } from "../hooks.js";
import { useAuth } from "../auth.jsx";
import { lang, setLang, t } from "../i18n.js";
import { Button, ErrorBox, Field, PageHeader } from "../components/ui.jsx";

// Telegram reminders: open our bot with a one-time link, press Start there, then come back and check.
function TelegramBox() {
  const status = useApi("/auth/telegram/");
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  if (!status.data?.available) return null; // the server has no bot yet

  const connect = async () => {
    const tab = window.open("", "_blank");
    setBusy(true);
    try {
      const { url } = await api("/auth/telegram/", { method: "POST" });
      if (tab) tab.location.href = url;
      else window.location.href = url;
      setWaiting(true);
    } catch {
      tab?.close();
    } finally {
      setBusy(false);
    }
  };
  const disconnect = async () => {
    await api("/auth/telegram/", { method: "DELETE" }).catch(() => {});
    status.reload();
  };

  return (
    <section className="card flex flex-col gap-3 p-4 md:p-6" id="telegram">
      <h2 className="flex items-center gap-2 text-headline-sm">
        <Send className="h-5 w-5 text-primary" aria-hidden />
        {t("Ёдраскунӣ дар Telegram")}
      </h2>
      {status.data.connected ? (
        <>
          <p className="flex items-center gap-2 rounded-xl bg-tertiary-fixed p-3 text-label-md text-on-tertiary-fixed">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
            {t("Пайваст аст. Ёдраскуниҳо ба Telegram меоянд.")}
          </p>
          <Button variant="ghost" onClick={disconnect} className="self-start">{t("Хомӯш кардан")}</Button>
        </>
      ) : (
        <>
          <p className="text-body-md text-on-surface-variant">{t("Бепул. Ботро кушоед ва «Start»-ро пахш кунед — ёдраскуниҳо ба Telegram-и шумо меоянд.")}</p>
          <div className="flex flex-wrap gap-2">
            <Button icon={Send} loading={busy} onClick={connect}>{t("Telegram-ро пайваст кардан")}</Button>
            {waiting && <Button variant="soft" icon={RefreshCw} onClick={status.reload}>{t("Start-ро пахш кардам, санҷед")}</Button>}
          </div>
        </>
      )}
    </section>
  );
}

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm({ full_name: user.full_name || "", phone: user.phone || "", city: user.city || "", language: user.language, email_reminders: user.email_reminders });
  }, [user]);

  if (!form) return null;
  const set = (key, value) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setError(null);
    try {
      const data = await api("/auth/profile/", { method: "PATCH", body: { ...form, phone: form.phone.trim() || null } });
      setUser(data);
      setSaved(true);
      if (data.language !== lang) setLang(data.language);
    } catch (err) {
      if (err.status === 400 && err.data && !err.data.detail) setErrors(err.data);
      else setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title={t("Профил ва танзимот")} />
      <form onSubmit={submit} className="card flex flex-col gap-4 p-4 md:p-8">
        <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-4">
          <Mail className="h-5 w-5 text-primary" aria-hidden />
          <div>
            <span className="block text-body-sm text-on-surface-variant">{t("Почтаи электронӣ (барои воридшавӣ)")}</span>
            <span className="text-label-lg">{user.email}</span>
          </div>
        </div>
        <Field label={t("Ному насаб")} error={errors.full_name}>
          <input className="input" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} autoComplete="name" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Телефон (ихтиёрӣ)")} error={errors.phone} hint={t("Корфармоён барои тамос мебинанд")}>
            <input className="input" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+7 999 123-45-67" autoComplete="tel" />
          </Field>
          <Field label={t("Шаҳр дар Русия")} error={errors.city}>
            <input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder={t("Масалан: Москва")} />
          </Field>
        </div>
        <Field label={t("Забон")} error={errors.language}>
          <select className="input" value={form.language} onChange={(e) => set("language", e.target.value)}>
            <option value="tg">Тоҷикӣ</option>
            <option value="ru">Русский</option>
          </select>
        </Field>
        <label className="flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl bg-surface-container-low p-4">
          <input type="checkbox" className="h-5 w-5 rounded text-primary focus:ring-primary" checked={form.email_reminders} onChange={(e) => set("email_reminders", e.target.checked)} />
          <span>
            <span className="block text-label-lg">{t("Ёдраскунӣ ба почтаи электронӣ")}</span>
            <span className="text-body-sm text-on-surface-variant">{t("Пеш аз тамом шудани мӯҳлати ҳуҷҷатҳо")}</span>
          </span>
        </label>
        <ErrorBox error={error} />
        {saved && <p role="status" className="rounded-xl bg-tertiary-fixed p-3 text-label-md text-on-tertiary-fixed">{t("Сабт шуд")}</p>}
        <Button type="submit" icon={Save} loading={busy}>{t("Сабт кардан")}</Button>
      </form>
      <TelegramBox />
      <Button
        variant="plain"
        icon={LogOut}
        onClick={async () => {
          await logout();
          navigate("/");
        }}
        className="text-error"
      >
        {t("Баромадан")}
      </Button>
    </div>
  );
}
