import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/hooks/useDashboard";
import { supabase } from "@/lib/supabase";
import { cn, formatDateTimeMY, formatDuration } from "@/lib/utils";
import type { LeaderboardData, LeaderboardEntry } from "@/lib/types";
import SiteShell, { STUDENT_NAV } from "@/components/SiteShell";
import { Alert, Loading, PageHeader } from "@/components/ui";

function Row({ entry, me = false }: { entry: LeaderboardEntry; me?: boolean }) {
  return (
    <tr className={cn(me && "bg-sun-light/50 font-semibold", !me && "even:bg-slate-50/70")}>
      <td className="px-3 py-2 text-center font-mono font-bold text-slate-500">
        {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}
      </td>
      <td className="px-3 py-2 text-slate-800">
        {entry.full_name ?? "—"} {me && <span className="ml-1 rounded-full bg-forest px-2 py-0.5 text-[10px] font-bold text-white">ANDA</span>}
      </td>
      <td className="px-3 py-2 text-slate-500">{entry.class_name ?? "—"}</td>
      <td className="px-3 py-2 text-center font-bold text-forest">{entry.score}/{entry.total}</td>
      <td className="px-3 py-2 text-center">{entry.percentage}%</td>
      <td className="px-3 py-2 text-center font-mono text-xs">{formatDuration(entry.duration_seconds)}</td>
      <td className="px-3 py-2 text-center text-xs text-slate-400">{formatDateTimeMY(entry.submitted_at)}</td>
    </tr>
  );
}

export default function LeaderboardPage() {
  const { profile } = useAuth();
  const { data: dash } = useDashboard();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .rpc("get_leaderboard")
      .then(({ data: result, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) setError(rpcError.message);
        else setData(result as LeaderboardData);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const me = data?.me ?? null;
  const top = data?.top ?? [];
  const meInTop = me ? top.some((t) => t.student_id === me.student_id) : false;

  return (
    <SiteShell
      kicker="RANKING"
      name={dash?.profile.full_name ?? profile?.full_name ?? "Pelajar"}
      code={dash?.profile.class_name ?? profile?.class_name ?? "—"}
      nav={STUDENT_NAV}
    >
      <PageHeader
        kicker="PAPAN RANKING"
        title="Ranking Pentaksiran Akhir"
        desc="Disusun mengikut markah tertinggi, kemudian masa paling singkat. Top 20 dipaparkan."
      />

      {loading ? (
        <Loading text="Memuatkan ranking…" />
      ) : error ? (
        <div className="mt-6">
          <Alert>{error}</Alert>
        </div>
      ) : top.length === 0 ? (
        <div className="mt-6 rounded-3xl border-2 border-dashed border-slate-200 bg-white/70 px-6 py-12 text-center">
          <span aria-hidden className="text-4xl">🏅</span>
          <p className="font-display mt-2 text-xl font-extrabold text-slate-800">Belum ada ranking.</p>
          <p className="mt-1 text-sm text-slate-500">Jadilah yang pertama menghantar pentaksiran akhir!</p>
          <Link to="/pentaksiran" className="mt-4 inline-block rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white">
            Pergi ke Pentaksiran →
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="card-pop overflow-hidden !p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-forest text-white">
                  <tr>
                    <th className="px-3 py-3 text-center font-bold">Rank</th>
                    <th className="px-3 py-3 text-left font-bold">Nama</th>
                    <th className="px-3 py-3 text-left font-bold">Kelas</th>
                    <th className="px-3 py-3 text-center font-bold">Betul</th>
                    <th className="px-3 py-3 text-center font-bold">%</th>
                    <th className="px-3 py-3 text-center font-bold">Masa</th>
                    <th className="px-3 py-3 text-center font-bold">Tarikh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {top.map((entry) => (
                    <Row key={`${entry.student_id}-${entry.rank}`} entry={entry} me={entry.student_id === me?.student_id} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {me && !meInTop && (
            <div className="card-pop overflow-hidden !p-0">
              <div className="bg-sun-light px-4 py-2 text-xs font-bold tracking-widest text-sand-dark">KEDUDUKAN ANDA</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    <Row entry={me} me />
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!me && (
            <Alert kind="info">
              Anda belum mempunyai kedudukan. Selesaikan pentaksiran akhir untuk masuk ranking.
            </Alert>
          )}
        </div>
      )}
    </SiteShell>
  );
}
