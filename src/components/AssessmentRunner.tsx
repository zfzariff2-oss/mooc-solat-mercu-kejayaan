import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Question } from "@/content/publicCourse";
import type { FinalSubmitResult } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { cn, formatClock } from "@/lib/utils";
import { Alert, PrimaryButton } from "./ui";

type Answer = "A" | "B" | "C" | "D";
const ALL_OPTIONS: Answer[] = ["A", "B", "C", "D"];

function optionText(q: Question, key: Answer): string {
  if (key === "A") return q.optionA;
  if (key === "B") return q.optionB;
  if (key === "C") return q.optionC;
  return q.optionD;
}

function visibleOptions(q: Question): Answer[] {
  return ALL_OPTIONS.filter((k) => optionText(q, k).trim().length > 0);
}

export default function AssessmentRunner({
  questions,
  startedAt,
  onSubmitted,
}: {
  questions: Question[];
  startedAt: string;
  onSubmitted?: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FinalSubmitResult | null>(null);
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)),
  );

  useEffect(() => {
    if (result) return;
    const timer = window.setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt, result]);

  const q = questions[idx];
  const answered = Object.keys(answers).length;
  const allAnswered = answered === questions.length;
  const progressPct = questions.length === 0 ? 0 : Math.round((answered / questions.length) * 100);

  const questionById = useMemo(() => new Map(questions.map((qq) => [qq.id, qq])), [questions]);

  function pick(questionId: string, a: Answer) {
    if (result) return;
    setAnswers((m) => ({ ...m, [questionId]: a }));
  }

  async function submit() {
    if (submitting || !allAnswered) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, Answer> = {};
      for (const qq of questions) {
        const a = answers[qq.id];
        if (a) payload[qq.id] = a;
      }
      const { data, error: rpcError } = await supabase.rpc("submit_final_assessment", {
        p_answers: payload,
      });
      if (rpcError) {
        setError(rpcError.message);
        return;
      }
      setResult(data as FinalSubmitResult);
      onSubmitted?.();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghantar pentaksiran.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="animate-fade-up">
        <div className="card-pop overflow-hidden bg-gradient-to-br from-mint-light via-white to-sky-light text-center">
          <div className="px-6 py-8">
            <span aria-hidden className="animate-floaty inline-block text-5xl">🎉</span>
            <p className="font-display mt-2 text-3xl font-extrabold text-slate-900">Pentaksiran selesai!</p>
            <p className="mt-2 text-sm text-slate-600">
              Sijil anda telah dikeluarkan tanpa mengira markah. Tahniah kerana menyelesaikan kursus ini.
            </p>
            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">Markah Anda</p>
            <p className="font-display mt-1 text-6xl font-extrabold text-forest">
              {result.score}
              <span className="text-2xl text-slate-400"> / {result.total}</span>
            </p>
            <p className="font-display mt-1 text-xl font-extrabold text-slate-700">{result.percentage}%</p>
            <div className="mx-auto mt-4 flex max-w-md flex-wrap items-center justify-center gap-2 text-sm">
              <span className="rounded-full bg-white px-4 py-1.5 font-bold text-slate-600 shadow-sm">
                ⏱ {formatClock(result.duration_seconds)}
              </span>
              <span className="rounded-full bg-sun-light px-4 py-1.5 font-bold text-sand-dark">
                🏅 Kedudukan #{result.rank}
              </span>
              <span className="rounded-full bg-white px-4 py-1.5 font-mono text-xs font-bold text-slate-500 shadow-sm">
                {result.certificate_number}
              </span>
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
            <p className="mt-4 text-xs text-slate-400">Hanya satu percubaan dibenarkan — keputusan ini adalah muktamad.</p>
          </div>
        </div>

        <h2 className="font-display mt-8 text-2xl font-extrabold text-slate-900">📋 Semakan Jawapan</h2>
        <ol className="mt-4 space-y-4">
          {result.review.map((r, i) => {
            const question = questionById.get(r.question_id);
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
      </div>
    );
  }

  if (!q) return <Alert>Pentaksiran ini belum mempunyai soalan.</Alert>;

  return (
    <div>
      <div className="card-pop p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500">
          <span className="rounded-full bg-grape/10 px-3 py-1 text-grape">
            📝 Soalan {idx + 1} / {questions.length}
          </span>
          <span className="rounded-full bg-sun-light px-3 py-1 font-mono font-bold text-sand-dark" aria-live="polite">
            ⏱ {formatClock(elapsed)}
          </span>
        </div>
        <div className="mt-3 flex gap-1.5" aria-hidden>
          {questions.map((qq, i) => (
            <button
              key={qq.id}
              onClick={() => setIdx(i)}
              tabIndex={-1}
              className={cn(
                "h-2.5 flex-1 rounded-full",
                answers[qq.id] ? "bg-gradient-to-r from-grape to-sky" : i === idx ? "bg-grape/40" : "bg-slate-200",
              )}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] font-medium text-slate-400">
          Dijawab {answered}/{questions.length} • {progressPct}% • Satu percubaan sahaja
        </p>
      </div>

      <div key={q.id} className="card-pop animate-pop-in mt-5 p-6 md:p-8">
        <p className="font-display text-xl font-extrabold leading-relaxed text-slate-900 md:text-2xl">{q.question}</p>
        <div className="mt-5 grid gap-3" role="radiogroup" aria-label={`Soalan ${idx + 1}`}>
          {visibleOptions(q).map((opt) => {
            const selected = answers[q.id] === opt;
            return (
              <button
                key={opt}
                role="radio"
                aria-checked={selected}
                onClick={() => pick(q.id, opt)}
                className={cn(
                  "transition-soft flex w-full items-start gap-3.5 rounded-2xl border-2 px-4 py-3.5 text-left text-[15px]",
                  selected
                    ? "border-grape bg-grape-light/60 font-semibold shadow-md shadow-grape/10"
                    : "border-slate-200 bg-white hover:border-grape/40 hover:bg-grape-light/20",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold",
                    selected ? "bg-gradient-to-br from-grape to-grape-dark text-white" : "bg-slate-100 text-slate-500",
                  )}
                >
                  {opt}
                </span>
                <span className="text-slate-700">{optionText(q, opt)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="transition-soft rounded-full border-2 border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 hover:border-forest/30 hover:text-forest disabled:opacity-30"
        >
          ← Sebelum
        </button>
        {idx < questions.length - 1 ? (
          <PrimaryButton onClick={() => setIdx((i) => i + 1)}>SETERUSNYA →</PrimaryButton>
        ) : (
          <PrimaryButton onClick={submit} disabled={!allAnswered || submitting} title={allAnswered ? "Hantar jawapan" : "Jawab semua soalan dahulu"}>
            {submitting ? "Menghantar…" : "HANTAR PENTAKSIRAN 🚀"}
          </PrimaryButton>
        )}
      </div>
      {!allAnswered && (
        <p className="mt-3 text-right text-xs font-medium text-slate-400">Jawab semua {questions.length} soalan untuk menghantar.</p>
      )}
    </div>
  );
}
