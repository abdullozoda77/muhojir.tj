import { Link } from "react-router-dom";
import {
  ArrowRight, BadgeCheck, BookOpen, Briefcase, Building2, Calculator, CheckCircle2, ClipboardList, FilePlus2, FileUser, Inbox,
  MapPin, Newspaper, PlusCircle, ShieldAlert, ShieldCheck, Users, Wallet,
} from "lucide-react";
import { useAuth } from "../auth.jsx";
import { useApi } from "../hooks.js";
import { t } from "../i18n.js";
import { date, daysText, usedPercent } from "../format.js";
import JobCard from "../components/JobCard.jsx";
import { docIcon } from "../components/DocCard.jsx";
import { useDocuments } from "./Documents.jsx";
import { STATUS, Skeleton, StatusBadge } from "../components/ui.jsx";

function SectionTitle({ icon: Icon, title, text, to, linkText }) {
  return (
    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
      <div>
        <div className="flex items-center gap-2">
          <Icon className="h-6 w-6 text-primary" aria-hidden />
          <h2 className="text-headline-md md:text-headline-lg">{title}</h2>
        </div>
        {text && <p className="mt-1 text-body-md text-on-surface-variant">{text}</p>}
      </div>
      {to && (
        <Link to={to} className="inline-flex min-h-[44px] items-center gap-1 text-label-lg text-primary hover:underline">
          {linkText}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

function QuickAction({ to, icon: Icon, title, text, tone }) {
  return (
    <Link to={to} className="card group flex min-h-[140px] flex-col justify-between p-4 transition-all hover:bg-surface-container-low lg:p-6">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${tone}`}>
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <div>
        <p className="mt-3 text-label-lg font-bold">{title}</p>
        <p className="text-body-sm text-on-surface-variant">{text}</p>
      </div>
    </Link>
  );
}

function Ring({ days, pct, tone }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 96 96" aria-hidden>
        <circle cx="48" cy="48" r={r} fill="transparent" stroke="currentColor" strokeWidth="8" className="text-surface-container-high" />
        <circle cx="48" cy="48" r={r} fill="transparent" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - (pct ?? 100) / 100)} className={tone} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-headline-sm font-bold leading-none">{Math.abs(days)}</span>
        <span className="mt-1 text-label-sm leading-none text-on-surface-variant">{days < 0 ? t("рӯз пеш") : t("рӯз")}</span>
      </div>
    </div>
  );
}

function NewsList({ items }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((n) => (
        <Link key={n.id} to={`/news/${n.id}`} className="card flex flex-col gap-2 p-4 transition-shadow hover:shadow-md md:p-6">
          <span className="text-label-sm text-secondary">{date(n.published_at || n.created_at)}</span>
          <h3 className="text-headline-sm leading-snug">{n.title}</h3>
          <p className="line-clamp-2 text-body-sm text-on-surface-variant">{n.summary}</p>
          <span className="mt-1 inline-flex items-center gap-1 text-label-md text-primary">
            {t("Муфассал хондан")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </Link>
      ))}
    </div>
  );
}

function LatestJobsAndNews({ city }) {
  const cityJobs = useApi(city ? `/jobs/jobs/?city=${encodeURIComponent(city)}&page_size=3` : null);
  const latestJobs = useApi(!city || (cityJobs.data && cityJobs.data.count === 0) ? "/jobs/jobs/?page_size=3" : null);
  const news = useApi("/documents/news/?page_size=2");
  const jobs = cityJobs.data?.count ? cityJobs.data : latestJobs.data;
  const loadingJobs = cityJobs.loading || latestJobs.loading;

  return (
    <>
      <section className="flex flex-col gap-4">
        <SectionTitle
          icon={BadgeCheck}
          title={cityJobs.data?.count ? t("Кори нав дар шаҳри {0}", city) : t("Ҷойҳои кории нав")}
          text={t("Корфармоёни санҷидашуда аз ҷониби админ, бо баҳои коргарон")}
          to="/jobs"
          linkText={jobs?.count ? t("Ҳамаи ҷойҳои корӣ ({0})", jobs.count) : t("Ҳамаи ҷойҳои корӣ")}
        />
        {loadingJobs ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </div>
        ) : jobs?.results?.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {jobs.results.map((job) => (
              <JobCard key={job.id} job={job} compact />
            ))}
          </div>
        ) : (
          <p className="card p-6 text-body-md text-on-surface-variant">{t("Ҳоло эълони кор нест. Ба наздикӣ илова мешавад.")}</p>
        )}
      </section>

      {news.data?.results?.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionTitle icon={Newspaper} title={t("Хабарҳои муҳими қонунгузорӣ")} to="/guides" linkText={t("Ҳамаи хабарҳо")} />
          <NewsList items={news.data.results} />
        </section>
      )}
    </>
  );
}

function GuestHome() {
  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-container p-6 text-on-primary md:p-10">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-lowest/20 px-3 py-1 text-label-sm backdrop-blur-md">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {t("Барои муҳоҷирони тоҷик дар Русия")}
          </span>
          <h1 className="mt-4 text-headline-lg md:text-headline-xl">{t("Ҳуҷҷатҳо сари вақт. Кори боэътимод.")}</h1>
          <p className="mt-3 text-body-lg text-on-primary-container">
            {t("Мӯҳлати патент ва бақайдгириро фаромӯш накунед, нархи патентро ҳисоб кунед ва корро аз корфармоёни санҷидашуда ёбед. Ҳамааш бепул ва бо забони тоҷикӣ.")}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to="/login" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-secondary px-6 text-label-lg text-on-secondary shadow-sm hover:bg-secondary-container">
              {t("Оғоз кардан — бепул")}
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            <Link to="/jobs" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-on-primary/10 px-6 text-label-lg ring-1 ring-on-primary/30 hover:bg-on-primary/20">
              <Briefcase className="h-5 w-5" aria-hidden />
              {t("Кор ҷустан")}
            </Link>
          </div>
        </div>
        <ShieldCheck className="absolute -bottom-10 -right-10 h-64 w-64 text-on-primary/10" aria-hidden />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          [ShieldAlert, t("Ёдраскунии мӯҳлатҳо"), t("Пеш аз тамом шудани патент, бақайдгирӣ ва суғурта ба почтаи шумо хабар меояд."), "bg-secondary-fixed text-secondary"],
          [BookOpen, t("Роҳнамои қадам ба қадам"), t("Чӣ бояд кард, чӣ бурдан лозим ва чанд пул аст — бо забони содда."), "bg-primary-fixed text-primary"],
          [BadgeCheck, t("Корфармоёни тасдиқшуда"), t("Шарҳи коргарон ва рӯйхати сиёҳи ширкатҳое, ки маош намедиҳанд."), "bg-tertiary-fixed text-tertiary"],
        ].map(([Icon, title, text, tone]) => (
          <div key={title} className="card flex flex-col gap-3 p-6">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="text-headline-sm">{title}</h2>
            <p className="text-body-md text-on-surface-variant">{text}</p>
          </div>
        ))}
      </section>

      <Link to="/calculator" className="card flex flex-col items-start gap-4 p-6 transition-shadow hover:shadow-md sm:flex-row sm:items-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary-fixed text-secondary">
          <Calculator className="h-6 w-6" aria-hidden />
        </div>
        <div className="flex-1">
          <h2 className="text-headline-sm">{t("Нархи патент дар минтақаи шумо чанд аст?")}</h2>
          <p className="text-body-md text-on-surface-variant">{t("Минтақа ва шумораи моҳҳоро интихоб кунед — маблағи умумиро фавран мебинед.")}</p>
        </div>
        <ArrowRight className="hidden h-6 w-6 text-primary sm:block" aria-hidden />
      </Link>

      <LatestJobsAndNews />
    </div>
  );
}

function MigrantHome({ user }) {
  const { docs, types, loading } = useDocuments();
  const order = { expired: 0, expiring: 1, valid: 2 };
  const sorted = [...docs].sort((a, b) => order[a.status] - order[b.status] || a.expires_at.localeCompare(b.expires_at));
  const next = sorted[0];
  const s = next ? STATUS[next.status] : null;
  const firstName = user.full_name?.split(" ")[0];
  const needAttention = docs.filter((d) => d.status !== "valid").length;

  return (
    <div className="flex flex-col gap-8">
      <section className="card flex flex-col justify-between gap-4 p-4 md:flex-row md:items-center md:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileUser className="h-8 w-8" aria-hidden />
          </div>
          <div>
            <h1 className="text-headline-md">{firstName ? t("Салом, {0}!", firstName) : t("Салом!")}</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-body-md text-on-surface-variant">
              <MapPin className="h-4 w-4 text-secondary" aria-hidden />
              {user.city || <Link to="/profile" className="text-primary underline">{t("Шаҳри худро нишон диҳед")}</Link>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-surface-container-low px-4 py-2.5">
          {needAttention ? <ShieldAlert className="h-5 w-5 text-warning" aria-hidden /> : <ShieldCheck className="h-5 w-5 text-tertiary" aria-hidden />}
          <div className="flex flex-col">
            <span className="text-label-sm text-on-surface-variant">{t("Ҳолати ҳуҷҷатҳо")}</span>
            <span className={`text-label-md ${needAttention ? "text-warning" : "text-tertiary"}`}>
              {loading ? "…" : needAttention ? t("{0} ҳуҷҷат диққат талаб мекунад", needAttention) : docs.length ? t("Ҳамааш тартиб аст") : t("Ҳуҷҷат илова нашудааст")}
            </span>
          </div>
        </div>
      </section>

      {loading ? (
        <Skeleton className="h-48" />
      ) : next ? (
        <section className="card relative overflow-hidden p-4 md:p-6 lg:p-8">
          <div className={`absolute bottom-0 left-0 top-0 w-2.5 ${s.bar}`} />
          <div className="grid items-center gap-6 pl-2 xl:grid-cols-12">
            <div className="flex flex-col gap-2 xl:col-span-6">
              <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-label-md ${s.box}`}>
                <s.icon className="h-4 w-4" aria-hidden />
                {next.status === "valid" ? t("Мӯҳлати наздиктарин") : t("Диққат: мӯҳлат")}
              </span>
              <h2 className="text-headline-md md:text-headline-lg">{next.document_type_title}</h2>
              <p className="text-body-md text-on-surface-variant">
                {[next.region_name, next.number && `№ ${next.number}`].filter(Boolean).join(" • ")}
              </p>
              <p className="text-body-md">
                {t("Санаи анҷом")}: <strong>{date(next.expires_at)}</strong>
              </p>
            </div>
            <div className="flex items-center justify-center gap-4 rounded-xl bg-surface-container-low p-4 xl:col-span-3 xl:flex-col">
              <Ring days={next.days_left} pct={usedPercent(next)} tone={s.accent} />
              <StatusBadge doc={next} />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row xl:col-span-3 xl:flex-col">
              <Link to="/documents" className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-label-lg text-on-primary shadow-sm hover:bg-primary-container">
                {t("Ҳуҷҷатҳои ман")}
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
              {/patent/.test(types.find((x) => x.id === next.document_type)?.slug || "") && (
                <Link to={`/documents?pay=${next.id}`} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-label-lg text-on-secondary hover:bg-secondary-container">
                  <Wallet className="h-5 w-5" aria-hidden />
                  {t("Пардохтро сабт кардан")}
                </Link>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="card flex flex-col items-start gap-4 p-6 md:flex-row md:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary">
            <FilePlus2 className="h-6 w-6" aria-hidden />
          </div>
          <div className="flex-1">
            <h2 className="text-headline-sm">{t("Ҳуҷҷати аввалини худро илова кунед")}</h2>
            <p className="text-body-md text-on-surface-variant">{t("Мо пеш аз тамом шудани мӯҳлат ба почтаи шумо ёдрас мекунем.")}</p>
          </div>
          <Link to="/documents" className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-primary px-5 text-label-lg text-on-primary">
            <PlusCircle className="h-5 w-5" aria-hidden />
            {t("Илова кардан")}
          </Link>
        </section>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <QuickAction to="/documents" icon={PlusCircle} title={t("Ҳуҷҷат илова кардан")} text={t("Патент, бақайдгирӣ, суғурта")} tone="bg-primary-fixed text-primary" />
        <QuickAction to="/calculator" icon={Calculator} title={t("Нархи патент")} text={t("Аз рӯи минтақа")} tone="bg-secondary-fixed text-secondary" />
        <QuickAction to="/jobs" icon={Briefcase} title={t("Ҷустуҷӯи кор")} text={t("Бо манзил ва хӯрок")} tone="bg-tertiary-fixed text-tertiary" />
        <QuickAction to="/resume" icon={FileUser} title={t("Резюмеи ман")} text={t("Дар 2 дақиқа")} tone="bg-surface-container-high text-on-surface" />
      </section>

      {docs.length > 1 && (
        <section className="grid items-start gap-6 lg:grid-cols-12">
          <div className="card flex flex-col gap-4 p-4 md:p-6 lg:col-span-7">
            <div className="flex items-center justify-between">
              <h3 className="text-headline-sm">{t("Ҳолати ҳуҷҷатҳои ман")}</h3>
              <Link to="/documents" className="text-label-md text-primary hover:underline">{t("Ҳама ({0})", docs.length)}</Link>
            </div>
            {sorted.slice(0, 4).map((d) => {
              const Icon = docIcon(types.find((x) => x.id === d.document_type)?.slug);
              return (
                <Link key={d.id} to="/documents" className={`flex min-h-[56px] items-center justify-between gap-3 rounded-xl p-4 transition-colors ${d.status === "expired" ? "bg-error-container/40 hover:bg-error-container/60" : "bg-surface-container-low hover:bg-surface-container"}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <Icon className={`h-6 w-6 shrink-0 ${STATUS[d.status].accent}`} aria-hidden />
                    <div className="min-w-0">
                      <p className="truncate text-label-lg font-bold">{d.document_type_title}</p>
                      <p className="truncate text-body-sm text-on-surface-variant">{t("То {0}", date(d.expires_at))}</p>
                    </div>
                  </div>
                  <StatusBadge doc={d} className="hidden sm:inline-flex" />
                  <span className={`text-label-md sm:hidden ${STATUS[d.status].accent}`}>{daysText(d.days_left)}</span>
                </Link>
              );
            })}
          </div>
          <div className="flex min-h-[260px] flex-col justify-between rounded-2xl bg-gradient-to-br from-primary to-primary-container p-6 text-on-primary shadow-sm lg:col-span-5">
            <div>
              <BookOpen className="mb-3 h-7 w-7 opacity-80" aria-hidden />
              <h3 className="text-headline-sm font-bold">{t("Намедонед, аз куҷо сар кунед?")}</h3>
              <p className="mt-2 text-body-sm opacity-90">{t("Дар роҳнамо барои ҳар ҳуҷҷат қадамҳо, қоғазҳои лозимӣ ва нарх навишта шудааст.")}</p>
            </div>
            <Link to="/guides" className="mt-4 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-surface-container-lowest px-4 text-label-lg text-primary">
              {t("Роҳнаморо кушодан")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      )}

      <LatestJobsAndNews city={user.city} />
    </div>
  );
}

function EmployerHome({ user }) {
  const company = useApi(`/jobs/employers/?owner=${user.id}`);
  const employer = company.data?.results?.[0];
  const jobs = useApi(employer ? `/jobs/jobs/?employer=${employer.id}&is_active=true&page_size=1` : null);
  const fresh = useApi("/jobs/applications/?status=sent&page_size=1");

  return (
    <div className="flex flex-col gap-8">
      <section className="card flex flex-col justify-between gap-4 p-4 md:flex-row md:items-center md:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Building2 className="h-8 w-8" aria-hidden />
          </div>
          <div>
            <h1 className="text-headline-md">{employer?.name || t("Салом!")}</h1>
            <p className="text-body-md text-on-surface-variant">{employer ? employer.city : t("Профили ширкатро созед, то эълон гузоред.")}</p>
          </div>
        </div>
        {employer ? (
          employer.is_verified ? (
            <span className="inline-flex items-center gap-2 rounded-xl bg-tertiary-fixed px-4 py-2.5 text-label-md text-on-tertiary-fixed">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
              {t("Ширкат тасдиқ шудааст")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-xl bg-warning-fixed px-4 py-2.5 text-label-md text-on-warning-fixed">
              <ShieldAlert className="h-5 w-5" aria-hidden />
              {t("Дар санҷиши админ")}
            </span>
          )
        ) : (
          !company.loading && (
            <Link to="/company" className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-primary px-5 text-label-lg text-on-primary">
              <PlusCircle className="h-5 w-5" aria-hidden />
              {t("Ширкат сохтан")}
            </Link>
          )
        )}
      </section>

      {employer?.is_blacklisted && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl bg-error-container p-4 text-on-error-container md:p-6">
          <ShieldAlert className="h-6 w-6 shrink-0 text-error" aria-hidden />
          <div>
            <p className="font-bold">{t("Ширкати шумо дар рӯйхати сиёҳ аст")}</p>
            <p className="text-body-sm">{employer.blacklist_reason}</p>
          </div>
        </div>
      )}

      <section className="grid grid-cols-2 gap-4">
        <div className="card p-4 md:p-6">
          <p className="text-body-sm text-on-surface-variant">{t("Эълонҳои фаъол")}</p>
          <p className="text-headline-xl text-primary">{jobs.data?.count ?? (employer ? "…" : 0)}</p>
        </div>
        <div className="card p-4 md:p-6">
          <p className="text-body-sm text-on-surface-variant">{t("Аризаҳои нав")}</p>
          <p className="text-headline-xl text-secondary">{fresh.data?.count ?? "…"}</p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <QuickAction to="/my-jobs" icon={PlusCircle} title={t("Эълони нав")} text={t("Коргар ёбед")} tone="bg-primary-fixed text-primary" />
        <QuickAction to="/inbox" icon={Inbox} title={t("Аризаҳо")} text={t("Ҷавоб диҳед")} tone="bg-secondary-fixed text-secondary" />
        <QuickAction to="/resumes" icon={Users} title={t("Резюмеҳо")} text={t("Коргарони омода")} tone="bg-tertiary-fixed text-tertiary" />
        <QuickAction to="/company" icon={ClipboardList} title={t("Ширкати ман")} text={t("Маълумот ва тасдиқ")} tone="bg-surface-container-high text-on-surface" />
      </section>
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();
  if (loading) return <Skeleton className="h-64" />;
  if (!user) return <GuestHome />;
  if (user.role === "employer") return <EmployerHome user={user} />;
  return <MigrantHome user={user} />;
}
