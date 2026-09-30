import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, FileUser, Send } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { useApi } from "../hooks.js";
import { t } from "../i18n.js";
import { salary } from "../format.js";
import { Button, Drawer, ErrorBox } from "./ui.jsx";

// Sending an application: the employer gets the message together with the worker's resume.
export default function ApplyDrawer({ job, onClose }) {
  const { user } = useAuth();
  const resume = useApi(job && user?.role === "migrant" ? "/jobs/resumes/" : null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const close = () => {
    setMessage("");
    setError(null);
    setDone(false);
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/jobs/applications/", { method: "POST", body: { job: job.id, message } });
      setDone(true);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const myResume = resume.data?.results?.[0];

  return (
    <Drawer open={Boolean(job)} onClose={close} title={t("Ирсоли ариза барои кор")} subtitle={job ? `${job.title} • ${job.employer.name}` : ""} icon={Send}>
      {!job ? null : !user ? (
        <div className="space-y-4">
          <p className="text-body-md">{t("Барои ариза додан аввал ворид шавед.")}</p>
          <Link to="/login" className="inline-flex min-h-[48px] items-center rounded-xl bg-primary px-6 text-label-lg text-on-primary">{t("Ворид шудан")}</Link>
        </div>
      ) : user.role !== "migrant" ? (
        <p className="text-body-md text-on-surface-variant">{t("Ариза танҳо аз ҳисоби коргар фиристода мешавад.")}</p>
      ) : done ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-tertiary-container text-on-tertiary">
            <CheckCircle2 className="h-8 w-8" aria-hidden />
          </div>
          <h3 className="text-headline-sm">{t("Аризаи шумо фиристода шуд!")}</h3>
          <p className="max-w-sm text-body-md text-on-surface-variant">{t("Ҷавоби корфарморо дар саҳифаи «Аризаҳои ман» мебинед.")}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Link to="/applications" className="inline-flex min-h-[48px] items-center rounded-xl bg-primary px-6 text-label-lg text-on-primary">{t("Аризаҳои ман")}</Link>
            <Button variant="plain" onClick={close}>{t("Пӯшидан")}</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="rounded-xl bg-surface-container-low p-4">
            <p className="text-label-lg">{job.title}</p>
            <p className="text-body-sm text-on-surface-variant">{job.employer.name} • {job.city}</p>
            <p className="mt-2 text-label-lg text-primary">{salary(job)}</p>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-surface-container-low p-4">
            <FileUser className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden />
            {myResume ? (
              <div className="text-body-sm">
                <p className="text-label-lg">{myResume.full_name} — {myResume.profession}</p>
                <p className="text-on-surface-variant">{t("Корфармо резюмеи шуморо ҳамроҳи ариза мебинад.")}</p>
              </div>
            ) : (
              <div className="text-body-sm">
                <p className="text-label-lg">{t("Шумо ҳоло резюме надоред")}</p>
                <p className="text-on-surface-variant">
                  {t("Бо резюме корфармо шуморо зудтар даъват мекунад.")}{" "}
                  <Link to="/resume" className="text-primary underline">{t("Резюме сохтан (2 дақиқа)")}</Link>
                </p>
              </div>
            )}
          </div>

          <label className="block">
            <span className="label">{t("Паём ба корфармо (ихтиёрӣ)")}</span>
            <textarea className="input h-auto py-3" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("Масалан: Салом! 3 сол дар ин кор таҷриба дорам, патент ҳаст.")} />
          </label>
          <ErrorBox error={error} />
          <div className="flex gap-2">
            <Button variant="plain" onClick={close} className="w-1/3">{t("Бекор кардан")}</Button>
            <Button type="submit" icon={Send} loading={busy} className="flex-1">{t("Фиристодан")}</Button>
          </div>
        </form>
      )}
    </Drawer>
  );
}
