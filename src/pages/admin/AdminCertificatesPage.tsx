import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { COURSE } from "@/content/publicCourse";
import { downloadCertificatePdf } from "@/lib/certificatePdf";
import type { AdminCertificateRow } from "@/lib/types";
import { formatDateMY, formatDuration } from "@/lib/utils";
import AdminShell from "@/components/AdminShell";
import { Alert, EmptyState, Loading, PageHeader } from "@/components/ui";

export default function AdminCertificatesPage() {
  const [rows, setRows] = useState<AdminCertificateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .rpc("admin_list_certificates")
      .then(({ data, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) setError(rpcError.message);
        else setRows((data as AdminCertificateRow[]) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function download(row: AdminCertificateRow) {
    setPending(row.certificate_number);
    try {
      await downloadCertificatePdf({
        studentName: row.student_name ?? "Pelajar",
        className: row.class_name,
        certificateNumber: row.certificate_number,
        issuedAt: row.issued_at,
        courseTitle: COURSE.title,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menjana PDF.");
    } finally {
      setPending(null);
    }
  }

  return (
    <AdminShell>
      <PageHeader kicker="PEMANTAUAN SIJIL" title="Sijil" desc={`${rows.length} sijil dikeluarkan.`} />
      {loading ? (
        <Loading text="Memuatkan sijil…" />
      ) : error ? (
        <div className="mt-6">
          <Alert>{error}</Alert>
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon="🏆" title="Belum ada sijil dikeluarkan." desc="Sijil dijana selepas pelajar menghantar pentaksiran akhir." />
        </div>
      ) : (
        <div className="card-pop mt-6 overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-forest text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">No. Sijil</th>
                  <th className="px-4 py-3 text-left font-bold">Nama</th>
                  <th className="px-4 py-3 text-left font-bold">Kelas</th>
                  <th className="px-4 py-3 text-center font-bold">Markah</th>
                  <th className="px-4 py-3 text-center font-bold">Masa</th>
                  <th className="px-4 py-3 text-center font-bold">Tarikh</th>
                  <th className="px-4 py-3 text-center font-bold">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.certificate_number} className="even:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">
                      <Link to={`/sijil/${r.certificate_number}`} className="underline decoration-slate-300 hover:text-forest">
                        {r.certificate_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{r.student_name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{r.class_name ?? "—"}</td>
                    <td className="px-4 py-3 text-center">{r.score != null ? `${r.score}/${r.total}` : "—"}</td>
                    <td className="px-4 py-3 text-center font-mono text-xs">{formatDuration(r.duration_seconds)}</td>
                    <td className="px-4 py-3 text-center text-xs text-slate-400">{formatDateMY(r.issued_at)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => void download(r)}
                        disabled={pending === r.certificate_number}
                        className="rounded-full bg-forest/10 px-3 py-1 text-xs font-bold text-forest hover:bg-forest hover:text-white disabled:opacity-50"
                      >
                        {pending === r.certificate_number ? "Menjana…" : "📥 PDF"}
                      </button>
                    </td>
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
