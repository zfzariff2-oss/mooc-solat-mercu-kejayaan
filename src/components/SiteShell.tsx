/** Kerangka navigasi pelajar/admin. */
import { useState, useTransition, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { cn, initials } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon?: string;
}

export default function SiteShell({
  kicker,
  name,
  code,
  nav,
  children,
}: {
  kicker: string;
  name: string;
  code: string;
  nav: NavItem[];
  children: ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function doLogout() {
    startTransition(async () => {
      await signOut();
      navigate("/login");
    });
  }

  const links = (
    <nav aria-label="Navigasi utama" className="flex flex-col gap-1.5">
      {nav.map((n) => {
        const active = location.pathname === n.href || (n.href !== "/dashboard" && n.href !== "/admin" && location.pathname.startsWith(n.href));
        return (
          <Link
            key={n.href}
            to={n.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "transition-soft flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold",
              active
                ? "bg-gradient-to-r from-forest to-forest-light text-white shadow-lg shadow-forest/25"
                : "text-slate-600 hover:bg-forest/5 hover:text-forest",
            )}
          >
            {n.icon && (
              <span aria-hidden className="text-base leading-none">
                {n.icon}
              </span>
            )}
            {n.label}
          </Link>
        );
      })}
      <button
        onClick={doLogout}
        disabled={pending}
        className="transition-soft mt-2 flex items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-sm font-semibold text-coral-dark hover:bg-coral-light disabled:opacity-50"
      >
        <span aria-hidden className="text-base leading-none">🚪</span>
        {pending ? "Log keluar…" : "Log Keluar"}
      </button>
    </nav>
  );

  const brand = (
    <>
      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-forest/10 to-sky/10 px-3 py-1 text-[10px] font-bold tracking-[0.22em] text-forest">
        ✨ {kicker}
      </span>
      <div className="mt-4 flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-forest to-sky font-display text-sm font-extrabold text-white shadow-md shadow-forest/25"
        >
          {initials(name)}
        </span>
        <div className="min-w-0">
          <p className="font-display truncate text-base font-extrabold leading-snug text-slate-900">{name}</p>
          <p className="font-mono text-[11px] text-slate-400">{code}</p>
        </div>
      </div>
    </>
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col md:flex-row">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/70 bg-white/85 px-4 py-3 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-forest to-sky font-display text-[11px] font-extrabold text-white"
          >
            {initials(name)}
          </span>
          <div>
            <p className="font-display text-sm font-extrabold leading-none text-slate-900">{name}</p>
            <p className="font-mono text-[10px] text-slate-400">{code}</p>
          </div>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Buka menu"
          className="transition-soft rounded-full border-2 border-forest/20 bg-white px-3.5 py-1.5 text-sm font-bold text-forest hover:border-forest/40"
        >
          {open ? "Tutup ✕" : "Menu ☰"}
        </button>
      </div>
      {open && <div className="animate-fade-up z-10 border-b border-slate-200/70 bg-white px-3 py-3 md:hidden">{links}</div>}

      <aside className="hidden w-64 shrink-0 flex-col px-4 py-8 md:sticky md:top-0 md:flex md:h-screen">
        <div className="px-4">{brand}</div>
        <div className="mt-7 overflow-y-auto">{links}</div>
        <div className="mt-auto hidden rounded-2xl bg-gradient-to-br from-grape-light to-sky-light p-4 md:block">
          <p className="text-xs font-bold text-grape">💪 Teruskan usaha!</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            Setiap slaid yang anda selesaikan membawa anda lebih dekat kepada sijil.
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}

export const STUDENT_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/pelajaran", label: "Pelajaran", icon: "📚" },
  { href: "/kemajuan", label: "Kemajuan", icon: "📈" },
  { href: "/pentaksiran", label: "Pentaksiran", icon: "📝" },
  { href: "/ranking", label: "Ranking", icon: "🏅" },
  { href: "/sijil", label: "Sijil", icon: "🏆" },
  { href: "/profil", label: "Profil", icon: "👤" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/pelajar", label: "Pelajar", icon: "🎓" },
  { href: "/admin/keputusan", label: "Keputusan", icon: "🧠" },
  { href: "/admin/ranking", label: "Ranking", icon: "🏅" },
  { href: "/admin/sijil", label: "Sijil", icon: "🏆" },
  { href: "/admin/tetapan", label: "Tetapan Sheet", icon: "📤" },
];
