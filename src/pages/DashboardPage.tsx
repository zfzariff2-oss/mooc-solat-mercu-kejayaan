import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/hooks/useDashboard";
import SiteShell, { STUDENT_NAV } from "@/components/SiteShell";
import LessonCard from "@/components/LessonCard";
import { Alert, Loading, ProgressBar, Stat } from "@/components/ui";
import { formatDuration } from "@/lib/utils";

const QUICK_MENU = [
  { href: "/pelajaran", label: "Pelajaran", desc: "7 modul slaid", icon: "📚", tone: "from-forest/15 to-mint/15 text-forest" },
  { href: "/kemajuan", label: "Kemajuan", desc: "Status & markah", icon: "📈", tone: "from-sky/15 to-forest/10 text-sky-dark" },
  { href: "/pentaksiran", label: "Pentaksiran", desc: "20 soalan akhir", icon: "📝", tone: "from-grape/15 to-sky/10 text-grape" },
  { href: "/ranking", label: "Ranking", desc: "Top 20 & anda", icon: "🏅", tone: "from-sun/20 to-coral/10 text-sun-dark" },
  { href: "/sijil", label: "Sijil", desc: "Pencapaian anda", icon: "🏆", tone: "from-coral/15 to-grape/10 text-coral-dark" },
  { href: "/profil", label: "Profil", desc: "Nama & kelas", icon: "👤", tone: "from-mint/15 to-sky/10 text-mint-dark" },
];

