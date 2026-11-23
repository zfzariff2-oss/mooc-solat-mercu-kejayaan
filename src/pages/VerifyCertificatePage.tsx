import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { COURSE_TITLE } from "@/lib/config";
import { formatDateMY } from "@/lib/utils";
import { Alert, Card, Loading } from "@/components/ui";

interface VerifyResult {
  valid: boolean;
  certificate_number?: string;
  student_name?: string;
  class_name?: string;
  issued_at?: string;
  score?: number;
  total?: number;
  duration_seconds?: number;
}

export default function VerifyCertificatePage() {
  const { certificateNumber } = useParams<{ certificateNumber: string }>();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!certificateNumber) return;
      const { data, error: rpcError } = await supabase.rpc("verify_certificate", {
        p_number: certificateNumber,
      });
      if (cancelled) return;
      if (rpcError) setError(rpcError.message);
      else setResult(data as VerifyResult);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [certificateNumber]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-6 py-12">
      {loading ? (
        <Loading text="Menyemak sijil…" />
      ) : error ? (
        <Alert>{error}</Alert>
      ) : !result?.valid ? (
        <Card className="w-full text-center">
          <span aria-hidden className="text-5xl">❌</span>
          <h1 className="font-display mt-3 text-3xl font-extrabold text-slate-900">Sijil Tidak Dijumpai</h1>
          <p className="mt-2 text-sm text-slate-500">
            Nombor sijil <span className="font-mono font-bold">{certificateNumber}</span> tidak sah atau tidak wujud.
          </p>
          <Link to="/sahkan-sijil" className="mt-5 inline-block text-sm font-bold text-forest underline">
            Cuba nombor lain →
          </Link>
        </Card>
      ) : (
        <>
          <span className="inline-flex items-center gap-2 rounded-full bg-mint-light px-4 py-1.5 text-[11px] font-bold tracking-[0.22em] text-mint-dark">
            ✅ VERIFIKASI SIJIL
          </span>
          <h1 className="font-display mt-3 text-4xl font-extrabold text-slate-900">Sijil Sah ✓</h1>
          <Card className="mt-6 w-full animate-fade-up">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
              <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sun-light to-coral-light text-3xl">
                🏆
              </span>
              <div>
                <p className="font-display text-xl font-extrabold text-slate-900">{result.student_name}</p>
                <p className="text-xs font-medium text-slate-400">Telah menamatkan kursus dengan jayanya</p>
              </div>
            </div>
            <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-[11px] font-bold tracking-widest text-slate-400">KURSUS</dt>
                <dd className="mt-1 font-semibold text-slate-800">{COURSE_TITLE}</dd>
              </div>
              {result.class_name && (
                <div className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-[11px] font-bold tracking-widest text-slate-400">KELAS</dt>
                  <dd className="mt-1 font-semibold text-slate-800">{result.class_name}</dd>
                </div>
              )}
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-[11px] font-bold tracking-widest text-slate-400">TARIKH</dt>
                <dd className="mt-1 font-semibold text-slate-800">{formatDateMY(result.issued_at)}</dd>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
                <dt className="text-[11px] font-bold tracking-widest text-slate-400">NO. SIJIL</dt>
                <dd className="mt-1 font-mono font-bold text-slate-800">{result.certificate_number}</dd>
              </div>
            </dl>
          </Card>
          <p className="mt-6 text-sm font-medium text-slate-500">
            <Link to="/" className="font-bold text-forest underline">
              ← Kembali ke halaman utama
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
