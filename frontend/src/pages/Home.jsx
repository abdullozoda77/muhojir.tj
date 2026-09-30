import { Link } from "react-router-dom";
import {
  ArrowRight, BadgeCheck, BookOpen, Briefcase, CheckCircle2, ClipboardList, Clock, FilePlus2, Inbox, Newspaper, Plus,
  PlusCircle, ShieldAlert, Users, Wallet,
} from "lucide-react";
import { useAuth } from "../auth.jsx";
import { useApi } from "../hooks.js";
import { t } from "../i18n.js";
import { date, todayTitle, usedPercent } from "../format.js";
import { JobRow } from "../components/JobCard.jsx";
import Pattern, { Hero, Overlap } from "../components/Pattern.jsx";
import { useDocuments } from "./Documents.jsx";
import { STATUS, Skeleton, statusText } from "../components/ui.jsx";

const LIFTED = "shadow-[0_20px_40px_-20px_rgba(13,47,115,0.35)]";

function Ring({ days, pct, tone, size = 132 }) {
  const small = size < 120;
  const stroke = small ? 8 : 11;
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="h-full w-full -rotate-90" viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-surface-container" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - (pct ?? 100) / 100)} className={tone} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={`font-display font-bold leading-none ${small ? "text-[28px]" : "text-[42px]"}`}>{Math.abs(days)}</span>
        <span className={`mt-1 text-on-surface-variant ${small ? "text-[11px] leading-3" : "text-body-sm"}`}>{days < 0 ? t("рӯз пеш") : t("рӯз монд")}</span>
      </div>
    </div>
  );
}

// Colored bar on top: red expired, amber ending soon, green valid.
const TILE_BAR = { expired: "border-t-error", expiring: "border-t-warning-container", valid: "border-t-tertiary-container" };

function DocTile({ doc }) {
  return (
    <Link to="/documents" className={`flex flex-col gap-2 rounded-[20px] border-t-[5px] bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md ${TILE_BAR[doc.status]}`}>
      <span className={`text-label-md ${STATUS[doc.status].accent}`}>{statusText(doc)}</span>
      <span className="text-body-lg font-semibold">{doc.document_type_title}</span>
      <span className="text-body-sm text-on-surface-variant">{t("то {0}", date(doc.expires_at))}</span>
    </Link>
  );
}

