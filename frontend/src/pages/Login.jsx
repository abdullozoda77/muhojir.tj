import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { t } from "../i18n.js";
import { Button, ErrorBox } from "../components/ui.jsx";

const RESEND_SECONDS = 60;

// A password box with a button to show what was typed (on a phone it is easy to mistype).
function PasswordInput({ value, onChange, autoComplete, label, hint }) {
  const [shown, setShown] = useState(false);
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="relative block">
        <input className="input pr-12" type={shown ? "text" : "password"} required minLength={8} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? t("Паролро пинҳон кардан") : t("Паролро нишон додан")}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-on-surface-variant hover:text-primary"
        >
          {shown ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
        </button>
      </span>
      {hint && <span className="mt-1 block text-body-sm text-on-surface-variant">{hint}</span>}
    </label>
  );
}

// The screens of this page. "verify" and "reset" come after a code was emailed.
const ICONS = { login: LogIn, register: UserPlus, verify: ShieldCheck, forgot: KeyRound, reset: KeyRound };

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
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [code, setCode] = useState("");
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  if (user) return <Navigate to={location.state?.from || "/"} replace />;

  const go = (next) => {
    setMode(next);
    setError(null);
    setNote("");
    setCode("");
  };

  // Every form: busy while waiting, errors shown under the fields.
  const run = (action) => async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err);
      if (err.status === 429) setWait(RESEND_SECONDS);
    } finally {
      setBusy(false);
    }
  };

  const enter = (data) => {
    login(data);
    navigate(location.state?.from || "/", { replace: true });
  };

  const codeSent = (next) => {
    setCode("");
    setWait(RESEND_SECONDS);
    go(next);
  };

  const signIn = run(async () => {
    try {
      enter(await api("/auth/login/", { method: "POST", body: { email, password } }));
    } catch (err) {
      // Signed up but never confirmed the email: the server has just sent a new code.
      if (err.status === 403 && err.data?.code === "not_verified") return codeSent("verify");
      throw err;
    }
  });

  const register = run(async () => {
    await api("/auth/register/", { method: "POST", body: { email, password, full_name: fullName.trim() } });
    codeSent("verify");
  });

  const verify = run(async () => {
    enter(await api("/auth/verify-email/", { method: "POST", body: { email, code: code.replace(/\s/g, "") } }));
  });

  const resend = run(async () => {
    await api("/auth/resend-code/", { method: "POST", body: { email } });
    setWait(RESEND_SECONDS);
    setNote(t("Рамзи нав фиристода шуд."));
  });

  const forgot = run(async () => {
    await api("/auth/password/forgot/", { method: "POST", body: { email } });
    setPassword("");
    codeSent("reset");
  });

  const reset = run(async () => {
    enter(await api("/auth/password/reset/", { method: "POST", body: { email, code: code.replace(/\s/g, ""), password } }));
  });

  const Icon = ICONS[mode];
  const codeReady = code.replace(/\s/g, "").length === 6;
  const emailInput = (
    <label className="block">
      <span className="label">{t("Почтаи электронӣ (email)")}</span>
      <input className="input" type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ali@gmail.com" />
    </label>
  );
  const linkButton = "min-h-[44px] text-label-md text-primary hover:underline disabled:text-outline disabled:no-underline";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-banner p-12 text-white lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white p-0.5"><img src="/logo.png" alt="" className="h-full w-full" /></span>
          <span className="text-headline-md font-bold">Muhojir</span>
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
        <p className="text-body-sm text-on-navy/80">{t("Бепул. Почтаи шумо бо рамз тасдиқ карда мешавад.")}</p>
      </div>

      <div className="flex flex-col justify-center px-4 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-label-md text-on-surface-variant hover:text-primary">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t("Ба саҳифаи асосӣ")}
          </Link>
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
            <Icon className="h-7 w-7" aria-hidden />
          </div>

          {mode === "login" && (
            <form onSubmit={signIn} className="space-y-5">
              <div>
                <h2 className="text-headline-lg">{t("Ворид шудан")}</h2>
                <p className="mt-1 text-body-md text-on-surface-variant">{t("Почтаи электронӣ ва пароли худро нависед.")}</p>
              </div>
              {emailInput}
              <PasswordInput label={t("Парол")} value={password} onChange={setPassword} autoComplete="current-password" />
              <ErrorBox error={error} />
              <Button type="submit" loading={busy} className="w-full">{t("Ворид шудан")}</Button>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" onClick={() => go("forgot")} className={linkButton}>{t("Паролро фаромӯш кардед?")}</button>
                <button type="button" onClick={() => go("register")} className={linkButton}>{t("Ҳисоб надоред? Сабти ном")}</button>
              </div>
            </form>
          )}

          {mode === "register" && (
            <form onSubmit={register} className="space-y-5">
              <div>
                <h2 className="text-headline-lg">{t("Сабти ном")}</h2>
                <p className="mt-1 text-body-md text-on-surface-variant">{t("Парол созед. Баъд ба почтаи шумо рамзи 6-рақама меояд, то онро тасдиқ кунед.")}</p>
              </div>
              <label className="block">
                <span className="label">{t("Ному насаб")}</span>
                <input className="input" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("Масалан: Алӣ Каримов")} />
              </label>
              {emailInput}
              <PasswordInput label={t("Парол созед")} value={password} onChange={setPassword} autoComplete="new-password" hint={t("Ҳадди ақал 8 аломат: ҳарфҳо ва рақамҳо. Танҳо рақам ё пароли осон қабул намешавад.")} />
              <ErrorBox error={error} />
              <Button type="submit" loading={busy} className="w-full">{t("Сабти ном ва гирифтани рамз")}</Button>
              <button type="button" onClick={() => go("login")} className={linkButton}>{t("Ҳисоб доред? Ворид шавед")}</button>
            </form>
          )}

          {(mode === "verify" || mode === "reset") && (
            <form onSubmit={mode === "verify" ? verify : reset} className="space-y-5">
              <div>
                <h2 className="text-headline-lg">{mode === "verify" ? t("Почтаро тасдиқ кунед") : t("Пароли нав")}</h2>
                <p className="mt-1 text-body-md text-on-surface-variant">
                  {t("Рамзро ба {0} фиристодем. Агар набошад, папкаи «Спам»-ро бинед.", email)}
                </p>
              </div>
              <CodeBoxes value={code} onChange={setCode} disabled={busy} />
              {mode === "reset" && (
                <PasswordInput label={t("Пароли нав")} value={password} onChange={setPassword} autoComplete="new-password" hint={t("Ҳадди ақал 8 аломат: ҳарфҳо ва рақамҳо. Танҳо рақам ё пароли осон қабул намешавад.")} />
              )}
              <ErrorBox error={error} />
              {note && <p role="status" className="rounded-xl bg-tertiary-fixed p-3 text-label-md text-on-tertiary-fixed">{note}</p>}
              <Button type="submit" loading={busy} disabled={!codeReady || (mode === "reset" && password.length < 8)} className="w-full">
                {mode === "verify" ? t("Тасдиқ кардан") : t("Паролро иваз кардан")}
              </Button>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" onClick={() => go(mode === "verify" ? "register" : "forgot")} className="min-h-[44px] text-label-md text-on-surface-variant hover:text-primary">
                  {t("Email-ро иваз кардан")}
                </button>
                <button type="button" onClick={mode === "verify" ? resend : forgot} disabled={wait > 0 || busy} className={linkButton}>
                  {wait > 0 ? t("Рамзи нав баъд аз {0} сония", wait) : t("Рамзи нав фиристед")}
                </button>
              </div>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={forgot} className="space-y-5">
              <div>
                <h2 className="text-headline-lg">{t("Барқарор кардани парол")}</h2>
                <p className="mt-1 text-body-md text-on-surface-variant">{t("Почтаи худро нависед. Мо рамз мефиристем ва шумо пароли нав мегузоред.")}</p>
              </div>
              {emailInput}
              <ErrorBox error={error} />
              <Button type="submit" loading={busy} disabled={wait > 0} className="w-full">
                {wait > 0 ? t("Баъд аз {0} сония", wait) : t("Рамз гирифтан")}
              </Button>
              <button type="button" onClick={() => go("login")} className={linkButton}>{t("Бозгашт ба воридшавӣ")}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
