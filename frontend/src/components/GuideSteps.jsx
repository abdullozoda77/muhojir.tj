import { useState } from "react";
import { CalendarClock, ExternalLink, Wallet } from "lucide-react";
import { t } from "../i18n.js";

// The "what to bring" list of a step: one item per line in the admin panel. Ticks are only for the reader.
export function Checklist({ items }) {
  const [done, setDone] = useState({});
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <label key={item} className="flex min-h-[48px] cursor-pointer select-none items-start gap-3 rounded-lg bg-surface-container-low p-3 hover:bg-surface-container">
          <input type="checkbox" className="mt-0.5 h-5 w-5 rounded text-primary focus:ring-primary" checked={Boolean(done[item])} onChange={(e) => setDone((d) => ({ ...d, [item]: e.target.checked }))} />
          <span className={`text-label-lg ${done[item] ? "text-on-surface-variant line-through" : ""}`}>{item}</span>
        </label>
      ))}
    </div>
  );
}

export const papersOf = (step) => (step.required_papers || "").split("\n").map((s) => s.trim()).filter(Boolean);

export default function GuideSteps({ steps }) {
  return (
    <ol className="flex flex-col gap-4">
      {steps.map((step, i) => (
        <li key={step.id} className="relative flex gap-4">
          <div className="flex flex-col items-center">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-label-lg ${i === steps.length - 1 ? "bg-tertiary text-on-tertiary" : "bg-primary text-on-primary"}`}>{i + 1}</span>
            {i < steps.length - 1 && <span className="mt-1 w-0.5 flex-1 bg-surface-container-high" aria-hidden />}
          </div>
          <div className="card mb-2 flex flex-1 flex-col gap-3 p-4 md:p-6">
            <h3 className="text-headline-sm">{step.title}</h3>
            <p className="whitespace-pre-line text-body-md">{step.body}</p>
            {papersOf(step).length > 0 && (
              <div>
                <p className="mb-2 text-label-md text-on-surface-variant">{t("Бо худ биёред")}:</p>
                <Checklist items={papersOf(step)} />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {step.cost_note && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary-fixed px-3 py-1.5 text-label-md text-on-secondary-fixed">
                  <Wallet className="h-4 w-4" aria-hidden />
                  {step.cost_note}
                </span>
              )}
              {step.deadline_note && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-fixed px-3 py-1.5 text-label-md text-on-primary-fixed">
                  <CalendarClock className="h-4 w-4" aria-hidden />
                  {step.deadline_note}
                </span>
              )}
            </div>
            {step.official_url && (
              <a href={step.official_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-1.5 self-start text-label-md text-primary underline">
                {t("Сайти расмӣ")}
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
