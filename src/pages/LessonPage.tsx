import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getModule } from "@/content/publicCourse";
import { supabase } from "@/lib/supabase";
import SlideViewer from "@/components/SlideViewer";
import { Alert } from "@/components/ui";
import SiteShell, { STUDENT_NAV } from "@/components/SiteShell";

export default function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { session, profile } = useAuth();
  const module = lessonId ? getModule(lessonId) : undefined;
  const [viewed, setViewed] = useState<string[]>([]);
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

  function markViewed(slideId: string) {
    if (!module || !session) return;
    setViewed((prev) => (prev.includes(slideId) ? prev : [...prev, slideId]));
    void supabase
      .rpc("mark_slide_viewed", { p_lesson_id: module.id, p_slide_id: slideId })
      .then(({ error: rpcError }) => {
        if (rpcError) console.error(rpcError.message);
      });
  }

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

      {loading ? (
        <div className="card-pop mt-6 p-8 text-sm text-slate-500">Memuatkan slaid…</div>
      ) : (
        <div className="mt-6">
          <SlideViewer module={module} initiallyViewed={viewed} onMarkViewed={markViewed} />
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <Link
          to={`/kuiz/${module.quiz.id}`}
          className="transition-soft inline-flex items-center gap-2 rounded-full border-2 border-forest/20 bg-white px-5 py-2.5 text-sm font-bold text-forest hover:bg-forest hover:text-white"
        >
          🧠 Pergi ke Kuiz Modul
        </Link>
      </div>
    </div>
  );
}
