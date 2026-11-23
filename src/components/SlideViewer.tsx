import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Module, Slide } from "@/content/publicCourse";
import { cn } from "@/lib/utils";
import { ProgressBar } from "./ui";
import { playClick } from "@/lib/sfx";
import { cardAudioUrl, playAudioOrSpeak, stopAllAudio } from "@/lib/tts";

const TYPE_META: Record<string, { label: string; icon: string; header: string; chip: string }> = {
  TEXT: { label: "Bacaan", icon: "📖", header: "from-sky to-sky-dark", chip: "bg-sky/10 text-sky-dark" },
  QUOTE: { label: "Dalil / Bacaan", icon: "🕌", header: "from-forest to-mint", chip: "bg-mint/10 text-mint-dark" },
  SUMMARY: { label: "Rumusan", icon: "🌟", header: "from-sun to-coral", chip: "bg-sun/15 text-sun-dark" },
  ACTIVITY: { label: "Aktiviti", icon: "🎯", header: "from-grape to-grape-dark", chip: "bg-grape/10 text-grape" },
};

const CARD_ICONS = ["📖", "💡", "✨", "🧩", "🎯", "🌿"];

const CARD_THEMES = [
  { card: "from-forest/10 via-white to-mint/10", border: "border-forest/20", badge: "bg-gradient-to-br from-forest to-mint", label: "text-forest", ring: "hover:border-forest/40" },
  { card: "from-sky/10 via-white to-forest/10", border: "border-sky/25", badge: "bg-gradient-to-br from-sky to-forest", label: "text-sky-dark", ring: "hover:border-sky/40" },
  { card: "from-grape/10 via-white to-sky/10", border: "border-grape/25", badge: "bg-gradient-to-br from-grape to-sky", label: "text-grape", ring: "hover:border-grape/40" },
  { card: "from-sun/20 via-white to-coral/10", border: "border-sun/40", badge: "bg-gradient-to-br from-sun to-coral", label: "text-sun-dark", ring: "hover:border-sun/50" },
  { card: "from-coral/10 via-white to-grape/10", border: "border-coral/25", badge: "bg-gradient-to-br from-coral to-grape", label: "text-coral-dark", ring: "hover:border-coral/40" },
  { card: "from-mint/10 via-white to-sky/10", border: "border-mint/40", badge: "bg-gradient-to-br from-mint to-sky", label: "text-mint-dark", ring: "hover:border-mint/50" },
  { card: "from-forest-dark/10 via-white to-sun/10", border: "border-forest/25", badge: "bg-gradient-to-br from-forest-dark to-sun", label: "text-forest-dark", ring: "hover:border-forest/40" },
] as const;

function cardTitle(text: string, index: number): string {
  const num = text.match(/^(\d+)\.\s+/);
  if (num) return `Perkara ${num[1]}`;
  if (/^maksud/i.test(text)) return "Maksud";
  if (/^dari segi/i.test(text)) return "Pengertian";
  if (/^syarat/i.test(text)) return "Syarat";
  return `Huraian ${index + 1}`;
}

