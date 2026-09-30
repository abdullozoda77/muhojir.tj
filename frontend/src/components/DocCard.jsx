import { Link } from "react-router-dom";
import { AlertOctagon, BookOpen, Camera, FileText, HeartPulse, House, IdCard, Pencil, PlaneLanding, Stethoscope, Wallet } from "lucide-react";
import { openPrivateFile } from "../api.js";
import { t } from "../i18n.js";
import { date, usedPercent } from "../format.js";
import { STATUS, StatusBadge } from "./ui.jsx";

// Icons by the document type's slug (set by admins); unknown slugs get a plain document icon.
const ICONS = [
  [/patent/, IdCard],
  [/regist/, House],
  [/card|karta|migration/, PlaneLanding],
  [/insur|dms|polis/, HeartPulse],
  [/med/, Stethoscope],
];

export function docIcon(slug = "") {
  return ICONS.find(([re]) => re.test(slug))?.[1] || FileText;
}

function Meta({ label, value, className = "" }) {
  return (
    <div>
      <span className="block text-body-sm text-on-surface-variant">{label}</span>
      <span className={`text-label-md ${className}`}>{value || "—"}</span>
    </div>
  );
}

export default function DocCard({ doc, slug, onEdit, onPay }) {
  const s = STATUS[doc.status] || STATUS.valid;
  const Icon = docIcon(slug);
  const pct = usedPercent(doc);
  return (
    <article className="card flex flex-col overflow-hidden">
      <div className={`h-2 w-full ${s.bar}`} />
      <div className="flex flex-1 flex-col justify-between gap-4 p-4 md:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.box}`}>
                <Icon className="h-6 w-6" aria-hidden />
              </div>
              <div>
                {doc.region_name && <span className="block text-label-sm uppercase tracking-wider text-on-surface-variant">{doc.region_name}</span>}
                <h3 className="text-headline-sm font-bold">{doc.document_type_title}</h3>
              </div>
            </div>
            <StatusBadge doc={doc} />
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-lg bg-surface-container-low p-4">
            <Meta label={t("Серия ва рақам")} value={doc.number} className="font-mono" />
            <Meta label={t("Минтақа")} value={doc.region_name} />
            <Meta label={t("Санаи додан")} value={date(doc.issued_at)} />
            <Meta label={t("Санаи анҷом")} value={date(doc.expires_at)} className={doc.status === "valid" ? "" : `font-bold ${s.accent}`} />
          </div>

          {pct !== null && (
            <div>
              <div className="mb-1.5 flex justify-between text-label-sm text-on-surface-variant">
                <span>{t("Қисми гузаштаи мӯҳлат")}</span>
                <span className={s.accent}>{pct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {doc.status === "expired" && (
            <div className="flex items-start gap-2 rounded-xl bg-error-container p-4 text-body-sm text-on-error-container">
              <AlertOctagon className="h-5 w-5 shrink-0 text-error" aria-hidden />
              <div>
                <p className="font-bold">{t("Мӯҳлати ин ҳуҷҷат гузаштааст!")}</p>
                <p>{t("Онро зудтар нав кунед, то ҷарима нашавед. Дар роҳнамо қадамҳоро бинед.")}</p>
              </div>
            </div>
          )}
          {doc.note && <p className="rounded-lg bg-surface-container-high p-3 text-body-sm"><strong>{t("Ёддошт")}:</strong> {doc.note}</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onEdit(doc)} className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-label-md text-on-primary hover:bg-primary-container">
            <Pencil className="h-4 w-4" aria-hidden />
            {t("Таҳрир / нав кардан")}
          </button>
          <Link to={`/guides?type=${doc.document_type}`} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-surface-container-low px-4 text-label-md text-primary hover:bg-surface-container">
            <BookOpen className="h-4 w-4" aria-hidden />
            {t("Роҳнамо")}
          </Link>
          {doc.has_photo && (
            <button type="button" onClick={() => openPrivateFile(`/documents/my-documents/${doc.id}/photo/`).catch(() => {})} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-surface-container-low px-4 text-label-md text-primary hover:bg-surface-container">
              <Camera className="h-4 w-4" aria-hidden />
              {t("Сурат")}
            </button>
          )}
          {/patent/.test(slug || "") && (
            <button type="button" onClick={() => onPay(doc)} className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-label-md text-on-secondary hover:bg-secondary-container">
              <Wallet className="h-4 w-4" aria-hidden />
              {t("Пардохти патентро сабт кардан")}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
