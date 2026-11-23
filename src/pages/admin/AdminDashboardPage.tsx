import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { AdminStats } from "@/lib/types";
import AdminShell from "@/components/AdminShell";
import { Alert, Loading, PageHeader, Stat } from "@/components/ui";

const LINKS = [
  { href: "/admin/pelajar", label: "Pelajar", desc: "Senarai & progress", icon: "🎓", tone: "from-forest/15 to-mint/15 text-forest" },
  { href: "/admin/keputusan", label: "Keputusan", desc: "Kuiz & pentaksiran", icon: "🧠", tone: "from-grape/10 to-sky/10 text-grape" },
  { href: "/admin/ranking", label: "Ranking", desc: "Ranking kelas", icon: "🏅", tone: "from-sun/20 to-coral/10 text-sun-dark" },
  { href: "/admin/sijil", label: "Sijil", desc: "Senarai sijil", icon: "🏆", tone: "from-coral/10 to-grape/10 text-coral-dark" },
  { href: "/admin/guru", label: "Guru Kelas", desc: "Daftar emel & kelas", icon: "👩‍🏫", tone: "from-mint/15 to-sky/10 text-mint-dark" },
  { href: "/admin/tetapan", label: "Tetapan Sheet", desc: "Sync Google Sheets", icon: "📤", tone: "from-sky/10 to-forest/10 text-sky-dark" },
];

export default function AdminDashboardPage() {
  const { profile } = useAuth();
  const isTeacher = profile?.role === "TEACHER";
  const links = isTeacher
    ? LINKS.filter((link) => link.href !== "/admin/guru" && link.href !== "/admin/tetapan")
    : LINKS;
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .rpc("admin_stats")
      .then(({ data, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) setError(rpcError.message);
        else setStats(data as AdminStats);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminShell>
      <PageHeader
        kicker={isTeacher ? "DASHBOARD GURU KELAS" : "DASHBOARD PENTADBIR"}
        title="Dashboard"
        desc={
          isTeacher
            ? `Gambaran keseluruhan pelajar kelas ${profile?.assigned_classes?.join(", ") || "anda"}.`
            : "Gambaran keseluruhan kursus Solat Mercu Kejayaan."
        }
      />
      {loading ? (
        <Loading text="Memuatkan statistik…" />
      ) : error || !stats ? (
        <div className="mt-6">
          <Alert>{error ?? "Statistik tidak dapat dimuatkan."}</Alert>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
            <Stat label="Jumlah Pelajar" value={stats.students} tone="forest" icon="🎓" />
            <Stat label="Profil Lengkap" value={stats.completed_profiles} tone="mint" icon="✅" />
            <Stat label="Hantar Pentaksiran" value={stats.final_submitted} tone="grape" icon="📝" />
            <Stat label="Jumlah Sijil" value={stats.certificates} tone="sun" icon="🏆" />
            <Stat label="Purata Progress" value={`${stats.average_progress}%`} tone="sky" icon="📈" />
            <Stat label="Modul" value={7} tone="coral" icon="📚" />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
            {links.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                className={`card-pop card-hover animate-fade-up overflow-hidden bg-gradient-to-br p-5 ${l.tone}`}
              >
                <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                  {l.icon}
                </span>
                <p className="font-display mt-3 text-lg font-extrabold text-slate-800">{l.label}</p>
                <p className="text-xs font-medium text-slate-500">{l.desc}</p>
              </Link>
            ))}
          </div>

          <div className="card-pop mt-6 p-5 text-xs leading-6 text-slate-500">
            <b className="text-slate-700">Nota:</b>{" "}
            {isTeacher
              ? `Panel ini hanya memaparkan pelajar dalam kelas ${profile?.assigned_classes?.join(", ") || "anda"}.`
              : "Kandungan kursus (modul, slaid, soalan) diurus melalui fail seed / Supabase. Panel ini memantau pelajar, keputusan, ranking, sijil dan sync Google Sheets."}
          </div>
        </>
      )}
    </AdminShell>
  );
}
