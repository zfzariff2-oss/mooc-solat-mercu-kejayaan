import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { FINAL_QUIZ, MODULES, getModuleByQuizId } from "@/content/publicCourse";
import { supabase } from "@/lib/supabase";
import { formatDateTimeMY, cn } from "@/lib/utils";
import type { QuizAttemptRow } from "@/lib/types";
import QuizRunner from "@/components/QuizRunner";
import { Alert, Card, EmptyState } from "@/components/ui";

export default function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const { session } = useAuth();
  const module = quizId ? getModuleByQuizId(quizId) : undefined;
  const [attempts, setAttempts] = useState<QuizAttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAttempts = useCallback(async () => {
    if (!module || !session) return;
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("quiz_attempts")
      .select("id,quiz_id,score,total,percentage,passed,completed_at")
      .eq("student_id", session.user.id)
      .eq("quiz_id", module.quiz.id)
      .order("completed_at", { ascending: false });
    if (queryError) setError(queryError.message);
    else setAttempts((data as QuizAttemptRow[]) ?? []);
    setLoading(false);
  }, [module, session]);

  useEffect(() => {
    void loadAttempts();
  }, [loadAttempts]);

  if (quizId === FINAL_QUIZ.id) {
    return <Navigate to="/pentaksiran" replace />;
  }

  if (!module) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="card-pop p-8 text-center">
          <p className="font-display text-2xl font-extrabold">Kuiz tidak dijumpai.</p>
          <Link to="/pelajaran" className="mt-3 inline-block text-sm font-bold text-forest underline">
            ← Kembali ke senarai modul
          </Link>
        </div>
      </div>
    );
  }

  const nextModule = MODULES.find((m) => m.order === module.order + 1);
  const nextHref = nextModule ? `/pelajaran/${nextModule.id}` : "/pentaksiran";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <Link
        to={`/pelajaran/${module.id}`}
        className="transition-soft inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-sm hover:text-forest"
      >
        ← Kembali ke {module.title}
      </Link>

      <div className="card-pop mt-4 animate-fade-up overflow-hidden bg-gradient-to-r from-grape/10 via-white to-sky/10 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center rounded-full bg-grape/10 px-3 py-1 text-[11px] font-bold tracking-widest text-grape">
              🧠 KUIZ MODUL {module.order}
            </span>
            <h1 className="font-display mt-2 text-3xl font-extrabold text-slate-900 md:text-4xl">{module.quiz.title}</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              {module.quiz.questions.length} soalan • Markah lulus: {module.quiz.passingScore}% • Percubaan tanpa had.
            </p>
          </div>
          <span aria-hidden className="animate-floaty hidden text-5xl md:block">✏️</span>
        </div>
      </div>

      <div className="mt-6">
        {error && (
          <div className="mb-4">
            <Alert>{error}</Alert>
          </div>
        )}
        <QuizRunner
          quizId={module.quiz.id}
          title={module.quiz.title}
          passingScore={module.quiz.passingScore}
          questions={module.quiz.questions}
          nextHref={nextHref}
          onSubmitted={loadAttempts}
        />
      </div>

      <Card className="mt-8">
        <h2 className="font-display flex items-center gap-2 text-xl font-extrabold text-slate-900">📊 Sejarah Percubaan</h2>
        {loading ? (
          <p className="mt-2 text-sm text-slate-400">Memuatkan sejarah…</p>
        ) : attempts.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">Belum ada percubaan kuiz. Jom cuba yang pertama!</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {attempts.map((a, i) => (
              <li key={a.id} className="flex items-center justify-between px-1 py-3 text-sm">
                <span className="font-medium text-slate-600">
                  Percubaan #{attempts.length - i} <span className="text-xs text-slate-400">• {formatDateTimeMY(a.completed_at)}</span>
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

      <div className="mt-8">
        <EmptyState
          icon="📚"
          title="Selepas lulus kuiz ini…"
          desc={nextModule ? `Teruskan ke ${nextModule.num}: ${nextModule.title}.` : "Seterusnya, buka Pentaksiran Akhir selepas semua modul selesai."}
          action={
            <Link
              to={nextModule ? `/pelajaran/${nextModule.id}` : "/pentaksiran"}
              className="transition-soft inline-flex items-center rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-forest/25 hover:bg-forest-light"
            >
              {nextModule ? "Modul seterusnya →" : "Pentaksiran Akhir →"}
            </Link>
          }
        />
      </div>
    </div>
  );
}
