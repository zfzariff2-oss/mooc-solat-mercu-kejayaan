import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { AdminStudentDetail } from "@/lib/types";
import { formatDateTimeMY, formatDuration } from "@/lib/utils";
import AdminShell from "@/components/AdminShell";
import { Alert, Card, Loading, PageHeader, ProgressBar } from "@/components/ui";

export default function AdminStudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [data, setData] = useState<AdminStudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!studentId) return;
    supabase
      .rpc("admin_student_detail", { p_student_id: studentId })
      .then(({ data: result, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) setError(rpcError.message);
        else setData(result as AdminStudentDetail);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  return (
    <AdminShell>
      <Link to="/admin/pelajar" className="text-xs font-bold text-forest underline">
        ← Senarai pelajar
      </Link>
      {loading ? (
        <Loading text="Memuatkan butiran pelajar…" />
      ) : error || !data ? (
        <div className="mt-6">
          <Alert>{error ?? "Pelajar tidak dijumpai."}</Alert>
        </div>
      ) : (
        <>
          <div className="mt-2">
            <PageHeader
              kicker="PROGRESS PELAJAR"
              title={data.profile.full_name ?? "Pelajar"}
              desc={`Kelas: ${data.profile.class_name ?? "—"} • Emel: ${data.profile.email}`}
            />
          </div>

          <Card className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold tracking-widest text-grape">PENTAKSIRAN AKHIR</p>
                <p className="font-display mt-1 text-xl font-extrabold text-slate-900">
                  {data.final?.submitted_at
                    ? `${data.final.score}/${data.final.total} • ${data.final.percentage}% • Kedudukan #${data.final.rank ?? "—"}`
                    : data.final
                      ? "Sedang dijawab"
                      : "Belum mula"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {data.final?.submitted_at
                    ? `Masa: ${formatDuration(data.final.duration_seconds)} • ${formatDateTimeMY(data.final.submitted_at)}`
                    : "Pelajar perlu menyelesaikan semua modul sebelum pentaksiran."}
                </p>
              </div>
              {data.certificate && (
                <Link
                  to="/admin/sijil"
                  className="rounded-full bg-forest/10 px-4 py-2 text-xs font-bold text-forest hover:bg-forest hover:text-white"
                >
                  🏆 {data.certificate.certificate_number}
                </Link>
              )}
            </div>
          </Card>

          <div className="mt-6 grid gap-4">
            {data.lessons.map((lesson) => (
              <Card key={lesson.lesson_id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-lg font-extrabold text-slate-900">{lesson.title}</h2>
                  <span className={`text-xs font-bold ${lesson.completed ? "text-mint-dark" : "text-slate-400"}`}>
                    {lesson.completed ? "● SELESAI" : `○ ${lesson.percentage}%`}
                  </span>
                </div>
                <ProgressBar value={lesson.percentage} className="mt-2" />
                <p className="mt-2 text-xs text-slate-500">
                  📖 Slaid {lesson.slides_viewed}/{lesson.total_slides}
                  {lesson.completed_at ? ` • Selesai ${formatDateTimeMY(lesson.completed_at)}` : ""}
                </p>
              </Card>
            ))}
          </div>

          <Card className="mt-6">
            <h2 className="font-display text-xl font-extrabold text-slate-900">📊 Sejarah Kuiz Modul</h2>
            {data.attempts.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">Belum ada percubaan kuiz.</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {data.attempts.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="text-slate-600">
                      {a.quiz_id} <span className="text-xs text-slate-400">• {formatDateTimeMY(a.completed_at)}</span>
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${a.passed ? "bg-mint-light text-mint-dark" : "bg-coral-light text-coral-dark"}`}>
                      {a.percentage}% {a.passed ? "✓" : "✗"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </AdminShell>
  );
}
