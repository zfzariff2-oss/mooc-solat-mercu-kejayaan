import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/hooks/useDashboard";
import { supabase } from "@/lib/supabase";
import { cn, formatDateTimeMY, formatDuration } from "@/lib/utils";
import type { QuizAttemptRow } from "@/lib/types";
import SiteShell, { STUDENT_NAV } from "@/components/SiteShell";
import { Alert, Card, EmptyState, Loading, PageHeader, ProgressBar } from "@/components/ui";

export default function ProgressPage() {
  const { profile, session } = useAuth();
  const { data, loading, error } = useDashboard();
  const [attempts, setAttempts] = useState<QuizAttemptRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!session) return;
    supabase
      .from("quiz_attempts")
      .select("id,quiz_id,score,total,percentage,passed,completed_at")
      .eq("student_id", session.user.id)
      .order("completed_at", { ascending: false })
      .limit(100)
      .then(({ data: result }) => {
        if (!cancelled) setAttempts((result as QuizAttemptRow[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  function quizTitle(quizId: string): string {
    if (quizId === "quiz-m1") return "Kuiz Modul 1";
    if (quizId === "quiz-m2") return "Kuiz Modul 2";
    if (quizId === "quiz-m3") return "Kuiz Modul 3";
    if (quizId === "quiz-m4") return "Kuiz Modul 4";
    if (quizId === "quiz-m5") return "Kuiz Modul 5";
    if (quizId === "quiz-m6") return "Kuiz Modul 6";
    if (quizId === "quiz-m7") return "Kuiz Modul 7";
    return quizId;
  }

  return (
    <SiteShell
      kicker="PRESTASI"
      name={data?.profile.full_name ?? profile?.full_name ?? "Pelajar"}
      code={data?.profile.class_name ?? profile?.class_name ?? "—"}
      nav={STUDENT_NAV}
    >
      <PageHeader kicker="KEMAJUAN BELAJAR" title="Kemajuan" desc="Status setiap modul, sejarah kuiz dan keputusan pentaksiran akhir." />

      {loading ? (
        <Loading text="Memuatkan kemajuan…" />
      ) : error || !data ? (
        <div className="mt-6">
          <Alert>{error ?? "Kemajuan tidak dapat dimuatkan."}</Alert>
        </div>
      ) : (
        <>
          <Card className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold tracking-widest text-grape">PENTAKSIRAN AKHIR</p>
                <p className="font-display mt-1 text-xl font-extrabold text-slate-900">
                  {data.final.status === "SUBMITTED"
                    ? `Selesai — ${data.final.score}/${data.final.total} betul`
                    : data.final.status === "IN_PROGRESS"
                      ? "Sedang dijawab"
                      : data.final.status === "READY"
                        ? "Sedia untuk dijawab"
                        : "Belum dibuka"}
                </p>
                {data.final.status === "SUBMITTED" && (
                  <p className="mt-1 text-xs text-slate-500">
                    Masa: {formatDuration(data.final.duration_seconds)} • Kedudukan: #{data.final.rank ?? "—"}
                  </p>
                )}
              </div>
              <Link
                to="/pentaksiran"
                className="transition-soft inline-flex items-center rounded-full bg-forest/10 px-4 py-2 text-sm font-bold text-forest hover:bg-forest hover:text-white"
              >
                {data.final.status === "SUBMITTED" ? "Lihat keputusan" : "Pergi ke pentaksiran"} →
              </Link>
            </div>
          </Card>

          {data.lessons.length === 0 ? (
            <div className="mt-6">
              <EmptyState icon="📭" title="Belum ada modul." />
            </div>
          ) : (
            <div className="mt-6 grid gap-5">
              {data.lessons.map((lesson) => (
                <Card key={lesson.lesson_id} className="animate-fade-up">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-forest/15 to-sky/15 text-xl"
                      >
                        {lesson.completed ? "✅" : "📖"}
                      </span>
                      <h2 className="font-display text-xl font-extrabold text-slate-900">{lesson.title}</h2>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold",
                        lesson.completed ? "bg-mint-light text-mint-dark" : "bg-sky-light text-sky-dark",
                      )}
                    >
                      {lesson.completed ? "✓ SELESAI" : `${lesson.percentage}%`}
                    </span>
                  </div>
                  <ProgressBar value={lesson.percentage} className="mt-4" />
                  <p className="mt-3 text-xs font-medium text-slate-500">
                    📖 Slaid {lesson.slides_viewed}/{lesson.total_slides} • 🧠 Kuiz: {lesson.quiz_passed ? "lulus ✓" : "belum lulus"}
                  </p>
                  <div className="mt-4">
                    <Link
                      to={`/pelajaran/${lesson.lesson_id}`}
                      className="transition-soft inline-flex items-center gap-1 rounded-full bg-forest/10 px-4 py-2 text-sm font-bold text-forest hover:bg-forest hover:text-white"
                    >
                      {lesson.completed ? "Ulangkaji" : "Sambung belajar"} →
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Card className="mt-8">
            <h2 className="font-display text-xl font-extrabold text-slate-900">📊 Sejarah Kuiz Modul</h2>
            {attempts.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">Belum ada percubaan kuiz.</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100">
                {attempts.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-1 py-3 text-sm">
                    <span className="font-medium text-slate-600">
                      {quizTitle(a.quiz_id)} <span className="text-xs text-slate-400">• {formatDateTimeMY(a.completed_at)}</span>
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold",
                        a.passed ? "bg-mint-light text-mint-dark" : "bg-coral-light text-coral-dark",
                      )}
                    >
                      {a.percentage}% {a.passed ? "✓" : "✗"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </SiteShell>
  );
}