function LessonSlide({
  slide,
  completedIndices,
  onCardCompleted,
  revision,
}: {
  slide: Slide;
  completedIndices: number[];
  onCardCompleted: (index: number) => void;
  revision: boolean;
}) {
  const meta = TYPE_META[slide.type] ?? TYPE_META.TEXT;
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const moduleNo = Number(slide.id.match(/^m(\d+)/)?.[1] ?? 1);
  const theme = CARD_THEMES[(moduleNo - 1) % CARD_THEMES.length];

  return (
    <div className="card-pop animate-fade-up overflow-hidden">
      <div className={cn("relative overflow-hidden bg-gradient-to-r px-6 py-6 text-white md:px-10 md:py-8", meta.header)}>
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
        <span aria-hidden className="pointer-events-none absolute -bottom-16 right-24 h-32 w-32 rounded-full bg-white/10" />
        <span aria-hidden className="animate-floaty pointer-events-none absolute right-6 top-5 hidden text-5xl opacity-30 md:block">
          {meta.icon}
        </span>
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/25 px-3 py-1 backdrop-blur-sm">
              {meta.icon} {meta.label}
            </span>
            {slide.standard && <span className="rounded-full bg-white/15 px-3 py-1">Standard {slide.standard}</span>}
            {slide.sourcePage && <span className="rounded-full bg-white/15 px-3 py-1">📄 {slide.sourcePage}</span>}
          </div>
          <h1 className="font-display mt-3 max-w-3xl text-3xl font-extrabold leading-tight drop-shadow-sm md:text-4xl">
            {slide.title}
          </h1>
        </div>
      </div>

      <div className="p-6 md:p-10">
        {slide.arabic && (
          <div className="mb-8 rounded-3xl border border-sun/50 bg-gradient-to-br from-sun-light to-white p-5 md:p-6">
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-sand-dark">
              🕌 Baca dengan tartil
            </p>
            <p className="arabic-text whitespace-pre-line text-right text-xl text-slate-900 md:text-2xl" lang="ar" dir="rtl">
              {slide.arabic}
            </p>
          </div>
        )}

        <div className="grid gap-3">
          {slide.body.map((text, i) => {
            const completed = completedIndices.includes(i) || revision;
            const isOpen = open[i] || completed;
            const icon = CARD_ICONS[i % CARD_ICONS.length];
            return (
              <div key={i} className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen((m) => ({ ...m, [i]: true }));
                    if (!completed) onCardCompleted(i);
                  }}
                  className={cn(
                    "transition-soft flex-1 rounded-2xl border-2 bg-gradient-to-br p-4 text-left shadow-sm hover:-translate-y-0.5",
                    completed
                      ? "border-mint/50 bg-mint-light/40"
                      : `${theme.border} ${theme.card} ${theme.ring}`,
                    i === 0 && "md:p-5",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white shadow-sm",
                        completed ? "bg-mint" : theme.badge,
                      )}
                    >
                      {completed ? "✓" : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest", theme.label)}>
                          {cardTitle(text, i)}
                        </p>
                        <span aria-hidden className="text-base opacity-70">
                          {completed ? "✅" : icon}
                        </span>
                      </div>
                      <p className={cn("mt-1 leading-6 text-slate-700", i === 0 ? "text-[15px]" : "text-sm", !isOpen && "line-clamp-2")}>
                        {text}
                      </p>
                      {!completed && !isOpen && (
                        <p className={cn("mt-2 text-[11px] font-semibold", theme.label)}>
                          Klik untuk baca & tandakan selesai →
                        </p>
                      )}
                      {completed && <p className="mt-2 text-[11px] font-semibold text-mint-dark">✓ Kad selesai</p>}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    playAudioOrSpeak(cardAudioUrl(slide.id, i), text);
                  }}
                  className={cn(
                    "transition-soft flex w-12 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 bg-gradient-to-br text-center hover:-translate-y-0.5",
                    theme.border,
                    theme.card,
                  )}
                  aria-label={`Dengar penerangan kad ${i + 1}`}
                  title="Dengar penerangan"
                >
                  <span aria-hidden className="text-lg">🔊</span>
                  <span className={cn("text-[9px] font-bold", theme.label)}>Dengar</span>
                </button>
              </div>
            );
          })}
        </div>
        {slide.body.length === 0 && <p className="text-sm text-slate-400">Tiada kandungan teks.</p>}
      </div>
    </div>
  );
}

