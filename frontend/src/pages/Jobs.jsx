import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BedDouble, Briefcase, FileCheck2, MapPin, PhoneCall, Search, ShieldAlert, ShieldCheck, Soup } from "lucide-react";
import { api } from "../api.js";
import { useApi } from "../hooks.js";
import { t } from "../i18n.js";
import { INDUSTRIES } from "../constants.js";
import ApplyDrawer from "../components/ApplyDrawer.jsx";
import { JobRow } from "../components/JobCard.jsx";
import { Button, EmptyState, ErrorBox, PageHeader, Skeleton } from "../components/ui.jsx";

const TOGGLES = [
  ["housing_provided", BedDouble, () => t("Манзил медиҳанд")],
  ["meals_provided", Soup, () => t("Хӯрок медиҳанд")],
  ["helps_with_documents", FileCheck2, () => t("Ёрӣ бо ҳуҷҷатҳо")],
];

function Blacklist() {
  const { data } = useApi("/jobs/employers/?is_blacklisted=true&page_size=5");
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-error-container p-4 shadow-sm md:p-6" id="blacklist">
      <div className="flex items-center gap-2 text-on-error-container">
        <ShieldAlert className="h-7 w-7 shrink-0 text-error" aria-hidden />
        <div>
          <h2 className="text-headline-sm font-bold text-error">{t("Рӯйхати сиёҳи корфармоён")}</h2>
          <p className="text-body-sm">{t("Ширкатҳое, ки админ аз рӯи шикоятҳо санҷидааст")}</p>
        </div>
      </div>
      {data?.results?.length ? (
        data.results.map((e) => (
          <Link key={e.id} to={`/employers/${e.id}`} className="flex flex-col gap-1.5 rounded-lg bg-surface-container-lowest p-4 shadow-sm hover:shadow-md">
            <div className="flex items-center justify-between gap-2">
              <span className="text-label-lg font-bold text-error">{e.name}</span>
              <span className="rounded bg-error-container px-2 py-0.5 text-label-sm text-error">{t("ХАТАР")}</span>
            </div>
            <span className="font-mono text-body-sm text-on-surface-variant">
              {[e.inn && `ИНН: ${e.inn}`, e.city].filter(Boolean).join(" • ")}
            </span>
            {e.blacklist_reason && (
              <p className="rounded bg-surface-container-low p-2 text-body-sm text-on-surface-variant">
                <strong>{t("Сабаб")}:</strong> {e.blacklist_reason}
              </p>
            )}
          </Link>
        ))
      ) : (
        <p className="rounded-lg bg-surface-container-lowest p-4 text-body-sm text-on-surface-variant">{t("Ҳоло дар рӯйхати сиёҳ ширкат нест.")}</p>
      )}
      <p className="text-body-sm text-on-error-container">
        {t("Агар корфармо маош надода бошад, дар саҳифаи ӯ шарҳ нависед ва «Маош надоданд»-ро қайд кунед. Админ шикоятҳоро месанҷад.")}
      </p>
    </div>
  );
}

function HowWeVerify() {
  return (
    <div className="card flex flex-col gap-3 p-4 md:p-6">
      <h2 className="flex items-center gap-2 text-headline-sm">
        <ShieldCheck className="h-6 w-6 text-primary" aria-hidden />
        {t("Мо чӣ тавр месанҷем")}
      </h2>
      {[t("Админ ИНН ва маълумоти ширкатро месанҷад ва баъд нишони «Тасдиқшуда» медиҳад."), t("Коргарон ба корфармо баҳо ва шарҳ медиҳанд."), t("Ширкатҳое, ки маош намедиҳанд, ба рӯйхати сиёҳ мераванд ва эълонашон пинҳон мешавад.")].map((text, i) => (
        <div key={text} className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-sm text-on-primary-fixed">{i + 1}</span>
          <p className="text-body-sm text-on-surface-variant">{text}</p>
        </div>
      ))}
    </div>
  );
}

