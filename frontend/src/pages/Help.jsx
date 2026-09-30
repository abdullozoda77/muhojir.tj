import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Flag, Gavel, MessageCircleQuestion, Phone, Scale, Send, ShieldCheck } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { useApi } from "../hooks.js";
import { t } from "../i18n.js";
import { date } from "../format.js";
import { Button, ErrorBox, PageHeader, Skeleton } from "../components/ui.jsx";

const KINDS = {
  embassy: { label: () => t("Сафорат ва консулгарӣ"), icon: Flag },
  hotline: { label: () => t("Хатҳои ёрӣ"), icon: Phone },
  lawyer: { label: () => t("Ҳуқуқшиносон"), icon: Scale },
  mvd_check: { label: () => t("Санҷиши расмӣ"), icon: ShieldCheck },
  other: { label: () => t("Дигар"), icon: MessageCircleQuestion },
};

const QUESTION_STATUS = {
  new: { label: () => t("Интизори ҷавоб"), box: "bg-warning-fixed text-on-warning-fixed" },
  answered: { label: () => t("Ҷавоб дода шуд"), box: "bg-tertiary-fixed text-on-tertiary-fixed" },
  closed: { label: () => t("Пӯшида"), box: "bg-surface-container-high text-on-surface" },
};

function Contacts() {
  const { data, loading } = useApi("/help/contacts/?page_size=100");
  const list = data?.results || [];
  if (loading) return <Skeleton className="h-40" />;
  if (!list.length) return <p className="card p-6 text-body-md text-on-surface-variant">{t("Рақамҳои ёрӣ ба наздикӣ аз ҷониби админ илова мешаванд.")}</p>;
  return Object.entries(KINDS)
    .filter(([kind]) => list.some((c) => c.kind === kind))
    .map(([kind, info]) => (
      <section key={kind} className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-headline-sm">
          <info.icon className="h-5 w-5 text-secondary" aria-hidden />
          {info.label()}
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {list
            .filter((c) => c.kind === kind)
            .map((c) => (
              <article key={c.id} className="card flex flex-col gap-2 p-4">
                <h3 className="text-label-lg">{c.title}</h3>
                {c.region_name && <p className="text-body-sm text-on-surface-variant">{c.region_name}</p>}
                {c.description && <p className="whitespace-pre-line text-body-sm">{c.description}</p>}
                <div className="flex flex-wrap gap-2">
                  {c.phone && (
                    <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-primary px-4 text-label-md text-on-primary">
                      <Phone className="h-4 w-4" aria-hidden />
                      {c.phone}
                    </a>
                  )}
                  {c.website && (
                    <a href={c.website} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-surface-container-low px-4 text-label-md text-primary hover:bg-surface-container">
                      {t("Сайт")}
                      <ExternalLink className="h-4 w-4" aria-hidden />
                    </a>
                  )}
                </div>
              </article>
            ))}
        </div>
      </section>
    ));
}

function AskLawyer() {
  const { user } = useAuth();
  const types = useApi("/documents/document-types/?page_size=100");
  const mine = useApi(user ? "/help/questions/?page_size=100" : null);
  const [question, setQuestion] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/help/questions/", { method: "POST", body: { question: question.trim(), document_type: documentType ? Number(documentType) : null } });
      setQuestion("");
      setDocumentType("");
      mine.reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 text-headline-md">
        <Gavel className="h-6 w-6 text-primary" aria-hidden />
        {t("Савол ба ҳуқуқшинос")}
      </h2>
      {!user ? (
        <p className="card p-6 text-body-md">
          <Link to="/login" className="text-primary underline">{t("Ворид шавед")}</Link>, {t("то савол диҳед. Ҷавоб ба почта ва Telegram меояд.")}
        </p>
      ) : (
        <>
          <form onSubmit={submit} className="card flex flex-col gap-4 p-4 md:p-6">
            <label className="block">
              <span className="label">{t("Дар бораи кадом ҳуҷҷат? (ихтиёрӣ)")}</span>
              <select className="input" value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                <option value="">{t("— умумӣ —")}</option>
                {(types.data?.results || []).map((x) => (
                  <option key={x.id} value={x.id}>{x.title}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">{t("Саволи шумо")} <span className="text-error">*</span></span>
              <textarea className="input h-auto py-3" rows={4} required value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={t("Масалан: Пардохти патентро 2 рӯз дер кардам. Чӣ кор кунам?")} />
            </label>
            <ErrorBox error={error} />
            <Button type="submit" icon={Send} loading={busy} disabled={!question.trim()} className="self-start">{t("Фиристодан")}</Button>
          </form>

          {mine.data?.results?.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-headline-sm">{t("Саволҳои ман")}</h3>
              {mine.data.results.map((q) => {
                const status = QUESTION_STATUS[q.status];
                return (
                  <article key={q.id} className="card flex flex-col gap-2 p-4 md:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-body-sm text-on-surface-variant">{[q.document_type_title, date(q.created_at)].filter(Boolean).join(" · ")}</span>
                      <span className={`rounded-full px-3 py-1 text-label-md ${status.box}`}>{status.label()}</span>
                    </div>
                    <p className="whitespace-pre-line text-body-md font-semibold">{q.question}</p>
                    {q.answer && (
                      <div className="rounded-xl bg-tertiary-fixed/40 p-3">
                        <p className="text-label-md text-tertiary">{t("Ҷавоби ҳуқуқшинос")}:</p>
                        <p className="whitespace-pre-line text-body-md">{q.answer}</p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default function Help() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={t("Кӯмак ва бехатарӣ")} title={t("Маркази ёрии ҳуқуқӣ")} text={t("Рақамҳои сафорат ва хатҳои ёрӣ, ва саволи худро ба ҳуқуқшинос диҳед.")} />
      <div className="grid items-start gap-8 xl:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Contacts />
        </div>
        <AskLawyer />
      </div>
    </div>
  );
}
