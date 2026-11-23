import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/hooks/useDashboard";
import SiteShell, { STUDENT_NAV } from "@/components/SiteShell";
import LessonCard from "@/components/LessonCard";
import { Alert, EmptyState, Loading, PageHeader } from "@/components/ui";

export default function LessonsPage() {
  const { profile } = useAuth();
  const { data, loading, error } = useDashboard();

  return (
    <SiteShell
      kicker="PEMBELAJARAN"
      name={data?.profile.full_name ?? profile?.full_name ?? "Pelajar"}
      code={data?.profile.class_name ?? profile?.class_name ?? "—"}
      nav={STUDENT_NAV}
    >
      <PageHeader
        kicker="SENARAI MODUL"
        title="Pelajaran"
        desc="Setiap modul lengkap apabila semua slaid dibaca DAN kuiz modul diluluskan (80%)."
      />
      {loading ? (
        <Loading text="Memuatkan modul…" />
      ) : error || !data ? (
        <div className="mt-6">
          <Alert>{error ?? "Modul tidak dapat dimuatkan."}</Alert>
        </div>
      ) : data.lessons.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon="📭" title="Belum ada modul." desc="Guru anda akan menerbitkan modul tidak lama lagi." />
        </div>
      ) : (
        <section className="mt-6 grid gap-5 md:grid-cols-2" aria-label="Senarai modul">
          {data.lessons.map((l) => (
            <LessonCard key={l.lesson_id} lesson={l} href={`/pelajaran/${l.lesson_id}`} />
          ))}
        </section>
      )}

      <div className="mt-8 flex justify-center">
        <Link to="/dashboard" className="text-sm font-bold text-forest hover:underline">
          ← Kembali ke dashboard
        </Link>
      </div>
    </SiteShell>
  );
}
