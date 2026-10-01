import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, Clock, FilePlus2, LayoutList, Mail, ReceiptText, SearchCheck, ShieldCheck, XCircle } from "lucide-react";
import { useDocuments } from "../hooks.js";
import { t } from "../i18n.js";
import { date, monthTitle } from "../format.js";
import DocCard from "../components/DocCard.jsx";
import DocForm from "../components/DocForm.jsx";
import PaymentDrawer from "../components/PaymentDrawer.jsx";
import { Stagger, StaggerItem } from "../components/motion.jsx";
import { Button, EmptyState, ErrorBox, PageHeader, STATUS, Skeleton, StatusBadge } from "../components/ui.jsx";

const FILTERS = [
  { key: "all", label: () => t("Ҳама") },
  { key: "expiring", label: () => t("Наздик ба анҷом"), icon: Clock, tone: "text-warning" },
  { key: "expired", label: () => t("Мӯҳлат гузашта"), icon: XCircle, tone: "text-error" },
  { key: "valid", label: () => t("Эътибор дорад"), icon: CheckCircle2, tone: "text-tertiary" },
];

function Calendar({ docs, onEdit }) {
  // Grouped by month of the end date, nearest first.
  const months = useMemo(() => {
    const groups = new Map();
    [...docs].sort((a, b) => a.expires_at.localeCompare(b.expires_at)).forEach((d) => {
      const key = d.expires_at.slice(0, 7);
      groups.set(key, [...(groups.get(key) || []), d]);
    });
    return [...groups.entries()];
  }, [docs]);

  return (
    <div className="card flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-6 w-6 text-primary" aria-hidden />
        <h2 className="text-headline-sm">{t("Тақвими мӯҳлатҳо")}</h2>
      </div>
      {months.map(([month, list]) => (
        <section key={month}>
          <h3 className="mb-3 text-label-lg capitalize text-on-surface-variant">
            {monthTitle(month)}
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            {list.map((d) => (
              <button key={d.id} type="button" onClick={() => onEdit(d)} className={`flex flex-col justify-between gap-3 rounded-xl p-4 text-left ${STATUS[d.status].box}`}>
                <div>
                  <span className="text-label-sm uppercase">{date(d.expires_at)}</span>
                  <p className="mt-1 text-headline-sm">{t(d.document_type_title)}</p>
                  {d.region_name && <p className="text-body-sm opacity-80">{d.region_name}</p>}
                </div>
                <StatusBadge doc={d} className="self-start bg-surface-container-lowest/60" />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const SERVICES = [
  { to: "/profile", icon: Mail, title: () => t("Ёдраскунӣ ба почта"), text: () => t("Пеш аз анҷоми мӯҳлат мактуб меояд. Дар профил фаъол ё хомӯш кунед.") },
  { to: "/help", icon: BookOpen, title: () => t("Сайтҳои расмӣ"), text: () => t("Қоидаҳои патент ва қонунҳои Русияро дар сайтҳои расмӣ хонед.") },
  { to: "/payments", icon: ReceiptText, title: () => t("Архиви чекҳо"), text: () => t("Ҳамаи чекҳои пардохт дар як ҷо нигоҳ дошта мешаванд.") },
];

export default function Documents() {
  const { docs, types, regions, loading, error, reload } = useDocuments();
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("list");
  const [editing, setEditing] = useState(null);
  const [paying, setPaying] = useState(null);
  const [params, setParams] = useSearchParams();

  // /documents?pay=<id> (from the home page or the calculator) opens the payment form for that document.
  useEffect(() => {
    const id = Number(params.get("pay"));
    const doc = id && docs.find((d) => d.id === id);
    if (doc) {
      setPaying(doc);
      setParams({}, { replace: true });
    }
  }, [params, docs, setParams]);

  const priceOf = (doc) => Number(regions.find((r) => r.id === doc?.region)?.patent_monthly_price || 0);

  const slugOf = (doc) => types.find((x) => x.id === doc.document_type)?.slug;
  const counts = { all: docs.length, expiring: 0, expired: 0, valid: 0 };
  docs.forEach((d) => (counts[d.status] += 1));
  // Most urgent first: expired, then ending soon, then the rest by end date.
  const order = { expired: 0, expiring: 1, valid: 2 };
  const shown = docs.filter((d) => filter === "all" || d.status === filter).sort((a, b) => order[a.status] - order[b.status] || a.expires_at.localeCompare(b.expires_at));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t("Муҳоҷирати бехатар")} title={t("Ҳуҷҷатҳои ман")} text={t("Ҳуҷҷатҳоро сари вақт нав кунед ва аз ҷарима ва ихроҷ эмин бошед.")}>
        <Button variant="accent" icon={FilePlus2} onClick={() => setEditing({})}>{t("Ҳуҷҷати нав")}</Button>
      </PageHeader>

      <div className="card flex flex-col items-start justify-between gap-4 bg-surface-container-high p-4 md:flex-row md:items-center md:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <p className="text-headline-sm">{t("Назорати мӯҳлатҳо фаъол аст")}</p>
            <p className="text-body-sm text-on-surface-variant">
              {counts.expired + counts.expiring > 0
                ? t("{0} ҳуҷҷат диққатро талаб мекунад.", counts.expired + counts.expiring)
                : t("Пеш аз тамом шудани мӯҳлат ба почтаи шумо ёдраскунӣ меояд.")}
            </p>
          </div>
        </div>
        <Link to="/checks" className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-surface-container-lowest px-4 text-label-md text-primary shadow-sm hover:bg-surface">
          <SearchCheck className="h-4 w-4" aria-hidden />
          {t("Санҷиш дар сайтҳои расмӣ")}
        </Link>
      </div>


      <div className="card flex flex-col items-stretch justify-between gap-2 p-1 xl:flex-row xl:items-center">
        <div className="no-scrollbar flex gap-1 overflow-x-auto p-1" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg px-4 text-label-md transition-colors ${filter === f.key ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"}`}
            >
              {f.icon && <f.icon className={`h-4 w-4 ${filter === f.key ? "" : f.tone}`} aria-hidden />}
              {f.label()}
              <span className={`rounded-full px-1.5 text-label-sm ${filter === f.key ? "bg-on-primary/20" : "bg-surface-container"}`}>{counts[f.key]}</span>
            </button>
          ))}
        </div>
        <div className="flex shrink-0 gap-1 self-end rounded-lg bg-surface-container-low p-1 xl:self-auto">
          {[
            ["list", LayoutList, t("Рӯйхат")],
            ["calendar", CalendarDays, t("Тақвим")],
          ].map(([key, Icon, label]) => (
            <button key={key} type="button" onClick={() => setView(key)} aria-pressed={view === key} className={`flex min-h-[40px] items-center gap-1 rounded px-3 text-label-md ${view === key ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant"}`}>
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>

      <ErrorBox error={error} />
      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : docs.length === 0 ? (
        <EmptyState icon={FilePlus2} title={t("Ҳуҷҷати аввалини худро илова кунед")} text={t("Патент, бақайдгирӣ, корти муҳоҷиратӣ ё суғуртаро илова кунед, то мо пеш аз тамом шудани мӯҳлат ёдрас кунем.")}>
          <Button icon={FilePlus2} onClick={() => setEditing({})}>{t("Ҳуҷҷат илова кардан")}</Button>
        </EmptyState>
      ) : view === "calendar" ? (
        <Calendar docs={shown} onEdit={setEditing} />
      ) : shown.length === 0 ? (
        <EmptyState icon={CheckCircle2} title={t("Дар ин бахш ҳуҷҷат нест")} />
      ) : (
        <Stagger key={filter} className="grid gap-6 lg:grid-cols-2">
          {shown.map((d) => (
            <StaggerItem key={d.id} className="flex">
              <DocCard doc={d} slug={slugOf(d)} onEdit={setEditing} onPay={setPaying} />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {SERVICES.map((s) => (
          <Link key={s.to} to={s.to} className="card flex flex-col gap-3 p-4 transition-shadow hover:shadow-md md:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container text-primary">
                <s.icon className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h3 className="text-headline-sm">{s.title()}</h3>
                <p className="mt-1 text-body-sm text-on-surface-variant">{s.text()}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 self-end text-label-md text-primary">
              {t("Кушодан")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </Link>
        ))}
      </div>

      <DocForm
        doc={editing}
        types={types}
        regions={regions}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />
      <PaymentDrawer
        doc={paying}
        monthlyPrice={priceOf(paying)}
        onClose={() => setPaying(null)}
        onSaved={() => {
          setPaying(null);
          reload();
        }}
      />
    </div>
  );
}
