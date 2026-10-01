import { Suspense, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ArrowRight, Bell, BookOpen, Briefcase, Calculator, Home, LifeBuoy, LogIn, Moon, ReceiptText, Scale, SearchCheck, Settings, ShieldCheck, Sun,
} from "lucide-react";
import { api, apiAll } from "../api.js";
import { useAuth } from "../auth.jsx";
import { lang, setLang, t } from "../i18n.js";
import { useTheme } from "../theme.js";
import { AnimatePresence, m } from "motion/react";
import { PageTransition } from "./motion.jsx";
import { Skeleton } from "./ui.jsx";

function navFor(user) {
  if (!user) {
    return [
      { to: "/", icon: Home, label: t("Асосӣ"), short: t("Асосӣ"), end: true },
      { to: "/jobs", icon: Briefcase, label: t("Ҷойи кор"), short: t("Кор") },
      { to: "/calculator", icon: Calculator, label: t("Калкулятори патент"), short: t("Патент") },
      { to: "/guides", icon: BookOpen, label: t("Роҳнамо ва қонунҳо"), short: t("Роҳнамо") },
      { to: "/checks", icon: SearchCheck, label: t("Санҷиши ҳуҷҷатҳо"), desktopOnly: true },
      { to: "/login", icon: LogIn, label: t("Ворид шудан"), short: t("Ворид"), mobileOnly: true },
    ];
  }
  return [
    { to: "/", icon: Home, label: t("Асосӣ"), short: t("Асосӣ"), end: true },
    { to: "/documents", icon: ShieldCheck, label: t("Ҳуҷҷатҳои ман"), short: t("Ҳуҷҷатҳо"), badge: "docs" },
    { to: "/jobs", icon: Briefcase, label: t("Ҷойи кор"), short: t("Кор") },
    { to: "/calculator", icon: Calculator, label: t("Калкулятори патент"), desktopOnly: true },
    { to: "/guides", icon: BookOpen, label: t("Роҳнамо ва қонунҳо"), short: t("Роҳнамо") },
    { to: "/checks", icon: SearchCheck, label: t("Санҷиши ҳуҷҷатҳо"), desktopOnly: true },
    { to: "/payments", icon: ReceiptText, label: t("Архиви чекҳо"), desktopOnly: true },
    { to: "/notifications", icon: Bell, label: t("Огоҳиҳо"), badge: "unread", desktopOnly: true },
    { to: "/profile", icon: Settings, label: t("Профил ва танзимот"), short: t("Профил") },
  ];
}

// Counters for the menu: unread notifications and documents that need attention (ending soon or expired).
function useCounters(user) {
  const [counts, setCounts] = useState({ unread: 0, docs: 0 });
  const { pathname } = useLocation();
  useEffect(() => {
    if (!user) {
      setCounts({ unread: 0, docs: 0 });
      return;
    }
    let alive = true;
    const unread = api("/auth/notifications/unread-count/").then((r) => r.count).catch(() => 0);
    const docs = apiAll("/documents/my-documents/").then((list) => list.filter((d) => d.status !== "valid").length).catch(() => 0);
    Promise.all([unread, docs]).then(([u, d]) => alive && setCounts({ unread: u, docs: d }));
    return () => {
      alive = false;
    };
  }, [user, pathname]);
  return counts;
}

// light: white text for the dark sidebar.
function Logo({ light = false }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Muhojir.tj">
      <span className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${light ? "bg-white" : "bg-banner"}`}>
        <ShieldCheck className={`h-5 w-5 ${light ? "text-secondary" : "text-white"}`} strokeWidth={2.4} aria-hidden />
      </span>
      <span className={`font-display text-[22px] font-bold ${light ? "text-white" : "text-navy"}`}>
        Muhojir<span className={light ? "text-[#ff8a8f]" : "text-secondary"}>.tj</span>
      </span>
    </Link>
  );
}

function LangSwitch() {
  const { user } = useAuth();
  const choose = async (next) => {
    if (next === lang) return;
    // Remember it in the profile too, so emails come in the same language.
    if (user) await api("/auth/profile/", { method: "PATCH", body: { language: next } }).catch(() => {});
    setLang(next);
  };
  return (
    <div className="inline-flex items-center rounded-full bg-surface-container-high p-1" role="group" aria-label={t("Забон")}>
      {[
        ["tg", "Тоҷикӣ", "ТҶ"],
        ["ru", "Русский", "РУ"],
      ].map(([code, name, shortName]) => (
        <button
          key={code}
          type="button"
          onClick={() => choose(code)}
          aria-pressed={lang === code}
          className={`rounded-full px-3 py-1 text-label-md transition-all ${lang === code ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}
        >
          <span className="hidden sm:inline">{name}</span>
          <span className="sm:hidden">{shortName}</span>
        </button>
      ))}
    </div>
  );
}

function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? t("Мавзӯи равшан") : t("Мавзӯи торик")}
      title={dark ? t("Мавзӯи равшан") : t("Мавзӯи торик")}
      className="rounded-full p-2 text-white hover:bg-white/10 lg:text-on-surface-variant lg:hover:bg-surface-container-high"
    >
      {/* The icon turns while the sun and the moon swap. */}
      <AnimatePresence mode="wait" initial={false}>
        <m.span key={dark ? "sun" : "moon"} className="block" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
          {dark ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
        </m.span>
      </AnimatePresence>
    </button>
  );
}

function Badge({ kind, counts }) {
  const n = counts[kind];
  if (!n) return null;
  return (
    <span className={`inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-label-sm ${kind === "docs" ? "bg-warning-container text-on-warning-container" : "bg-secondary text-white"}`}>
      {n}
    </span>
  );
}

