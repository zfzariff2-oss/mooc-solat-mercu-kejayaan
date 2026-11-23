import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/hooks/useDashboard";
import { FINAL_QUIZ, FINAL_QUESTION_COUNT } from "@/content/publicCourse";
import { supabase } from "@/lib/supabase";
import { cn, formatDuration } from "@/lib/utils";
import type { ReviewItem } from "@/lib/types";
import SiteShell, { STUDENT_NAV } from "@/components/SiteShell";
import AssessmentRunner from "@/components/AssessmentRunner";
import { Alert, Loading, PageHeader, PrimaryButton, ProgressBar } from "@/components/ui";

type Answer = "A" | "B" | "C" | "D";

function optionText(q: (typeof FINAL_QUIZ.questions)[number], key: Answer): string {
  if (key === "A") return q.optionA;
  if (key === "B") return q.optionB;
  if (key === "C") return q.optionC;
  return q.optionD;
}

export default function AssessmentPage() {
  const { profile } = useAuth();
  const { data, loading, error, reload } = useDashboard();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewItem[] | null>(null);

  const final = data?.final;
  const submitted = final?.status === "SUBMITTED";

  useEffect(() => {
    if (!submitted) return;
    let cancelled = false;
    supabase
      .rpc("get_final_review")
      .then(({ data: result, error: rpcError }) => {
        if (cancelled) return;
        if (!rpcError) setReview((result as ReviewItem[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [submitted]);

  async function start() {
    setStarting(true);
    setStartError(null);
    try {
      const { error: rpcError } = await supabase.rpc("start_final_assessment");
      if (rpcError) {
        setStartError(rpcError.message);
        return;
      }
      await reload();
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "Gagal memulakan pentaksiran.");
    } finally {
      setStarting(false);
    }
  }

  const shell = (children: React.ReactNode) => (
    <SiteShell
      kicker="PENTAKSIRAN"
      name={data?.profile.full_name ?? profile?.full_name ?? "Pelajar"}
      code={data?.profile.class_name ?? profile?.class_name ?? "—"}
      nav={STUDENT_NAV}
    >
      {children}
    </SiteShell>
  );

  if (loading) {
    return shell(<Loading text="Menyemak status pentaksiran…" />);
  }

  if (error || !data) {
    return shell(<Alert>{error ?? "Status pentaksiran tidak dapat dimuatkan."}</Alert>);
  }

  if (!final) {
    return shell(<Alert>Status pentaksiran tidak dijumpai.</Alert>);
  }

  if (final.status === "LOCKED") {
    return shell(
      <>
        <PageHeader
          kicker="PENTAKSIRAN AKHIR"
          title="Pentaksiran Akhir"
          desc={`${FINAL_QUESTION_COUNT} soalan • Satu percubaan • Sijil diberikan tanpa kira markah.`}
        />
        <div className="mt-6 grid gap-5">
          <div className="card-pop animate-fade-up overflow-hidden bg-gradient-to-br from-sun-light via-white to-coral-light p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-700">
                  Selesaikan semua modul dahulu — kemajuan {data.course_percentage}%
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {data.completed_lessons}/{data.total_lessons} modul selesai • Pentaksiran dibuka secara automatik.
                </p>
              </div>
              <span aria-hidden className="text-4xl">🔒</span>
            </div>
            <ProgressBar value={data.course_percentage} className="mt-4" />
            <div className="mt-5">
              <Link
                to="/pelajaran"
                className="transition-soft inline-flex items-center rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-forest/25 hover:bg-forest-light"
              >
                Teruskan belajar →
              </Link>
            </div>
          </div>
          <Alert kind="info">
            Setiap modul perlu diselesaikan (semua slaid + lulus kuiz 80%) sebelum pentaksiran akhir dibuka.
          </Alert>
        </div>
      </>
    );
  }

  if (final.status === "IN_PROGRESS" && final.started_at) {
    return shell(
      <>
        <PageHeader
          kicker="PENTAKSIRAN AKHIR"
          title="Pentaksiran Akhir"
          desc={`${FINAL_QUESTION_COUNT} soalan • Satu percubaan • Masa sedang berjalan.`}
        />
        <div className="mt-6">
          <AssessmentRunner
            questions={FINAL_QUIZ.questions}
            startedAt={final.started_at}
            onSubmitted={() => void reload()}
          />
        </div>
      </>
    );
  }

  if (submitted) {
    return shell(
      <>
        <PageHeader
          kicker="PENTAKSIRAN AKHIR"
          title="Keputusan Pentaksiran"
          desc="Keputusan muktamad — hanya satu percubaan dibenarkan."
        />
        <div className="mt-6 grid gap-5">
          <div className="card-pop animate-fade-up overflow-hidden bg-gradient-to-br from-mint-light via-white to-sky-light p-6 text-center">
            <span aria-hidden className="animate-floaty inline-block text-5xl">🎉</span>
            <h2 className="font-display mt-2 text-3xl font-extrabold text-slate-900">Tahniah — pentaksiran selesai!</h2>
            <p className="mt-2 text-sm text-slate-600">
              Sijil anda telah dikeluarkan tanpa mengira markah. Teruskan usaha menjadi mukmin yang bertakwa.
            </p>
            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">Markah Anda</p>
            <p className="font-display mt-1 text-6xl font-extrabold text-forest">
              {final.score}
              <span className="text-2xl text-slate-400"> / {final.total}</span>
            </p>
            <p className="font-display mt-1 text-xl font-extrabold text-slate-700">{final.percentage}%</p>
            <div className="mx-auto mt-4 flex max-w-md flex-wrap items-center justify-center gap-2 text-sm">
              <span className="rounded-full bg-white px-4 py-1.5 font-bold text-slate-600 shadow-sm">
                ⏱ {formatDuration(final.duration_seconds)}
              </span>
              <span className="rounded-full bg-sun-light px-4 py-1.5 font-bold text-sand-dark">
                🏅 Kedudukan #{final.rank ?? "—"}
              </span>
              {final.certificate_number && (
                <span className="rounded-full bg-white px-4 py-1.5 font-mono text-xs font-bold text-slate-500 shadow-sm">
                  {final.certificate_number}
                </span>
              )}
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/sijil"
                className="transition-soft rounded-full bg-gradient-to-r from-sun to-coral px-7 py-3 text-sm font-bold tracking-wide text-white shadow-lg shadow-coral/25 hover:-translate-y-0.5"
              >
                🏆 LIHAT SIJIL
              </Link>
              <Link
                to="/ranking"
                className="transition-soft rounded-full border-2 border-forest/20 bg-white px-6 py-2.5 text-sm font-bold text-forest hover:bg-forest hover:text-white"
              >
                🏅 Lihat Ranking
              </Link>
            </div>
          </div>

          {review && review.length > 0 && (
            <>
              <h2 className="font-display text-2xl font-extrabold text-slate-900">📋 Semakan Jawapan</h2>
              <ol className="grid gap-4">
                {review.map((r, i) => {
                  const question = FINAL_QUIZ.questions.find((qq) => qq.id === r.question_id);
                  return (
                    <li
                      key={r.question_id}
                      className={cn("card-pop rounded-2xl border-l-4 p-5", r.is_correct ? "border-l-mint" : "border-l-coral")}
                    >
                      <p className="font-semibold text-slate-800">
                        {i + 1}. {question?.question ?? r.question_id}
                      </p>
                      <p className="mt-2 text-sm">
                        Jawapan anda:{" "}
                        <span className={cn("font-bold", r.is_correct ? "text-mint-dark" : "text-coral-dark")}>
                          {r.given}. {question ? optionText(question, r.given as Answer) : ""}
                        </span>
                        {!r.is_correct && question && (
                          <>
                            {" "}• Jawapan betul:{" "}
                            <span className="font-bold text-mint-dark">
                              {r.correct_answer}. {optionText(question, r.correct_answer)}
                            </span>
                          </>
                        )}{" "}
                        {r.is_correct ? "✓" : "✗"}
                      </p>
                      {r.explanation && (
                        <p className="mt-2 rounded-xl bg-sun-light/70 px-3 py-2 text-sm text-slate-600">💡 {r.explanation}</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </div>
      </>
    );
  }

  // READY
  return shell(
    <>
      <PageHeader
        kicker="PENTAKSIRAN AKHIR"
        title="Pentaksiran Akhir"
        desc={`${FINAL_QUESTION_COUNT} soalan merangkumi keseluruhan kursus. Satu percubaan sahaja.`}
      />
      <div className="mt-6 grid gap-5">
        <div className="card-pop animate-fade-up overflow-hidden bg-gradient-to-r from-grape/10 via-white to-sky/10 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="inline-flex items-center rounded-full bg-grape/10 px-3 py-1 text-[11px] font-bold tracking-widest text-grape">
                📝 {FINAL_QUESTION_COUNT} SOALAN
              </span>
              <h2 className="font-display mt-2 text-2xl font-extrabold text-slate-900">Sedia untuk pentaksiran akhir?</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Anda hanya boleh menjawab <b>sekali sahaja</b>. Masa bermula sebaik sahaja anda menekan butang di bawah.
                Sijil akan diberikan selepas anda menghantar, tanpa mengira markah.
              </p>
            </div>
            <span aria-hidden className="animate-floaty hidden text-5xl md:block">🎯</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="card-pop p-5">
            <p className="text-xs font-bold tracking-widest text-slate-400">BAHAGIAN A</p>
            <p className="font-display mt-1 text-lg font-extrabold text-slate-800">10 Soalan Objektif</p>
            <p className="mt-1 text-xs text-slate-500">Empat pilihan jawapan A–D.</p>
          </div>
          <div className="card-pop p-5">
            <p className="text-xs font-bold tracking-widest text-slate-400">BAHAGIAN B</p>
            <p className="font-display mt-1 text-lg font-extrabold text-slate-800">5 Betul / Salah</p>
            <p className="mt-1 text-xs text-slate-500">Tentukan sama ada pernyataan betul atau salah.</p>
          </div>
          <div className="card-pop p-5">
            <p className="text-xs font-bold tracking-widest text-slate-400">BAHAGIAN C</p>
            <p className="font-display mt-1 text-lg font-extrabold text-slate-800">5 Padanan</p>
            <p className="mt-1 text-xs text-slate-500">Pilih istilah yang tepat bagi setiap pernyataan.</p>
          </div>
        </div>

        <Alert kind="info">
          Ranking disusun mengikut markah tertinggi, kemudian masa paling singkat. Anda boleh melihat top 20 dan
          kedudukan sendiri selepas menghantar.
        </Alert>

        {startError && <Alert>{startError}</Alert>}

        <div className="flex flex-wrap items-center gap-3">
          <PrimaryButton onClick={start} disabled={starting}>
            {starting ? "Memulakan…" : "MULA PENTAKSIRAN →"}
          </PrimaryButton>
          <Link to="/pelajaran" className="text-sm font-bold text-forest underline">
            Ulang kaji modul dahulu
          </Link>
        </div>
      </div>
    </>
  );
}
