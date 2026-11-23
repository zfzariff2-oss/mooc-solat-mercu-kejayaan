import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/hooks/useDashboard";
import { supabase } from "@/lib/supabase";
import { cn, formatDateTimeMY } from "@/lib/utils";
import type { QuizAttemptRow } from "@/lib/types";
import SiteShell, { STUDENT_NAV } from "@/components/SiteShell";
import { Alert, Loading, PageHeader, ProgressBar } from "@/components/ui";

const BADGES = [
  { code: "mula-belajar", icon: "🌱", name: "Mula Belajar", desc: "Melihat slaid pertama." },
  { code: "pembaca-aktif", icon: "📖", name: "Pembaca Aktif", desc: "Menyiapkan satu modul." },
  { code: "kuiz-master", icon: "🧠", name: "Kuiz Master", desc: "Lulus kuiz dengan ≥ 90%." },
  { code: "tamat-kursus", icon: "🏆", name: "Tamat Kursus", desc: "Menamatkan kursus." },
];

export default function ProfilePage() {
  const { profile, signOut } = useAuth();
  const { data, loading, error } = useDashboard();
  const [attempts, setAttempts] = useState<QuizAttemptRow[]>([]);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!profile) return;
    supabase
      .from("quiz_attempts")
      .select("id,quiz_id,score,total,percentage,passed,completed_at")
      .eq("student_id", profile.id)
      .then(({ data: result }) => {
        if (!cancelled) setAttempts((result as QuizAttemptRow[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const earned = new Set<string>();
  if (data?.lessons.some((l) => l.slides_viewed > 0)) earned.add("mula-belajar");
  if (data?.lessons.some((l) => l.completed)) earned.add("pembaca-aktif");
  if (attempts.some((a) => a.percentage >= 90)) earned.add("kuiz-master");
  if (data?.certificate) earned.add("tamat-kursus");

  const p = data?.profile ?? profile;

  return (
    <SiteShell
      kicker="AKAUN"
      name={p?.full_name ?? "Pelajar"}
      code={p?.class_name ?? "—"}
      nav={STUDENT_NAV}
    >
      <PageHeader kicker="PROFIL PELAJAR" title="Profil" />

      {loading ? (
        <Loading text="Memuatkan profil…" />
      ) : error || !data ? (
        <div className="mt-6">
          <Alert>{error ?? "Profil tidak dapat dimuatkan."}</Alert>
        </div>
      ) : (
        <>
          <div className="card-pop mt-6 animate-fade-up overflow-hidden">
            <div className="flex flex-wrap items-center gap-5 bg-gradient-to-r from-forest/5 via-white to-grape/5">
              <span
                aria-hidden
                className="font-display flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-forest to-grape text-2xl font-extrabold text-white shadow-lg shadow-forest/25"
              >
                {(p?.full_name ?? "??")
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase())
                  .join("")}
              </span>
              <div>
                <p className="font-display text-2xl font-extrabold text-slate-900">{p?.full_name}</p>
                <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-sky-light px-3 py-1 text-xs font-bold text-sky-dark">
                  🎓 Pelajar • {p?.class_name ?? "—"}
                </p>
              </div>
            </div>
            <dl className="mt-6 grid gap-4 text-sm md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-[11px] font-bold tracking-widest text-slate-400">NAMA PENUH</dt>
                <dd className="mt-1 font-semibold text-slate-800">{p?.full_name ?? "—"}</dd>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-[11px] font-bold tracking-widest text-slate-400">KELAS</dt>
                <dd className="mt-1 font-semibold text-slate-800">{p?.class_name ?? "—"}</dd>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-[11px] font-bold tracking-widest text-slate-400">EMEL GOOGLE</dt>
                <dd className="mt-1 break-all font-semibold text-slate-800">{p?.email ?? "—"}</dd>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-[11px] font-bold tracking-widest text-slate-400">AKAUN DICIPTA</dt>
                <dd className="mt-1 font-semibold text-slate-800">{formatDateTimeMY(p?.created_at)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/ranking"
                className="transition-soft inline-flex items-center gap-2 rounded-full border-2 border-forest/30 bg-white px-5 py-2.5 text-xs font-bold tracking-wide text-forest hover:bg-forest hover:text-white"
              >
                🏅 LIHAT RANKING
              </Link>
              <button
                onClick={async () => {
                  setSigningOut(true);
                  await signOut();
                }}
                disabled={signingOut}
                className="transition-soft inline-flex items-center gap-2 rounded-full border-2 border-coral/30 bg-white px-5 py-2.5 text-xs font-bold tracking-wide text-coral-dark hover:bg-coral-light disabled:opacity-50"
              >
                🚪 {signingOut ? "Log keluar…" : "LOG KELUAR"}
              </button>
            </div>
            <p className="mt-4 rounded-2xl bg-forest/5 px-4 py-3 text-xs font-medium text-forest">
              🔐 Anda log masuk dengan akaun Google — tiada kata laluan tambahan diperlukan.
            </p>
          </div>

          <div className="card-pop mt-6 p-6">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-bold text-slate-700">Kemajuan Kursus</p>
              <p className="font-display text-3xl font-extrabold text-forest">{data.course_percentage}%</p>
            </div>
            <ProgressBar value={data.course_percentage} className="mt-3" />
            <p className="mt-2 text-xs font-medium text-slate-400">
              {data.completed_lessons}/{data.total_lessons} modul selesai
              {data.certificate ? " • Sijil diperoleh ✓" : ""}
            </p>
          </div>

          <h2 className="font-display mt-8 flex items-center gap-2 text-2xl font-extrabold text-slate-900">🎖️ Lencana Saya</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {BADGES.map((b) => {
              const has = earned.has(b.code);
              return (
                <div
                  key={b.code}
                  className={cn(
                    "card-hover rounded-3xl border bg-gradient-to-br p-5 text-center",
                    has ? "border-sun/50 from-sun-light to-white" : "border-slate-200 bg-white opacity-60 grayscale",
                  )}
                  title={b.desc}
                >
                  <span aria-hidden className={cn("mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-3xl", has ? "bg-white/80" : "bg-slate-100")}>
                    {b.icon}
                  </span>
                  <p className="font-display mt-3 text-sm font-extrabold text-slate-800">{b.name}</p>
                  <p className="mt-1 text-[11px] font-medium text-slate-400">{has ? "Diperoleh ✓" : "Belum diperoleh"}</p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </SiteShell>
  );
}
