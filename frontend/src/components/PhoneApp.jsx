import { useEffect, useState } from "react";
import { BellRing, Download, Share, Smartphone } from "lucide-react";
import { t } from "../i18n.js";
import { isIOS, pushState, turnPushOff, turnPushOn, useInstall } from "../pwa.js";
import { Button, ErrorBox } from "./ui.jsx";

// "The site on your phone": install it as an app, and turn phone notifications on or off.
export default function PhoneApp() {
  const { installed, canInstall, install } = useInstall();
  const [push, setPush] = useState("unsupported");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    pushState().then(setPush).catch(() => setPush("unsupported"));
  }, []);

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      if (push === "on") await turnPushOff();
      else await turnPushOn();
      setPush(await pushState());
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card flex flex-col gap-4 p-4 md:p-8">
      <h2 className="flex items-center gap-2 text-headline-sm">
        <Smartphone className="h-6 w-6 text-primary" aria-hidden />
        {t("Барнома дар телефон")}
      </h2>

      {installed ? (
        <p className="rounded-xl bg-tertiary-fixed p-3 text-label-md text-on-tertiary-fixed">{t("Muhojir.tj дар телефони шумо насб шудааст.")}</p>
      ) : canInstall ? (
        <div className="flex flex-col gap-3">
          <p className="text-body-md text-on-surface-variant">{t("Сайтро мисли барнома насб кунед: аз экрани асосӣ кушода мешавад ва ҳуҷҷатҳоятон бе интернет ҳам намоёнанд.")}</p>
          <Button icon={Download} onClick={install} className="self-start">{t("Ба телефон насб кардан")}</Button>
        </div>
      ) : isIOS() ? (
        <ol className="flex flex-col gap-2 text-body-md">
          <li className="flex items-center gap-2">1. {t("Дар Safari тугмаи «Мубодила»-ро пахш кунед")} <Share className="h-4 w-4 text-primary" aria-hidden /></li>
          <li>2. {t("«На экран „Домой“»-ро интихоб кунед.")}</li>
          <li>3. {t("«Добавить»-ро пахш кунед — Muhojir.tj дар экрани асосӣ пайдо мешавад.")}</li>
        </ol>
      ) : (
        <p className="text-body-md text-on-surface-variant">{t("Дар менюи браузер «Насб кардан» ё «Ба экрани асосӣ илова кардан»-ро интихоб кунед.")}</p>
      )}

      {push !== "unsupported" && push !== "off" && (
        <div className="flex flex-col gap-3 rounded-xl bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-start gap-3">
            <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden />
            <span>
              <span className="block text-label-lg">{t("Огоҳиҳо дар телефон")}</span>
              <span className="text-body-sm text-on-surface-variant">
                {push === "blocked" ? t("Огоҳиҳо дар танзимоти браузер манъ шудаанд. Онҳоро барои ин сайт иҷозат диҳед.") : t("Ёдраскунии мӯҳлатҳо ва кори нав мисли SMS ба телефон меояд.")}
              </span>
            </span>
          </span>
          {push !== "blocked" && (
            <Button variant={push === "on" ? "plain" : "primary"} loading={busy} onClick={toggle} className="shrink-0">
              {push === "on" ? t("Хомӯш кардан") : t("Фаъол кардан")}
            </Button>
          )}
        </div>
      )}
      <ErrorBox error={error} />
    </section>
  );
}
