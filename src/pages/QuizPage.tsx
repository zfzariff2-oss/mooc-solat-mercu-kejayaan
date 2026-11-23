import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/hooks/useDashboard";
import { FINAL_QUIZ, MODULES, getModuleByQuizId } from "@/content/publicCourse";
import {
  areSlidesCompleted,
  findLessonIndex,
  isLessonUnlocked,
} from "@/lib/courseProgress";
import { supabase } from "@/lib/supabase";
import { formatDateTimeMY, cn } from "@/lib/utils";
import type { QuizAttemptRow } from "@/lib/types";
import QuizRunner from "@/components/QuizRunner";
import { Alert, Card, EmptyState, Loading } from "@/components/ui";

function QuizLockCard({
  icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon: string;
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8">
      <Link
        to="/pelajaran"
        className="transition-soft inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-sm hover:text-forest"
      >
        ← Senarai modul
      </Link>
      <div className="card-pop mt-4 animate-fade-up p-8 text-center">
        <span aria-hidden className="text-5xl">{icon}</span>
        <p className="font-display mt-3 text-2xl font-extrabold text-slate-900">{title}</p>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{description}</p>
        <Link
          to={actionHref}
          className="transition-soft mt-5 inline-flex items-center rounded-full bg-forest px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-forest/25 hover:bg-forest-light"
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}

export default function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const { session } = useAuth();
  const { data: dashboard, loading: dashboardLoading, error: dashboardError, reload: reloadDashboard } = useDashboard();
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

  const lessonIndex = dashboard && module ? findLessonIndex(dashboard.lessons, module.id) : -1;
  const lessonProgress = dashboard && lessonIndex >= 0 ? dashboard.lessons[lessonIndex] : undefined;
  const previousLesson = dashboard && lessonIndex > 0 ? dashboard.lessons[lessonIndex - 1] : undefined;

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

  if (dashboardLoading && !dashboard) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8">
        <div className="card-pop px-8 py-6">
          <Loading text="Menyemak akses kuiz…" />
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8">
        <Alert>{dashboardError ?? "Akses kuiz tidak dapat disemak. Sila muat semula."}</Alert>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void reloadDashboard()}
            className="transition-soft rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white"
          >
            Cuba lagi
          </button>
          <Link
            to="/pelajaran"
            className="transition-soft rounded-full border-2 border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600"
          >
            ← Senarai modul
          </Link>
        </div>
      </div>
    );
  }

  if (lessonIndex < 0) {
    return (
      <QuizLockCard
        icon="🧭"
        title="Kuiz belum tersedia"
        description="Modul ini belum terdapat dalam senarai kursus. Kembali ke senarai modul dan muat semula halaman."
        actionHref="/pelajaran"
        actionLabel="Kembali ke senarai modul"
      />
    );
  }

  if (!isLessonUnlocked(dashboard.lessons, lessonIndex)) {
    return (
      <QuizLockCard
        icon="🔒"
        title="Kuiz ini masih dikunci"
        description={
          previousLesson
            ? `Selesaikan Modul ${previousLesson.order}: ${previousLesson.title} terlebih dahulu. Nota dan kuiz modul sebelumnya mesti selesai sebelum kuiz ini dibuka.`
            : "Selesaikan modul sebelumnya terlebih dahulu. Nota dan kuiz modul sebelumnya mesti selesai sebelum kuiz ini dibuka."
        }
        actionHref={previousLesson ? `/pelajaran/${previousLesson.lesson_id}` : "/pelajaran"}
        actionLabel={previousLesson ? `Buka Modul ${previousLesson.order} →` : "Kembali ke senarai modul"}
      />
    );
  }

  if (!lessonProgress || !areSlidesCompleted(lessonProgress)) {
    const viewed = lessonProgress?.slides_viewed ?? 0;
    const total = lessonProgress?.total_slides ?? module.slides.length;
    return (
      <QuizLockCard
        icon="📖"
        title="Selesaikan nota dahulu"
        description={`Kuiz ini dibuka selepas semua nota modul diselesaikan. Kemajuan nota anda: ${viewed}/${total} slaid.`}
        actionHref={`/pelajaran/${module.id}`}
        actionLabel="Sambung nota →"
      />
    );
  }

  const hasPassed = attempts.some((attempt) => attempt.passed);
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
          onSubmitted={() => {
            void loadAttempts();
            void reloadDashboard();
          }}
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
        {loading ? (
          <div className="card-pop px-6 py-4 text-sm text-slate-400">Menyemak status kelulusan…</div>
        ) : hasPassed ? (
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
        ) : (
          <EmptyState
            icon="🔒"
            title="Modul seterusnya masih dikunci"
            desc={`Lulus kuiz ini dengan sekurang-kurangnya ${module.quiz.passingScore}% untuk membuka modul seterusnya. Ulang kuiz sehingga lulus — percubaan tanpa had.`}
          />
        )}
      </div>
    </div>
  );
}
