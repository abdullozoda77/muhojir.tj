import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { t } from "../i18n.js";
import { Button, ErrorBox } from "../components/ui.jsx";

const RESEND_SECONDS = 60;

function CodeBoxes({ value, onChange, disabled }) {
  const refs = useRef([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  // The value keeps a space for every empty box, so erasing a middle digit does not shift the others.
  const setAt = (i, d) => onChange(digits.map((x, j) => (j === i ? d : x)).join(""));

  return (
    <div className="flex justify-between gap-2" onPaste={(e) => {
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      if (pasted) {
        e.preventDefault();
        onChange(pasted.padEnd(6, " "));
        refs.current[Math.min(pasted.length, 5)]?.focus();
      }
    }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d.trim()}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={t("Рақами {0}", i + 1)}
          className="h-14 w-full max-w-[56px] rounded-xl border-0 bg-surface-container-low text-center text-headline-md font-bold focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary"
          // Selecting the digit on focus lets a new one replace it instead of being blocked.
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const typed = e.target.value.replace(/\D/g, "");
            // The phone's "fill code from SMS/email" puts the whole code into one box.
            if (typed.length > 2) {
              onChange(typed.slice(0, 6).padEnd(6, " "));
              refs.current[Math.min(typed.length, 6) - 1]?.focus();
              return;
            }
            const ch = typed.slice(-1);
            setAt(i, ch || " ");
            if (ch && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !d.trim() && i > 0) refs.current[i - 1]?.focus();
          }}
        />
      ))}
    </div>
  );
}

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [fullName, setFullName] = useState("");
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  if (user) return <Navigate to={location.state?.from || "/"} replace />;

  const sendCode = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api("/auth/send-code/", { method: "POST", body: { email } });
      setIsNew(res.is_new_user);
      setStep("code");
      setCode("");
      setWait(RESEND_SECONDS);
    } catch (err) {
      setError(err);
      if (err.status === 429) setWait(RESEND_SECONDS);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = { email, code: code.replace(/\s/g, ""), ...(isNew ? { full_name: fullName.trim() } : {}) };
      const data = await api("/auth/verify-code/", { method: "POST", body });
      login(data);
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-banner p-12 text-white lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="" className="h-10 w-10 rounded-xl ring-2 ring-white/30" />
          <span className="text-headline-md font-bold">Muhojir.tj</span>
        </Link>
        <div>
          <h1 className="text-headline-xl">{t("Ҳуҷҷатҳо сари вақт. Кори боэътимод.")}</h1>
          <ul className="mt-8 space-y-4 text-body-lg text-on-navy">
            {[t("Ёдраскунӣ пеш аз тамом шудани мӯҳлати ҳуҷҷатҳо"), t("Роҳнамои қадам ба қадам бо забони тоҷикӣ"), t("Ҷойҳои кори воқеӣ бо суроға")].map((line) => (
              <li key={line} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-300" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-body-sm text-on-navy/80">{t("Бепул. Бе парол — рамз ба почтаи электронӣ меояд.")}</p>
      </div>

      <div className="flex flex-col justify-center px-4 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-label-md text-on-surface-variant hover:text-primary">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t("Ба саҳифаи асосӣ")}
          </Link>
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
            {step === "email" ? <Mail className="h-7 w-7" aria-hidden /> : <ShieldCheck className="h-7 w-7" aria-hidden />}
          </div>

          {step === "email" ? (
            <form onSubmit={sendCode} className="space-y-5">
              <div>
                <h2 className="text-headline-lg">{t("Ворид шудан")}</h2>
                <p className="mt-1 text-body-md text-on-surface-variant">{t("Почтаи электронии худро нависед. Мо ба он рамзи 6-рақама мефиристем.")}</p>
              </div>
              <label className="block">
                <span className="label">{t("Почтаи электронӣ (email)")}</span>
                <input className="input" type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ali@gmail.com" />
              </label>
              <ErrorBox error={error} />
              <Button type="submit" loading={busy} disabled={wait > 0} className="w-full">
                {wait > 0 ? t("Баъд аз {0} сония", wait) : t("Рамз гирифтан")}
              </Button>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-5">
              <div>
                <h2 className="text-headline-lg">{t("Рамзро ворид кунед")}</h2>
                <p className="mt-1 text-body-md text-on-surface-variant">
                  {t("Рамзро ба {0} фиристодем. Агар набошад, папкаи «Спам»-ро бинед.", email)}
                </p>
              </div>
              <CodeBoxes value={code} onChange={setCode} disabled={busy} />

              {isNew && (
                <div className="space-y-4 rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
                  <p className="text-label-lg">{t("Шумо бори аввал ҳастед. Хуш омадед!")}</p>
                  <label className="block">
                    <span className="label">{t("Ному насаб")}</span>
                    <input className="input" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("Масалан: Алӣ Каримов")} />
                  </label>
                </div>
              )}

              <ErrorBox error={error} />
              <Button type="submit" loading={busy} disabled={code.replace(/\s/g, "").length !== 6} className="w-full">
                {t("Тасдиқ кардан")}
              </Button>
              <div className="flex flex-wrap items-center justify-between gap-2 text-label-md">
                <button type="button" onClick={() => { setStep("email"); setError(null); }} className="min-h-[44px] text-on-surface-variant hover:text-primary">
                  {t("Email-ро иваз кардан")}
                </button>
                <button type="button" onClick={sendCode} disabled={wait > 0 || busy} className="min-h-[44px] text-primary disabled:text-outline">
                  {wait > 0 ? t("Рамзи нав баъд аз {0} сония", wait) : t("Рамзи нав фиристед")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
