import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, Clock, Hourglass, Loader2, X, XCircle } from "lucide-react";
import { t } from "../i18n.js";
import { daysText } from "../format.js";

const BUTTON = {
  primary: "bg-primary text-on-primary hover:bg-primary-container shadow-sm",
  soft: "bg-surface-container-low text-primary hover:bg-surface-container-high",
  plain: "bg-surface-container-low text-on-surface hover:bg-surface-container",
  danger: "bg-error text-on-error hover:opacity-90",
  ghost: "text-on-surface-variant hover:bg-surface-container-low",
};

export function Button({ variant = "primary", icon: Icon, loading, className = "", children, ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-label-lg transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : Icon && <Icon className="h-5 w-5 shrink-0" aria-hidden />}
      {children}
    </button>
  );
}

// Grey label for parts of the design that the backend cannot do yet.
export function SoonTag({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2 py-0.5 text-label-sm text-on-surface-variant ${className}`}>
      <Hourglass className="h-3 w-3" aria-hidden />
      {t("Ба наздикӣ")}
    </span>
  );
}

// A button that is shown but does nothing yet.
export function SoonButton({ icon: Icon, children, className = "" }) {
  return (
    <button
      type="button"
      disabled
      title={t("Ин имконият ба наздикӣ илова мешавад")}
      className={`inline-flex min-h-[48px] cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-surface-container-low px-4 py-2.5 text-label-md text-on-surface-variant opacity-70 ${className}`}
    >
      {Icon && <Icon className="h-5 w-5 shrink-0" aria-hidden />}
      <span>{children}</span>
      <SoonTag />
    </button>
  );
}

// Document status: always color + icon + text, never color alone.
export const STATUS = {
  expired: { box: "bg-error-container text-on-error-container", bar: "bg-error", icon: XCircle, accent: "text-error" },
  expiring: { box: "bg-warning-fixed text-on-warning-fixed", bar: "bg-warning-container", icon: Clock, accent: "text-warning" },
  valid: { box: "bg-tertiary-fixed text-on-tertiary-fixed", bar: "bg-tertiary-container", icon: CheckCircle2, accent: "text-tertiary" },
};

export function statusText(doc) {
  if (doc.status === "expired") return t("Мӯҳлат гузашт");
  if (doc.status === "expiring") return daysText(doc.days_left);
  return t("Эътибор дорад ({0} рӯз)", doc.days_left);
}

export function StatusBadge({ doc, className = "" }) {
  const s = STATUS[doc.status] || STATUS.valid;
  const Icon = s.icon;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-label-md ${s.box} ${className}`}>
      <Icon className="h-4 w-4" aria-hidden />
      {statusText(doc)}
    </span>
  );
}

export function Chip({ icon: Icon, children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg bg-surface-container-low px-2.5 py-1 text-label-md text-on-surface-variant ${className}`}>
      {Icon && <Icon className="h-4 w-4 text-primary" aria-hidden />}
      {children}
    </span>
  );
}

export function ErrorBox({ error, className = "" }) {
  if (!error) return null;
  return (
    <div role="alert" className={`flex items-start gap-2 rounded-xl bg-error-container p-3 text-body-sm text-on-error-container ${className}`}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-error" aria-hidden />
      <span>{error.message || String(error)}</span>
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-2xl bg-surface-container ${className}`} />;
}

export function EmptyState({ icon: Icon, title, text, children }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
          <Icon className="h-7 w-7" aria-hidden />
        </div>
      )}
      <h3 className="text-headline-sm">{title}</h3>
      {text && <p className="max-w-md text-body-md text-on-surface-variant">{text}</p>}
      {children}
    </div>
  );
}

export function Field({ label, required, error, children, hint }) {
  return (
    <label className="block">
      <span className="label">
        {label} {required && <span className="text-error">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-body-sm text-on-surface-variant">{hint}</span>}
      {error && <span className="mt-1 block text-body-sm text-error">{[].concat(error).join(" ")}</span>}
    </label>
  );
}

// Side panel on desktop, full-height sheet on phones. Closes on Escape and on the dark backdrop.
export function Drawer({ open, onClose, title, subtitle, icon: Icon, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-inverse-surface/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-surface-container-lowest shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-surface-container p-4 shadow-sm md:p-6">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-on-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
            )}
            <div>
              <h2 className="text-headline-sm">{title}</h2>
              {subtitle && <p className="text-body-sm text-on-surface-variant">{subtitle}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Пӯшидан")} className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-high hover:bg-surface-container-highest">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, text, children }) {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        {eyebrow && <p className="mb-1 text-label-sm uppercase tracking-wider text-primary">{eyebrow}</p>}
        <h1 className="text-headline-lg md:text-headline-xl">{title}</h1>
        {text && <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">{text}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap gap-2">{children}</div>}
    </div>
  );
}
