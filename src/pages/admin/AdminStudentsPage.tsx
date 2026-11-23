import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { AdminStudent } from "@/lib/types";
import { formatDateTimeMY, formatDuration } from "@/lib/utils";
import AdminShell from "@/components/AdminShell";
import { Alert, EmptyState, Loading, PageHeader } from "@/components/ui";

export default function AdminStudentsPage() {
  const { profile } = useAuth();
  const isTeacher = profile?.role === "TEACHER";
  const [rows, setRows] = useState<AdminStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .rpc("admin_list_students")
      .then(({ data, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) setError(rpcError.message);
        else setRows((data as AdminStudent[]) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminShell>
      <PageHeader
        kicker={isTeacher ? "PELAJAR KELAS SAYA" : "PENGURUSAN PELAJAR"}
        title="Pelajar"
        desc={
          isTeacher
            ? `Hanya pelajar dalam kelas ${profile?.assigned_classes?.join(", ") || "anda"} dipaparkan.`
            : "Pelajar mendaftar sendiri melalui akaun Google. Nama penuh dan kelas diisi pada log masuk pertama."
        }
      />
      {loading ? (
        <Loading text="Memuatkan pelajar…" />
      ) : error ? (
        <div className="mt-6">
          <Alert>{error}</Alert>
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon="🎓" title="Belum ada pelajar." desc="Pelajar akan muncul selepas mereka log masuk dengan akaun Google." />
        </div>
      ) : (
        <div className="card-pop mt-6 overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-forest text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">Nama</th>
                  <th className="px-4 py-3 text-left font-bold">Kelas</th>
                  <th className="px-4 py-3 text-left font-bold">Emel</th>
                  <th className="px-4 py-3 text-center font-bold">Modul</th>
                  <th className="px-4 py-3 text-center font-bold">Akhir</th>
                  <th className="px-4 py-3 text-center font-bold">Masa</th>
                  <th className="px-4 py-3 text-center font-bold">Sijil</th>
                  <th className="px-4 py-3 text-center font-bold">Butiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="even:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {r.full_name ?? "—"}
                      {!r.profile_completed && (
                        <span className="ml-2 rounded-full bg-sun-light px-2 py-0.5 text-[10px] font-bold text-sand-dark">profil belum lengkap</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{r.class_name ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{r.email}</td>
                    <td className="px-4 py-3 text-center">
                      {r.completed_lessons}/{r.total_lessons}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.final_score != null ? `${r.final_score}/${r.final_total}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-xs">
                      {r.final_duration != null ? formatDuration(r.final_duration) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.certificate_number ? (
                        <span className="rounded-full bg-mint-light px-2 py-0.5 text-[10px] font-bold text-mint-dark">ADA</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link to={`/admin/pelajar/${r.id}`} className="text-xs font-bold text-forest underline">
                        Lihat →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {rows.length > 0 && (
        <p className="mt-3 text-xs text-slate-400">
          Dikemas kini: {formatDateTimeMY(new Date().toISOString())}
        </p>
      )}
    </AdminShell>
  );
}
