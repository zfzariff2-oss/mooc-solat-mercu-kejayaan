import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/hooks/useDashboard";
import { getModule } from "@/content/publicCourse";
import { findLessonIndex, isLessonUnlocked } from "@/lib/courseProgress";
import { supabase } from "@/lib/supabase";
import SlideViewer from "@/components/SlideViewer";
import { Alert, Loading } from "@/components/ui";
import SiteShell, { STUDENT_NAV } from "@/components/SiteShell";

export default function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { session, profile } = useAuth();
  const {
    data: dashboard,
    loading: dashboardLoading,
    error: dashboardError,
    reload: reloadDashboard,
  } = useDashboard();
  const module = lessonId ? getModule(lessonId) : undefined;
  const [viewed, setViewed] = useState<string[]>([]);
  const [pendingMarks, setPendingMarks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!module || !session) return;
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from("slide_progress")
        .select("slide_id")
        .eq("student_id", session.user.id)
        .eq("lesson_id", module.id);
      if (cancelled) return;
      if (queryError) setError(queryError.message);
      else setViewed((data ?? []).map((r: { slide_id: string }) => r.slide_id));
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [module, session]);

  const markViewed = useCallback(
    async (slideId: string) => {
      if (!module || !session) return;
      setViewed((prev) => (prev.includes(slideId) ? prev : [...prev, slideId]));
      setPendingMarks((count) => count + 1);
      try {
        const { error: rpcError } = await supabase.rpc("mark_slide_viewed", {
          p_lesson_id: module.id,
          p_slide_id: slideId,
        });
        if (rpcError) {
          setError(rpcError.message);
          console.error(rpcError.message);
        }
      } finally {
        setPendingMarks((count) => Math.max(0, count - 1));
      }
    },
    [module, session],
  );

  const moduleIndex = dashboard && module ? findLessonIndex(dashboard.lessons, module.id) : -1;
  const moduleProgress = dashboard && moduleIndex >= 0 ? dashboard.lessons[moduleIndex] : undefined;
  const previousLesson = dashboard && moduleIndex > 0 ? dashboard.lessons[moduleIndex - 1] : undefined;
  const moduleLocked = !!dashboard && moduleIndex >= 0 && !isLessonUnlocked(dashboard.lessons, moduleIndex);
  const viewedCount = module ? module.slides.filter((s) => viewed.includes(s.id)).length : 0;
  const allSlidesViewed = !!module && viewedCount === module.slides.length;
  const quizReady = allSlidesViewed && pendingMarks === 0;

  if (!module) {
    return (
      <SiteShell kicker="PEMBELAJARAN" name={profile?.full_name ?? "Pelajar"} code={profile?.class_name ?? "—"} nav={STUDENT_NAV}>
        <div className="card-pop p-8 text-center">
          <p className="font-display text-2xl font-extrabold text-slate-900">Modul tidak dijumpai.</p>
          <Link to="/pelajaran" className="mt-4 inline-block text-sm font-bold text-forest underline">
            ← Kembali ke senarai modul
          </Link>
        </div>
      </SiteShell>
    );
  }

  if (!dashboard && !dashboardLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8">
        <Alert>{dashboardError ?? "Akses modul tidak dapat disemak. Sila muat semula."}</Alert>
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

  if (moduleLocked) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8">
        <Link
          to="/pelajaran"
          className="transition-soft inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-sm hover:text-forest"
        >
          ← Semua Modul
        </Link>
        <div className="card-pop mt-4 animate-fade-up p-8 text-center">
          <span aria-hidden className="text-5xl">🔒</span>
          <p className="font-display mt-3 text-2xl font-extrabold text-slate-900">Modul ini masih dikunci</p>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
            {previousLesson
              ? `Selesaikan Modul ${previousLesson.order}: ${previousLesson.title} terlebih dahulu. Nota dan kuiz modul sebelumnya mesti selesai.`
              : "Selesaikan modul sebelumnya terlebih dahulu. Nota dan kuiz modul sebelumnya mesti selesai."}
          </p>
          <Link
            to={previousLesson ? `/pelajaran/${previousLesson.lesson_id}` : "/pelajaran"}
            className="transition-soft mt-5 inline-flex items-center rounded-full bg-forest px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-forest/25 hover:bg-forest-light"
          >
            {previousLesson ? `Buka Modul ${previousLesson.order} →` : "Kembali ke senarai modul"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8">
      <Link
        to="/pelajaran"
        className="transition-soft inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-sm hover:text-forest"
      >
        ← Semua Modul
      </Link>
      <div className="card-pop mt-4 animate-fade-up overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-forest/5 via-white to-sky/5 px-6 py-5 md:px-8">
          <div>
            <span className="inline-flex items-center rounded-full bg-forest/10 px-3 py-1 text-[11px] font-bold tracking-widest text-forest">
              {module.num.toUpperCase()}
            </span>
            <h1 className="font-display mt-2 text-2xl font-extrabold text-slate-900 md:text-3xl">{module.title}</h1>
            {module.description && <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">{module.description}</p>}
          </div>
          <span aria-hidden className="animate-floaty hidden text-5xl md:block">
            📖
          </span>
        </div>
      </div>

      {error && (
        <div className="mt-6">
          <Alert>{error}</Alert>
        </div>
      )}

      {loading || !dashboard ? (
        <div className="card-pop mt-6 px-8 py-6">
          <Loading text="Menyemak akses modul dan memuatkan nota…" />
        </div>
      ) : (
        <div className="mt-6">
          <SlideViewer
            module={module}
            initiallyViewed={viewed}
            onMarkViewed={markViewed}
            quizPassed={moduleProgress?.quiz_passed ?? false}
          />
        </div>
      )}

      <div className="mt-8">
        {!loading && (quizReady ? (
          <div className="card-pop mx-auto max-w-xl p-5 text-center">
            <p className="text-sm font-bold text-mint-dark">✅ Semua nota modul ini telah selesai.</p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {moduleProgress?.quiz_passed
                ? "Anda sudah lulus kuiz ini. Boleh ulang kuiz untuk markah lebih tinggi."
                : "Kuiz modul kini dibuka. Lulus untuk membuka modul seterusnya."}
            </p>
            <Link
              to={`/kuiz/${module.quiz.id}`}
              className="transition-soft mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-grape to-grape-dark px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-grape/25 hover:-translate-y-0.5"
            >
              {moduleProgress?.quiz_passed ? "🧠 ULANG KUIZ MODUL" : "🧠 JAWAB KUIZ MODUL"} →
            </Link>
          </div>
        ) : allSlidesViewed ? (
          <div className="card-pop mx-auto max-w-xl border-2 border-mint/30 bg-mint-light/40 p-5 text-center">
            <p className="text-sm font-bold text-mint-dark">Menyimpan kemajuan nota…</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Kuiz akan dibuka sebentar lagi.</p>
          </div>
        ) : (
          <div className="card-pop mx-auto max-w-xl border-2 border-slate-200 bg-slate-50/90 p-5 text-center">
            <p className="font-display text-lg font-extrabold text-slate-700">🔒 Kuiz modul masih dikunci</p>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
              Selesaikan semua nota modul ini dahulu. Kemajuan nota: {viewedCount}/{module.slides.length} slaid.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