export default function Layout() {
  const { user } = useAuth();
  const items = navFor(user);
  const counts = useCounters(user);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const firstName = user?.full_name?.split(" ")[0] || user?.email?.split("@")[0];

  return (
    <div className="min-h-screen">
      {/* Sidebar: desktop only */}
      <aside className="fixed left-0 top-0 z-50 hidden h-full w-[260px] flex-col justify-between bg-navy lg:flex">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex h-[72px] items-center px-5">
            <Logo light />
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-2" aria-label={t("Менюи асосӣ")}>
            {items
              .filter((i) => !i.mobileOnly)
              .map((i) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  end={i.end}
                  className={({ isActive }) =>
                    `flex min-h-[48px] items-center justify-between rounded-xl px-4 py-3 text-label-lg transition-colors ${
                      isActive ? "bg-primary-container font-bold text-white" : "text-on-navy hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  <span className="flex items-center gap-4">
                    <i.icon className="h-5 w-5" aria-hidden />
                    {i.label}
                  </span>
                  {i.badge && <Badge kind={i.badge} counts={counts} />}
                </NavLink>
              ))}
          </nav>
        </div>
        <div className="p-3">
          <NavLink to="/help" className={({ isActive }) => `flex flex-col gap-1.5 rounded-2xl bg-secondary p-4 text-white transition-shadow hover:shadow-lg ${isActive ? "ring-2 ring-white" : ""}`}>
            <span className="flex items-center gap-2 text-label-lg font-bold">
              <Scale className="h-5 w-5" aria-hidden />
              {t("Маркази ёрии ҳуқуқӣ")}
            </span>
            <span className="text-body-sm text-secondary-fixed">{t("Сайтҳои расмӣ дар бораи патент ва қонунҳо")}</span>
            <span className="mt-1 inline-flex items-center gap-1 text-label-md">
              {t("Кушодан")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </NavLink>
        </div>
      </aside>

      <div className="lg:pl-[260px]">
        {/* Phones: blue, joined to the blue banner below. Desktop: white, next to the dark sidebar. */}
        <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between gap-2 bg-banner px-4 lg:left-[260px] lg:h-[72px] lg:bg-surface-container-lowest/90 lg:px-8 lg:shadow-[0_1px_8px_rgba(0,0,0,0.04)] lg:backdrop-blur-xl">
          <div className="lg:hidden">
            <Logo light />
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2 md:gap-4">
            <LangSwitch />
            <ThemeToggle />
            <Link to="/help" className="rounded-full bg-secondary p-2 text-white hover:bg-secondary-container lg:bg-transparent lg:text-secondary lg:hover:bg-secondary-fixed" aria-label={t("Маркази ёрии ҳуқуқӣ")} title={t("Маркази ёрии ҳуқуқӣ")}>
              <LifeBuoy className="h-6 w-6" />
            </Link>
            {user ? (
              <>
                <Link to="/notifications" className="relative rounded-full p-2 text-white hover:bg-white/10 lg:text-on-surface-variant lg:hover:bg-surface-container-high" aria-label={t("Огоҳиҳо")}>
                  <Bell className="h-6 w-6" />
                  {counts.unread > 0 && (
                    // Pops in again whenever the number changes.
                    <m.span key={counts.unread} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }} className="absolute right-0.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-on-error">
                      {counts.unread}
                    </m.span>
                  )}
                </Link>
                <Link to="/profile" className="hidden items-center gap-2 rounded-full bg-surface-container-low py-1 pl-1 pr-3 hover:bg-surface-container-high sm:flex">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-bold text-on-primary" aria-hidden>
                    {(firstName || "?")[0].toUpperCase()}
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="max-w-[140px] truncate text-label-md">{firstName}</span>
                    {user.city && <span className="max-w-[140px] truncate text-body-sm text-on-surface-variant">{user.city}</span>}
                  </span>
                </Link>
              </>
            ) : (
              <Link to="/login" className="hidden min-h-[40px] items-center gap-2 rounded-xl bg-secondary px-4 text-label-md text-on-secondary hover:bg-secondary-container sm:inline-flex lg:bg-primary lg:text-on-primary lg:hover:brightness-110">
                <LogIn className="h-4 w-4" aria-hidden />
                {t("Ворид шудан")}
              </Link>
            )}
          </div>
        </header>

        <main className="min-h-screen pb-24 pt-16 lg:pb-0 lg:pt-[72px]">
          <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
            {/* A page that is still downloading shows a placeholder; the menu and header stay. */}
            <Suspense fallback={<Skeleton className="h-64" />}>
              <PageTransition pageKey={pathname}>
                <Outlet />
              </PageTransition>
            </Suspense>
          </div>
        </main>
      </div>

      {/* Bottom tabs: phones and tablets */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 grid bg-surface-container-lowest pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_8px_rgba(0,0,0,0.06)] lg:hidden" style={{ gridTemplateColumns: `repeat(${items.filter((i) => !i.desktopOnly).length}, 1fr)` }} aria-label={t("Менюи асосӣ")}>
        {items
          .filter((i) => !i.desktopOnly)
          .map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.end}
              className={({ isActive }) => `relative flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${isActive ? "text-primary" : "text-on-surface-variant"}`}
            >
              {({ isActive }) => (
                <>
                  <span className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${isActive ? "bg-primary-fixed" : ""}`}>
                    <i.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="max-w-full truncate px-1">{i.short}</span>
                  {i.badge && counts[i.badge] > 0 && <span className="absolute right-[18%] top-1.5 h-2.5 w-2.5 rounded-full bg-warning-container ring-2 ring-surface-container-lowest" />}
                </>
              )}
            </NavLink>
          ))}
      </nav>
    </div>
  );
}