export default function SlideViewer({
  module,
  initiallyViewed,
  onMarkViewed,
}: {
  module: Module;
  initiallyViewed: string[];
  onMarkViewed: (slideId: string) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [sessionPassed, setSessionPassed] = useState<Set<string>>(() => new Set());
  const [completedCards, setCompletedCards] = useState<Record<string, number[]>>({});

  const initialSet = useMemo(() => new Set(initiallyViewed), [initiallyViewed]);
  const slide = module.slides[idx];
  const total = module.slides.length;
  const revision = initialSet.has(slide.id) || sessionPassed.has(slide.id);
  const completedForSlide = completedCards[slide.id] ?? [];
  const cardsGate = slide.body.length === 0 || completedForSlide.length >= slide.body.length;
  const done = revision || cardsGate;
  const isLast = idx === total - 1;
  const pct = total === 0 ? 0 : Math.round(((idx + 1) / total) * 100);

  useEffect(() => {
    stopAllAudio();
  }, [idx]);

  useEffect(() => {
    return () => stopAllAudio();
  }, []);

  function completeSlide(slideId: string) {
    playClick();
    setSessionPassed((m) => (m.has(slideId) ? m : new Set(m).add(slideId)));
    onMarkViewed(slideId);
  }

  function markCardCompleted(index: number) {
    playClick();
    setCompletedCards((m) => {
      const arr = m[slide.id] ?? [];
      if (arr.includes(index)) return m;
      return { ...m, [slide.id]: [...arr, index] };
    });
  }

  const lastAction = done ? (
    <Link
      to={`/kuiz/${module.quiz.id}`}
      onClick={() => completeSlide(slide.id)}
      className="transition-soft rounded-full bg-gradient-to-r from-grape to-grape-dark px-7 py-3 text-sm font-bold tracking-wide text-white shadow-lg shadow-grape/25 hover:-translate-y-0.5"
    >
      JAWAB KUIZ →
    </Link>
  ) : (
    <button
      disabled
      title="Selesaikan semua kad penerangan dahulu"
      className="cursor-not-allowed rounded-full bg-slate-200 px-7 py-3 text-sm font-bold tracking-wide text-slate-400"
    >
      🔒 JAWAB KUIZ
    </button>
  );

  return (
    <div>
      <div className="card-pop mb-6 p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
          <Link to="/pelajaran" className="transition-soft inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 hover:bg-forest/5 hover:text-forest">
            ← Senarai Modul
          </Link>
          <span className="rounded-full bg-forest/10 px-3 py-1 text-forest">
            Slaid {idx + 1} / {total}
          </span>
        </div>
        <ProgressBar value={pct} className="mt-3" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {module.slides.map((s, i) => {
            const seen = initialSet.has(s.id) || sessionPassed.has(s.id);
            return (
              <span
                key={s.id}
                aria-hidden
                className={cn(
                  "h-2.5 flex-1 rounded-full",
                  i === idx ? "bg-gradient-to-r from-forest to-sky" : seen ? "bg-mint/70" : "bg-slate-200",
                )}
              />
            );
          })}
        </div>
        <p className="mt-3 text-[11px] font-medium text-slate-400">
          {module.num}: {module.title}
        </p>
      </div>

      <LessonSlide
        key={slide.id}
        slide={slide}
        completedIndices={completedForSlide}
        onCardCompleted={markCardCompleted}
        revision={revision}
      />

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          onClick={() => {
            playClick();
            setIdx((i) => Math.max(0, i - 1));
          }}
          disabled={idx === 0}
          className="transition-soft rounded-full border-2 border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 hover:border-forest/30 hover:text-forest disabled:opacity-30"
        >
          ← Kembali
        </button>

        {!isLast ? (
          <button
            onClick={() => {
              if (!done) return;
              completeSlide(slide.id);
              setIdx((i) => i + 1);
            }}
            disabled={!done}
            title={done ? "Ke slaid seterusnya" : "Tekan setiap kad dahulu"}
            className={cn(
              "transition-soft rounded-full px-7 py-3 text-sm font-bold tracking-wide",
              done
                ? "bg-gradient-to-r from-forest to-forest-light text-white shadow-lg shadow-forest/25 hover:-translate-y-0.5"
                : "cursor-not-allowed bg-slate-200 text-slate-400",
            )}
          >
            {done ? "SETERUSNYA →" : "🔒 SETERUSNYA"}
          </button>
        ) : (
          lastAction
        )}
      </div>

      {!done && (
        <div className="mt-4 flex items-start justify-end gap-2 text-right text-xs font-medium text-sand-dark">
          <span aria-hidden>🔒</span>
          <span>Tekan setiap kad penerangan untuk membuka slaid seterusnya.</span>
        </div>
      )}
      {revision && (
        <p className="mt-4 text-right text-xs font-medium text-sky-dark">📖 Mod ulangkaji — anda bebas meneroka slaid ini.</p>
      )}
      {done && !revision && (
        <p className="mt-4 text-right text-xs font-medium text-mint-dark">✅ Semua kad selesai — anda boleh teruskan.</p>
      )}
    </div>
  );
}
