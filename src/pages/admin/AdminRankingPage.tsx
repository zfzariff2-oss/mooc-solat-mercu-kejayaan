import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { LeaderboardEntry } from "@/lib/types";
import { cn, formatDateTimeMY, formatDuration } from "@/lib/utils";
import AdminShell from "@/components/AdminShell";
import { Alert, EmptyState, Loading, PageHeader } from "@/components/ui";

export default function AdminRankingPage() {
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .rpc("admin_leaderboard")
      .then(({ data, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) setError(rpcError.message);
        else setRows((data as LeaderboardEntry[]) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminShell>
      <PageHeader
        kicker="RANKING PENUH"
        title="Ranking"
        desc="Semua pelajar yang telah menghantar pentaksiran akhir, disusun mengikut markah dan masa."
      />
      {loading ? (
        <Loading text="Memuatkan ranking…" />
      ) : error ? (
        <div className="mt-6">
          <Alert>{error}</Alert>
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon="🏅" title="Belum ada ranking." desc="Ranking akan muncul selepas pelajar menghantar pentaksiran akhir." />
        </div>
      ) : (
        <div className="card-pop mt-6 overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-forest text-white">
                <tr>
                  <th className="px-4 py-3 text-center font-bold">Rank</th>
                  <th className="px-4 py-3 text-left font-bold">Nama</th>
                  <th className="px-4 py-3 text-left font-bold">Kelas</th>
                  <th className="px-4 py-3 text-center font-bold">Betul</th>
                  <th className="px-4 py-3 text-center font-bold">%</th>
                  <th className="px-4 py-3 text-center font-bold">Masa</th>
                  <th className="px-4 py-3 text-center font-bold">Tarikh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={`${r.student_id}-${r.rank}`} className={cn("even:bg-slate-50/70", r.rank <= 3 && "font-semibold")}>
                    <td className="px-4 py-3 text-center">
                      {r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : `#${r.rank}`}
                    </td>
                    <td className="px-4 py-3 text-slate-800">{r.full_name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{r.class_name ?? "—"}</td>
                    <td className="px-4 py-3 text-center text-forest">{r.score}/{r.total}</td>
                    <td className="px-4 py-3 text-center">{r.percentage}%</td>
                    <td className="px-4 py-3 text-center font-mono text-xs">{formatDuration(r.duration_seconds)}</td>
                    <td className="px-4 py-3 text-center text-xs text-slate-400">{formatDateTimeMY(r.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