function SectionHead({ title, to, linkText }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3 px-3">
      <h2 className="font-display text-headline-md font-bold md:text-[28px] md:leading-9">{title}</h2>
      {to && (
        <Link to={to} className="inline-flex min-h-[44px] shrink-0 items-center gap-1 text-label-lg text-primary hover:underline">
          {linkText}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

// Newest jobs in the user's city (or anywhere, when there are none there), as compact rows.
function JobsPanel({ city }) {
  const cityJobs = useApi(city ? `/jobs/jobs/?city=${encodeURIComponent(city)}&page_size=4` : null);
  const anyJobs = useApi(!city || (cityJobs.data && cityJobs.data.count === 0) ? "/jobs/jobs/?page_size=4" : null);
  const jobs = cityJobs.data?.count ? cityJobs.data : anyJobs.data;
  return (
    <section className="rounded-3xl bg-surface-container-lowest p-4 shadow-sm md:p-6">
      <SectionHead title={cityJobs.data?.count ? t("Кори нав дар {0}", city) : t("Ҷойҳои кории нав")} to="/jobs" linkText={t("Ҳамаи ҷойҳо")} />
      {cityJobs.loading || anyJobs.loading ? (
        <Skeleton className="h-48" />
      ) : jobs?.results?.length ? (
        <div className="flex flex-col divide-y divide-surface-container">
          {jobs.results.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <p className="px-3 py-6 text-body-md text-on-surface-variant">{t("Ҳоло эълони кор нест. Ба наздикӣ илова мешавад.")}</p>
      )}
    </section>
  );
}

function CalculatorPromo() {
  return (
    <Link to="/calculator" className="relative flex flex-col gap-2 overflow-hidden rounded-3xl bg-navy p-6 text-white transition-shadow hover:shadow-lg md:p-7">
      <Pattern opacity={0.12} />
      <span className="relative text-label-md uppercase tracking-wider text-navy-muted">{t("Калкулятор")}</span>
      <span className="relative font-display text-[26px] font-bold leading-8">{t("Нархи патент дар минтақаи шумо чанд аст?")}</span>
      <span className="relative mt-2 inline-flex items-center gap-1 text-body-md text-on-navy">
        {t("Минтақа ва моҳҳоро интихоб кунед")}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </span>
    </Link>
  );
}

function NewsPanel() {
  const news = useApi("/documents/news/?page_size=3");
  if (!news.data?.results?.length) return null;
  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-surface-container-lowest p-6 shadow-sm">
      <h2 className="flex items-center gap-2 font-display text-headline-md font-bold">
        <Newspaper className="h-5 w-5 text-secondary" aria-hidden />
        {t("Хабарҳои қонун")}
      </h2>
      {news.data.results.map((n) => (
        <Link key={n.id} to={`/news/${n.id}`} className="flex flex-col gap-1 hover:text-primary">
          <span className="text-label-sm text-secondary">{date(n.published_at || n.created_at)}</span>
          <span className="text-body-lg font-semibold leading-snug">{n.title}</span>
        </Link>
      ))}
      <Link to="/guides#news" className="inline-flex items-center gap-1 text-label-md text-primary">
        {t("Ҳамаи хабарҳо")}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </section>
  );
}

function JobsAndSide({ city }) {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1.55fr_1fr]">
      <JobsPanel city={city} />
      <div className="flex flex-col gap-6">
        <CalculatorPromo />
        <NewsPanel />
      </div>
    </div>
  );
}

function GuestHome() {
  return (
    <div className="flex flex-col gap-7">
      <Hero eyebrow={t("Барои муҳоҷирони тоҷик дар Русия")} title={t("Ҳуҷҷатҳо сари вақт. Кори боэътимод.")} text={t("Мӯҳлати патент ва бақайдгириро фаромӯш накунед, нархи патентро ҳисоб кунед ва корро аз корфармоёни санҷидашуда ёбед. Ҳамааш бепул ва бо забони тоҷикӣ.")} tall>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link to="/login" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-secondary px-6 text-label-lg text-on-secondary shadow-sm hover:bg-secondary-container">
            {t("Оғоз кардан — бепул")}
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
          <Link to="/jobs" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white/10 px-6 text-label-lg ring-1 ring-white/30 hover:bg-white/20">
            <Briefcase className="h-5 w-5" aria-hidden />
            {t("Кор ҷустан")}
          </Link>
        </div>
      </Hero>
      <Overlap>
        <section className="grid gap-4 md:grid-cols-3">
          {[
            [ShieldAlert, t("Ёдраскунии мӯҳлатҳо"), t("Пеш аз тамом шудани патент, бақайдгирӣ ва суғурта ба почта ва Telegram хабар меояд."), "border-t-secondary", "text-secondary"],
            [BookOpen, t("Роҳнамои қадам ба қадам"), t("Чӣ бояд кард, чӣ бурдан лозим ва чанд пул аст — бо забони содда."), "border-t-primary-container", "text-primary"],
            [BadgeCheck, t("Корфармоёни тасдиқшуда"), t("Шарҳи коргарон ва рӯйхати сиёҳи ширкатҳое, ки маош намедиҳанд."), "border-t-tertiary-container", "text-tertiary"],
          ].map(([Icon, title, text, bar, tone]) => (
            <div key={title} className={`flex flex-col gap-3 rounded-[20px] border-t-[5px] bg-surface-container-lowest p-6 ${LIFTED} ${bar}`}>
              <Icon className={`h-7 w-7 ${tone}`} aria-hidden />
              <h2 className="font-display text-headline-sm font-bold">{title}</h2>
              <p className="text-body-md text-on-surface-variant">{text}</p>
            </div>
          ))}
        </section>
        <JobsAndSide />
      </Overlap>
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
  const isPatent = next && /patent/.test(types.find((x) => x.id === next.document_type)?.slug || "");

  const summary = loading
    ? ""
    : needAttention
      ? t("{0} ҳуҷҷат диққати шуморо талаб мекунад.", needAttention)
      : docs.length
        ? t("Ҳамаи ҳуҷҷатҳо тартиб аст. Мо пеш аз мӯҳлат хабар медиҳем.")
        : t("Ҳуҷҷатҳои худро илова кунед — мо мӯҳлатҳоро назорат мекунем.");

  return (
    <div className="flex flex-col gap-7">
      <Hero eyebrow={todayTitle()} title={firstName ? t("Салом, {0}!", firstName) : t("Салом!")} text={summary} tall />
      <Overlap>
        {loading ? (
          <Skeleton className="h-48" />
        ) : next ? (
          <article className={`grid items-center gap-6 rounded-3xl bg-surface-container-lowest p-6 md:p-8 xl:grid-cols-[1fr_auto_260px] xl:gap-8 ${LIFTED}`}>
            {/* Phones: the small ring beside the title. Wide screens: the big ring in its own column. */}
            <div className="flex items-center gap-5">
              <div className="xl:hidden">
                <Ring days={next.days_left} pct={usedPercent(next)} tone={s.accent} size={96} />
              </div>
              <div className="flex min-w-0 flex-col gap-2.5">
                <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-label-md ${s.box}`}>
                  <Clock className="h-4 w-4" aria-hidden />
                  {next.status === "expired" ? t("Мӯҳлат гузашт") : t("Мӯҳлати наздиктарин")}
                </span>
                <h2 className="font-display text-[26px] font-bold leading-8 md:text-[34px] md:leading-10">{next.document_type_title}</h2>
                <p className="text-body-md text-on-surface-variant">
                  {[next.region_name, next.number && `№ ${next.number}`, t("то {0}", date(next.expires_at))].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <div className="hidden justify-center xl:flex">
              <Ring days={next.days_left} pct={usedPercent(next)} tone={s.accent} />
            </div>
            <div className="flex flex-col gap-2.5">
              {isPatent && (
                <Link to={`/documents?pay=${next.id}`} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-secondary px-4 text-label-lg text-on-secondary hover:bg-secondary-container">
                  <Wallet className="h-5 w-5" aria-hidden />
                  {t("Пардохтро сабт кардан")}
                </Link>
              )}
              <Link to="/documents" className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-surface-container-low px-4 text-label-lg text-primary hover:bg-surface-container">
                {t("Ҳамаи ҳуҷҷатҳо")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </article>
        ) : (
          <article className={`flex flex-col items-start gap-4 rounded-3xl bg-surface-container-lowest p-6 md:flex-row md:items-center md:p-8 ${LIFTED}`}>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
              <FilePlus2 className="h-7 w-7" aria-hidden />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-headline-md font-bold">{t("Ҳуҷҷати аввалини худро илова кунед")}</h2>
              <p className="text-body-md text-on-surface-variant">{t("Мо пеш аз тамом шудани мӯҳлат ба почта ва Telegram ёдрас мекунем.")}</p>
            </div>
            <Link to="/documents" className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-primary px-6 text-label-lg text-on-primary">
              <PlusCircle className="h-5 w-5" aria-hidden />
              {t("Илова кардан")}
            </Link>
          </article>
        )}

        {docs.length > 0 && (
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label={t("Ҳолати ҳуҷҷатҳо")}>
            {sorted.slice(1, 4).map((d) => (
              <DocTile key={d.id} doc={d} />
            ))}
            <Link to="/documents" className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-[20px] border-2 border-dashed border-outline-variant p-5 text-center text-label-lg text-primary hover:bg-surface-container-lowest">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed">
                <Plus className="h-5 w-5" aria-hidden />
              </span>
              {t("Ҳуҷҷат илова кардан")}
            </Link>
          </section>
        )}

        <JobsAndSide city={user.city} />
      </Overlap>
    </div>
  );
}

function EmployerHome({ user }) {
  const company = useApi(`/jobs/employers/?owner=${user.id}`);
  const employer = company.data?.results?.[0];
  const jobs = useApi(employer ? `/jobs/jobs/?employer=${employer.id}&is_active=true&page_size=1` : null);
  const fresh = useApi("/jobs/applications/?status=sent&page_size=1");

  const status = !employer
    ? null
    : employer.is_blacklisted
      ? { text: t("Ширкати шумо дар рӯйхати сиёҳ аст"), box: "bg-error-container text-on-error-container", icon: ShieldAlert }
      : employer.is_verified
        ? { text: t("Ширкат тасдиқ шудааст"), box: "bg-tertiary-fixed text-on-tertiary-fixed", icon: CheckCircle2 }
        : { text: t("Дар санҷиши админ"), box: "bg-warning-fixed text-on-warning-fixed", icon: Clock };

  return (
    <div className="flex flex-col gap-7">
      <Hero eyebrow={todayTitle()} title={employer?.name || t("Салом!")} text={employer ? employer.city : t("Профили ширкатро созед, то эълон гузоред.")} tall>
        {status && (
          <span className={`mt-3 inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-label-md ${status.box}`}>
            <status.icon className="h-4 w-4" aria-hidden />
            {status.text}
          </span>
        )}
        {!employer && !company.loading && (
          <Link to="/company" className="mt-4 inline-flex min-h-[52px] w-fit items-center gap-2 rounded-2xl bg-secondary px-6 text-label-lg text-on-secondary">
            <PlusCircle className="h-5 w-5" aria-hidden />
            {t("Ширкат сохтан")}
          </Link>
        )}
      </Hero>
      <Overlap>
        <section className="grid grid-cols-2 gap-4">
          <div className={`rounded-3xl bg-surface-container-lowest p-6 ${LIFTED}`}>
            <p className="text-body-md text-on-surface-variant">{t("Эълонҳои фаъол")}</p>
            <p className="font-display text-[44px] font-bold text-primary">{jobs.data?.count ?? (employer ? "…" : 0)}</p>
          </div>
          <div className={`rounded-3xl bg-surface-container-lowest p-6 ${LIFTED}`}>
            <p className="text-body-md text-on-surface-variant">{t("Аризаҳои нав")}</p>
            <p className="font-display text-[44px] font-bold text-secondary">{fresh.data?.count ?? "…"}</p>
          </div>
        </section>
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ["/my-jobs", PlusCircle, t("Эълони нав"), t("Коргар ёбед"), "border-t-primary-container", "text-primary"],
            ["/inbox", Inbox, t("Аризаҳо"), t("Ҷавоб диҳед"), "border-t-secondary", "text-secondary"],
            ["/resumes", Users, t("Резюмеҳо"), t("Коргарони омода"), "border-t-tertiary-container", "text-tertiary"],
            ["/company", ClipboardList, t("Ширкати ман"), t("Маълумот ва тасдиқ"), "border-t-navy", "text-navy"],
          ].map(([to, Icon, title, text, bar, tone]) => (
            <Link key={to} to={to} className={`flex min-h-[140px] flex-col justify-between gap-3 rounded-[20px] border-t-[5px] bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md ${bar}`}>
              <Icon className={`h-7 w-7 ${tone}`} aria-hidden />
              <span>
                <span className="block text-label-lg font-bold">{title}</span>
                <span className="text-body-sm text-on-surface-variant">{text}</span>
              </span>
            </Link>
          ))}
        </section>
      </Overlap>
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