export default function DashboardPage() {
  const { profile } = useAuth();
  const { data, loading, error } = useDashboard();

  if (loading) {
    return (
      <SiteShell kicker="PORTAL AKADEMIK" name={profile?.full_name ?? "Pelajar"} code={profile?.class_name ?? ""} nav={STUDENT_NAV}>
        <Loading text="Memuatkan dashboard…" />
      </SiteShell>
    );
  }

  if (error || !data) {
    return (
      <SiteShell kicker="PORTAL AKADEMIK" name={profile?.full_name ?? "Pelajar"} code={profile?.class_name ?? ""} nav={STUDENT_NAV}>
        <Alert>{error ?? "Dashboard tidak dapat dimuatkan. Pastikan skrip Supabase telah dijalankan."}</Alert>
      </SiteShell>
    );
  }

  const lessons = data.lessons;
  const firstIncomplete = lessons.find((l) => !l.completed);
  const allComplete = data.total_lessons > 0 && data.completed_lessons === data.total_lessons;
  const finalStatus = data.final.status;
  const quizPassed = lessons.filter((l) => l.quiz_passed).length;

  let nextHref = "/pelajaran";
  let nextLabel = "📚 Ulang Kaji";
  if (firstIncomplete) {
    nextHref = `/pelajaran/${firstIncomplete.lesson_id}`;
    nextLabel = "▶ Sambung Belajar";
  } else if (finalStatus === "READY") {
    nextHref = "/pentaksiran";
    nextLabel = "📝 Ambil Pentaksiran";
  } else if (finalStatus === "IN_PROGRESS") {
    nextHref = "/pentaksiran";
    nextLabel = "📝 Sambung Pentaksiran";
  } else if (finalStatus === "SUBMITTED") {
    nextHref = "/pentaksiran";
    nextLabel = "📊 Lihat Keputusan";
  }

  const finalLabel =
    finalStatus === "SUBMITTED"
      ? `Selesai — ${data.final.score}/${data.final.total} betul`
      : finalStatus === "IN_PROGRESS"
        ? "Sedang dijawab"
        : finalStatus === "READY"
          ? "Sedia untuk dijawab"
          : "Belum dibuka";

  return (
    <SiteShell
      kicker="PORTAL AKADEMIK"
      name={data.profile.full_name ?? profile?.full_name ?? "Pelajar"}
      code={data.profile.class_name ?? profile?.class_name ?? "—"}
      nav={STUDENT_NAV}
    >
      <section className="card-pop relative animate-fade-up overflow-hidden bg-gradient-to-br from-forest via-forest-light to-sky-dark p-6 text-white md:p-8">
        <span aria-hidden className="animate-floaty pointer-events-none absolute -right-8 -top-10 h-44 w-44 rounded-full bg-white/10" />
        <span aria-hidden className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-[0.25em] text-white/70">PAPAN PEMUKA</p>
            <h1 className="font-display mt-2 text-3xl font-extrabold leading-tight md:text-4xl">
              Assalamualaikum, {data.profile.full_name ?? "pelajar"} 👋
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
              {firstIncomplete ? (
                <>
                  Jom sambung belajar! Seterusnya:{" "}
                  <Link
                    to={`/pelajaran/${firstIncomplete.lesson_id}`}
                    className="font-bold text-white underline decoration-white/50 underline-offset-4 hover:decoration-white"
                  >
                    {firstIncomplete.title}
                  </Link>
                </>
              ) : finalStatus === "READY" ? (
                <>
                  Anda telah melengkapkan semua modul. Seterusnya:{" "}
                  <Link to="/pentaksiran" className="font-bold text-white underline decoration-white/50 underline-offset-4 hover:decoration-white">
                    Pentaksiran Akhir (20 soalan)
                  </Link>
                </>
              ) : finalStatus === "SUBMITTED" ? (
                "Anda telah melengkapkan pentaksiran akhir. Tahniah! 🎉"
              ) : (
                "Teruskan usaha — anda hampir sampai ke garisan penamat! 💪"
              )}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to={nextHref}
                className="transition-soft rounded-full bg-white px-6 py-2.5 text-sm font-bold text-forest shadow-lg hover:-translate-y-0.5"
              >
                {nextLabel}
              </Link>
              <Link
                to="/kemajuan"
                className="transition-soft rounded-full border-2 border-white/40 px-6 py-2.5 text-sm font-bold text-white hover:bg-white/10"
              >
                Lihat Kemajuan
              </Link>
            </div>
          </div>
          <div
            className="relative hidden h-36 w-36 shrink-0 items-center justify-center rounded-full md:flex"
            style={{
              background: `conic-gradient(#8ef0c8 ${data.course_percentage * 3.6}deg, rgba(255,255,255,0.18) 0deg)`,
            }}
            role="img"
            aria-label={`Kemajuan kursus ${data.course_percentage}%`}
          >
            <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white shadow-inner">
              <span className="font-display text-3xl font-extrabold text-forest">{data.course_percentage}%</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Selesai</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3" aria-label="Menu pantas">
        {QUICK_MENU.map((m) => (
          <Link
            key={m.href}
            to={m.href}
            className={`card-pop card-hover relative animate-fade-up overflow-hidden bg-gradient-to-br p-5 ${m.tone}`}
          >
            <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
              {m.icon}
            </span>
            <p className="font-display mt-3 text-lg font-extrabold text-slate-800">{m.label}</p>
            <p className="text-xs font-medium text-slate-500">{m.desc}</p>
          </Link>
        ))}
      </section>

      <section className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Statistik">
        <Stat label="Jumlah Modul" value={data.total_lessons} tone="forest" icon="📚" />
        <Stat label="Modul Selesai" value={data.completed_lessons} tone="mint" icon="✅" />
        <Stat label="Kuiz Lulus" value={quizPassed} tone="grape" icon="🧠" />
        <Stat label="Sijil" value={data.certificate ? "Ada ✓" : "—"} tone="sun" icon="🏆" />
      </section>

      {allComplete && (
        <div className="card-pop mt-5 animate-fade-up overflow-hidden bg-gradient-to-r from-grape/10 via-white to-sky/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                {finalStatus === "SUBMITTED" ? "✅" : finalStatus === "IN_PROGRESS" ? "⏳" : "📝"}
              </span>
              <div>
                <p className="text-[11px] font-bold tracking-widest text-grape">PENTAKSIRAN AKHIR</p>
                <p className="font-display text-lg font-extrabold text-slate-800">{finalLabel}</p>
                {finalStatus === "SUBMITTED" && (
                  <p className="text-xs text-slate-500">
                    Masa: {formatDuration(data.final.duration_seconds)} • Kedudukan: #{data.final.rank ?? "—"}
                  </p>
                )}
              </div>
            </div>
            <Link
              to="/pentaksiran"
              className="transition-soft rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-forest/25 hover:bg-forest-light"
            >
              {finalStatus === "SUBMITTED" ? "Lihat keputusan" : finalStatus === "IN_PROGRESS" ? "Sambung →" : "Pergi →"}
            </Link>
          </div>
        </div>
      )}

      {data.certificate && (
        <div className="card-pop mt-5 animate-fade-up overflow-hidden bg-gradient-to-r from-sun-light via-white to-coral-light p-6">
          <h2 className="font-display text-2xl font-extrabold text-slate-900">Tahniah — sijil anda telah dikeluarkan! 🎉</h2>
          <p className="mt-1 text-sm text-slate-600">
            No. Sijil: <span className="font-mono font-bold text-sand-dark">{data.certificate.certificate_number}</span>
          </p>
          <Link
            to="/sijil"
            className="transition-soft mt-4 inline-block rounded-full bg-gradient-to-r from-sun to-coral px-7 py-3 text-sm font-bold tracking-wide text-white shadow-lg shadow-coral/25 hover:-translate-y-0.5"
          >
            🏆 LIHAT SIJIL
          </Link>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-extrabold text-slate-900">📖 Modul Pembelajaran</h2>
        <Link to="/pelajaran" className="text-sm font-bold text-forest hover:underline">
          Lihat semua →
        </Link>
      </div>
      <section className="mt-4 grid gap-5 md:grid-cols-2" aria-label="Senarai modul">
        {lessons.map((l) => (
          <LessonCard key={l.lesson_id} lesson={l} href={`/pelajaran/${l.lesson_id}`} />
        ))}
      </section>

      <div className="card-pop mt-6 p-6">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-bold text-slate-700">Kemajuan Kursus Keseluruhan</p>
          <p className="font-display text-3xl font-extrabold text-forest">{data.course_percentage}%</p>
        </div>
        <ProgressBar value={data.course_percentage} className="mt-3" />
        <p className="mt-2 text-xs font-medium text-slate-400">
          {data.completed_lessons}/{data.total_lessons} modul selesai • Teruskan usaha, anda boleh! 💪
        </p>
      </div>
    </SiteShell>
  );
}
