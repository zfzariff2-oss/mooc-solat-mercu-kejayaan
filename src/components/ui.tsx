/** Komponen UI asas. */
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";
import { playClick } from "@/lib/sfx";

const STAT_TONES = {
  forest: "from-forest/10 to-mint/10 text-forest",
  grape: "from-grape/10 to-sky/10 text-grape",
  sun: "from-sun/20 to-coral/10 text-sun-dark",
  coral: "from-coral/10 to-grape/10 text-coral-dark",
  sky: "from-sky/10 to-forest/10 text-sky-dark",
  mint: "from-mint/10 to-sky/10 text-mint-dark",
} as const;

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("card-pop p-6", className)}>{children}</div>;
}

export function PageHeader({ kicker, title, desc }: { kicker: string; title: string; desc?: string }) {
  return (
    <div className="animate-fade-up">
      <span className="inline-flex items-center rounded-full bg-forest/10 px-3 py-1 text-[11px] font-bold tracking-[0.22em] text-forest">
        {kicker}
      </span>
      <h1 className="font-display mt-3 text-3xl font-extrabold leading-tight text-slate-900 md:text-4xl">{title}</h1>
      {desc && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{desc}</p>}
    </div>
  );
}

export function PrimaryButton({ children, className, onClick, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      onClick={(e) => {
        playClick();
        onClick?.(e);
      }}
      className={cn(
        "transition-soft rounded-full bg-forest px-6 py-2.5 text-sm font-bold tracking-wide text-white shadow-lg shadow-forest/25 hover:bg-forest-light hover:shadow-forest/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="transition-soft text-sm font-semibold text-slate-500 hover:text-forest">
      {children}
    </a>
  );
}

export function Field({ label, children, htmlFor }: { label: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-xs font-bold tracking-widest text-slate-500">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "transition-soft w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 outline-none placeholder:text-slate-300 focus:border-forest focus:ring-4 focus:ring-forest/10",
        props.className,
      )}
    />
  );
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "transition-soft w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-forest focus:ring-4 focus:ring-forest/10",
        props.className,
      )}
    />
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-slate-100", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="transition-soft h-full rounded-full bg-gradient-to-r from-mint via-forest to-sky"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function EmptyState({
  title,
  desc,
  action,
  icon,
}: {
  title: string;
  desc?: string;
  action?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white/70 px-6 py-12 text-center">
      {icon && (
        <span aria-hidden className="animate-floaty mb-3 inline-block text-4xl">
          {icon}
        </span>
      )}
      <p className="font-display text-xl font-extrabold text-slate-800">{title}</p>
      {desc && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Loading({ text = "Memuatkan…" }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 py-10" aria-live="polite">
      <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-forest/20 border-t-forest" />
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "success" | "info"; children: ReactNode }) {
  const styles =
    kind === "error"
      ? "border-coral/30 bg-coral-light text-coral-dark"
      : kind === "success"
        ? "border-mint/40 bg-mint-light text-mint-dark"
        : "border-sun/50 bg-sun-light text-sand-dark";
  const icon = kind === "error" ? "⚠️" : kind === "success" ? "✅" : "💡";
  return (
    <div className={cn("animate-pop-in flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium", styles)}>
      <span aria-hidden className="mt-px shrink-0">
        {icon}
      </span>
      <span>{children}</span>
    </div>
  );
}

export function Stat({
  label,
  value,
  tone = "forest",
  icon,
}: {
  label: string;
  value: string | number;
  tone?: keyof typeof STAT_TONES;
  icon?: string;
}) {
  return (
    <div className={cn("card-pop card-hover bg-gradient-to-br p-5", STAT_TONES[tone])}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
        {icon && (
          <span aria-hidden className="text-xl leading-none">
            {icon}
          </span>
        )}
      </div>
      <p className="font-display mt-1.5 text-3xl font-extrabold text-slate-800">{value}</p>
    </div>
  );
}
