import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MODULES } from "@/content/publicCourse";
import type { AdminAttempts, AdminFinalAttempt } from "@/lib/types";
import { cn, formatDateTimeMY, formatDuration } from "@/lib/utils";
import AdminShell from "@/components/AdminShell";
import { Alert, Card, EmptyState, Loading, PageHeader } from "@/components/ui";

function quizTitle(quizId: string): string {
  return MODULES.find((m) => m.quiz.id === quizId)?.quiz.title ?? quizId;
}

export default function AdminResultsPage() {
  const [data, setData] = useState<AdminAttempts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .rpc("admin_list_attempts")
      .then(({ data: result, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) setError(rpcError.message);
        else setData(result as AdminAttempts);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rankedFinal = useMemo(() => {
    const list = [...(data?.final_attempts ?? [])];
    list.sort(
      (a, b) =>
        b.score - a.score ||
        a.duration_seconds - b.duration_seconds ||
        new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime(),
    );
    return list.map((a, i) => ({ ...a, rank: i + 1 })) as (AdminFinalAttempt & { rank: number })[];
  }, [data]);

  return (
    <AdminShell>
      <PageHeader
        kicker="KEPUTUSAN"
        title="Keputusan"
        desc="Semua percubaan kuiz modul dan pentaksiran akhir pelajar."
      />
      {loading ? (
        <Loading text="Memuatkan keputusan…" />
      ) : error || !data ? (
        <div className="mt-6">
          <Alert>{error ?? "Keputusan tidak dapat dimuatkan."}</Alert>
        </div>
      ) : (
        <div className="mt-6 grid gap-6">
          <Card>
            <h2 className="font-display text-xl font-extrabold text-slate-900">📝 Pentaksiran Akhir</h2>
            {rankedFinal.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">Belum ada pelajar menghantar pentaksiran.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-forest text-white">
                    <tr>
                      <th className="px-3 py-2 text-center font-bold">Rank</th>
                      <th className="px-3 py-2 text-left font-bold">Nama</th>
                      <th className="px-3 py-2 text-left font-bold">Kelas</th>
                      <th className="px-3 py-2 text-center font-bold">Betul</th>
                      <th className="px-3 py-2 text-center font-bold">%</th>
                      <th className="px-3 py-2 text-center font-bold">Masa</th>
                      <th className="px-3 py-2 text-center font-bold">Sijil</th>
                      <th className="px-3 py-2 text-center font-bold">Tarikh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rankedFinal.map((a) => (
                      <tr key={a.id} className="even:bg-slate-50/70">
                        <td className="px-3 py-2 text-center font-bold">#{a.rank}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800">{a.student_name ?? "—"}</td>
                        <td className="px-3 py-2 text-slate-500">{a.class_name ?? "—"}</td>
                        <td className="px-3 py-2 text-center text-forest">{a.score}/{a.total}</td>
                        <td className="px-3 py-2 text-center">{a.percentage}%</td>
                        <td className="px-3 py-2 text-center font-mono text-xs">{formatDuration(a.duration_seconds)}</td>
                        <td className="px-3 py-2 text-center font-mono text-[10px] text-slate-500">{a.certificate_number ?? "—"}</td>
                        <td className="px-3 py-2 text-center text-xs text-slate-400">{formatDateTimeMY(a.submitted_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="font-display text-xl font-extrabold text-slate-900">🧠 Kuiz Modul</h2>
            {data.module_attempts.length === 0 ? (
              <EmptyState icon="🧠" title="Belum ada percubaan kuiz." />
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-grape text-white">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold">Nama</th>
                      <th className="px-3 py-2 text-left font-bold">Kelas</th>
                      <th className="px-3 py-2 text-left font-bold">Kuiz</th>
                      <th className="px-3 py-2 text-center font-bold">Markah</th>
                      <th className="px-3 py-2 text-center font-bold">Status</th>
                      <th className="px-3 py-2 text-center font-bold">Tarikh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.module_attempts.map((a) => (
                      <tr key={a.id} className="even:bg-slate-50/70">
                        <td className="px-3 py-2 font-semibold text-slate-800">{a.student_name ?? "—"}</td>
                        <td className="px-3 py-2 text-slate-500">{a.class_name ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{quizTitle(a.quiz_id)}</td>
                        <td className="px-3 py-2 text-center font-bold">
                          {a.score}/{a.total} <span className="text-xs font-normal text-slate-400">({a.percentage}%)</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", a.passed ? "bg-mint-light text-mint-dark" : "bg-coral-light text-coral-dark")}>
                            {a.passed ? "LULUS" : "GAGAL"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center text-xs text-slate-400">{formatDateTimeMY(a.completed_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </AdminShell>
  );
}