export default function Jobs() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") || "");
  const [city, setCity] = useState(params.get("city") || "");
  const [page, setPage] = useState({ results: [], count: 0, next: null });
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState(null);
  const [applying, setApplying] = useState(null);

  const query = params.toString();
  const update = (key, value) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  };

  // Typing in the search and city boxes updates the list half a second after the last key.
  useEffect(() => {
    const id = setTimeout(() => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of [["search", search.trim()], ["city", city.trim()]]) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          return next;
        },
        { replace: true },
      );
    }, 500);
    return () => clearTimeout(id);
  }, [search, city, setParams]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const q = new URLSearchParams(query);
    if (!q.get("ordering")) q.set("ordering", "-created_at");
    api(`/jobs/jobs/?${q}`)
      .then((data) => alive && setPage(data))
      .catch((err) => alive && setError(err))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [query]);

  const loadMore = async () => {
    setMore(true);
    try {
      const data = await api(page.next.slice(page.next.indexOf("/api") + 4));
      setPage((p) => ({ ...data, results: [...p.results, ...data.results] }));
    } catch (err) {
      setError(err);
    } finally {
      setMore(false);
    }
  };

  const activeIndustry = params.get("industry");
  const ordering = params.get("ordering") || "-created_at";
  // Promoted (paid) jobs first, keeping the chosen order inside each group.
  const promoted = (j) => (j.promoted_until && new Date(j.promoted_until) > new Date() ? 0 : 1);
  const jobs = [...page.results].sort((a, b) => promoted(a) - promoted(b));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t("Корфармоёни санҷидашуда")} title={t("Ҷойи кор")} text={t("Пеш аз ариза додан баҳои ширкат ва рӯйхати сиёҳро бинед.")}>
        <a href="#blacklist" className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-label-lg text-on-secondary shadow-sm hover:bg-secondary-container">
          <ShieldAlert className="h-5 w-5" aria-hidden />
          {t("Рӯйхати сиёҳ")}
        </a>
      </PageHeader>

      <div className="card flex flex-col gap-4 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-12">
          <label className="md:col-span-8">
            <span className="label flex items-center gap-1 text-on-surface-variant">
              <Search className="h-4 w-4 text-primary" aria-hidden />
              {t("Касб ё калимаи калидӣ")}
            </span>
            <input className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("Масалан: кафшергар, ронанда, анбор")} />
          </label>
          <label className="md:col-span-4">
            <span className="label flex items-center gap-1 text-on-surface-variant">
              <MapPin className="h-4 w-4 text-primary" aria-hidden />
              {t("Шаҳр")}
            </span>
            <input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("Масалан: Москва")} list="cities" />
            <datalist id="cities">
              {["Москва", "Санкт-Петербург", "Екатеринбург", "Новосибирск", "Казань", "Краснодар", "Самара"].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-label-md text-on-surface-variant">{t("Соҳа")}:</span>
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <button type="button" onClick={() => update("industry", "")} aria-pressed={!activeIndustry} className={`min-h-[44px] shrink-0 whitespace-nowrap rounded-lg px-4 text-label-md ${!activeIndustry ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"}`}>
              {t("Ҳама соҳаҳо")}
            </button>
            {INDUSTRIES.map((i) => (
              <button key={i.value} type="button" onClick={() => update("industry", activeIndustry === i.value ? "" : i.value)} aria-pressed={activeIndustry === i.value} className={`flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-label-md ${activeIndustry === i.value ? "bg-primary text-on-primary shadow-sm" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"}`}>
                <i.icon className="h-4 w-4" aria-hidden />
                {i.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-lg bg-surface-container-low/60 p-3 lg:flex-row lg:items-center">
          <div className="flex flex-wrap gap-2">
            {TOGGLES.map(([key, Icon, label]) => (
              <label key={key} className="flex min-h-[48px] cursor-pointer items-center gap-2.5 rounded-lg bg-surface-container-lowest px-3 shadow-sm">
                <input type="checkbox" className="h-5 w-5 rounded text-primary focus:ring-primary" checked={params.get(key) === "true"} onChange={(e) => update(key, e.target.checked ? "true" : "")} />
                <Icon className="h-4 w-4 text-primary" aria-hidden />
                <span className="text-label-md">{label()}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2 self-end lg:self-center">
            <span className="text-label-sm uppercase text-on-surface-variant">{t("Тартиб")}:</span>
            <div className="inline-flex rounded-lg bg-surface-container-highest p-1">
              {[
                ["-created_at", t("Навтаринҳо")],
                ["-salary_to", t("Маоши баланд")],
              ].map(([value, label]) => (
                <button key={value} type="button" onClick={() => update("ordering", value === "-created_at" ? "" : value)} aria-pressed={ordering === value} className={`min-h-[40px] rounded-lg px-3 text-label-md ${ordering === value ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-12">
        <div className="flex flex-col gap-4 xl:col-span-8">
          <div className="flex items-center gap-2 px-1">
            <h2 className="text-headline-sm">{t("Ҷойҳои кории фаъол")}</h2>
            {!loading && <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-label-sm text-primary">{t("{0} ҷой", page.count)}</span>}
          </div>
          <ErrorBox error={error} />
          {loading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-56" />)
          ) : jobs.length === 0 ? (
            <EmptyState icon={Briefcase} title={t("Чунин ҷойи кор ёфт нашуд")} text={t("Филтрҳоро кам кунед ё шаҳри дигарро нависед.")} />
          ) : (
            <>
              <div className="flex flex-col divide-y divide-surface-container rounded-3xl bg-surface-container-lowest p-2 shadow-sm md:p-3">
                {jobs.map((job) => (
                  <JobRow key={job.id} job={job} onApply={setApplying} />
                ))}
              </div>
              {page.next && (
                <Button variant="soft" loading={more} onClick={loadMore} className="self-center">
                  {t("Боз нишон додан")}
                </Button>
              )}
            </>
          )}
        </div>
        <aside className="grid gap-4 md:grid-cols-2 xl:col-span-4 xl:flex xl:flex-col">
          <Blacklist />
          <HowWeVerify />
          <Link to="/help" className="flex flex-col gap-2 rounded-2xl bg-banner p-4 text-white shadow-sm transition-shadow hover:shadow-md md:p-6">
            <span className="flex items-center gap-2">
              <PhoneCall className="h-6 w-6" aria-hidden />
              <span className="text-headline-sm font-bold">{t("Хати ёрӣ барои муҳоҷирон")}</span>
            </span>
            <span className="text-body-sm text-on-navy">{t("Агар дар ҷойи кор мушкил пеш ояд, бо ҳуқуқшинос маслиҳат кунед.")}</span>
            <span className="inline-flex min-h-[44px] items-center justify-center self-start rounded-xl bg-surface-container-lowest px-4 text-label-md text-primary">{t("Рақамҳо ва савол ба ҳуқуқшинос")}</span>
          </Link>
        </aside>
      </div>

      <ApplyDrawer job={applying} onClose={() => setApplying(null)} />
    </div>
  );
}
