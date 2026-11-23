import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/hooks/useDashboard";
import { COURSE } from "@/content/publicCourse";
import { downloadCertificatePdf } from "@/lib/certificatePdf";
import { playError, playSuccess } from "@/lib/sfx";
import SiteShell, { STUDENT_NAV } from "@/components/SiteShell";
import CertificatePreview from "@/components/CertificatePreview";
import { Alert, EmptyState, Loading, PageHeader } from "@/components/ui";

export default function CertificatePage() {
  const { profile } = useAuth();
  const { data, loading, error } = useDashboard();
  const [pending, setPending] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const cert = data?.certificate ?? null;

  async function download() {
    if (!cert || !data) return;
    setPending(true);
    setPdfError(null);
    try {
      await downloadCertificatePdf({
        studentName: cert.student_name ?? data.profile.full_name ?? "Pelajar",
        className: cert.class_name ?? data.profile.class_name,
        certificateNumber: cert.certificate_number,
        issuedAt: cert.issued_at,
        courseTitle: COURSE.title,
      });
      playSuccess();
    } catch (e) {
      playError();
      setPdfError(e instanceof Error ? e.message : "Gagal menjana PDF.");
    } finally {
      setPending(false);
    }
  }

  return (
    <SiteShell
      kicker="PENCAPAIAN"
      name={data?.profile.full_name ?? profile?.full_name ?? "Pelajar"}
      code={data?.profile.class_name ?? profile?.class_name ?? "—"}
      nav={STUDENT_NAV}
    >
      <PageHeader
        kicker="SIJIL PENYERTAAN"
        title="Sijil Saya"
        desc="Sijil dikeluarkan selepas anda menghantar Pentaksiran Akhir, tanpa mengira markah."
      />

      {loading ? (
        <Loading text="Memuatkan sijil…" />
      ) : error || !data ? (
        <div className="mt-6">
          <Alert>{error ?? "Sijil tidak dapat dimuatkan."}</Alert>
        </div>
      ) : cert ? (
        <div className="mt-6 animate-fade-up">
          <CertificatePreview
            studentName={cert.student_name ?? data.profile.full_name ?? "Pelajar"}
            className={cert.class_name ?? data.profile.class_name}
            certificateNumber={cert.certificate_number}
            issuedAt={cert.issued_at}
            courseTitle={COURSE.title}
            onDownload={download}
            downloadPending={pending}
          />
          {pdfError && (
            <div className="mt-3">
              <Alert>{pdfError}</Alert>
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-400">
            <span>
              Pautan verifikasi awam:{" "}
              <Link className="font-bold text-forest underline" to={`/sijil/${cert.certificate_number}`}>
                /sijil/{cert.certificate_number}
              </Link>
            </span>
            <Link to="/ranking" className="font-bold text-forest underline">
              Lihat ranking →
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-5">
          <div className="card-pop animate-fade-up overflow-hidden bg-gradient-to-br from-sun-light via-white to-coral-light p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-700">
                  Kemajuan ke arah sijil: {data.course_percentage}%
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {data.completed_lessons}/{data.total_lessons} modul selesai
                  {data.final.status === "READY"
                    ? " • Seterusnya: Pentaksiran Akhir"
                    : data.final.status === "IN_PROGRESS"
                      ? " • Pentaksiran sedang dijawab"
                      : " • Selesaikan semua modul dahulu"}
                </p>
              </div>
              <span aria-hidden className="text-4xl">🏆</span>
            </div>
            <div className="mt-5">
              <Link
                to={data.final.status === "READY" || data.final.status === "IN_PROGRESS" || data.final.status === "SUBMITTED" ? "/pentaksiran" : "/pelajaran"}
                className="transition-soft inline-flex items-center rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-forest/25 hover:bg-forest-light"
              >
                {data.final.status === "READY"
                  ? "Ambil Pentaksiran Akhir →"
                  : data.final.status === "IN_PROGRESS"
                    ? "Sambung Pentaksiran →"
                    : data.final.status === "SUBMITTED"
                      ? "Lihat Keputusan →"
                      : "Teruskan belajar →"}
              </Link>
            </div>
          </div>
          <EmptyState
            icon="🎓"
            title="Anda belum memperoleh sijil."
            desc={
              data.final.status === "SUBMITTED"
                ? "Sijil sedang disediakan. Jika masih tiada, hubungi guru anda."
                : "Selesaikan semua modul dan hantar Pentaksiran Akhir untuk melayakkan sijil."
            }
          />
        </div>
      )}
    </SiteShell>
  );
}
