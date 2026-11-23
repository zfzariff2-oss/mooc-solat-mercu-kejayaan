import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Module, Slide } from "@/content/publicCourse";
import { cn } from "@/lib/utils";
import { Alert, ProgressBar } from "./ui";
import { playClick, playSuccess } from "@/lib/sfx";
import { cardAudioUrl, playAudioOrSpeak, playCardSequence, stopAllAudio } from "@/lib/tts";

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

type CardVariant = "editorial" | "checklist" | "timeline" | "bento" | "quote";
type CardState = "ready" | "locked" | "playing" | "completed";
type CardTheme = (typeof CARD_THEMES)[number];

function cardTitle(text: string, index: number): string {
  const num = text.match(/^(\d+)\.\s+/);
  if (num) return `Perkara ${num[1]}`;
  if (/^maksud/i.test(text)) return "Maksud";
  if (/^dari segi/i.test(text)) return "Pengertian";
  if (/^syarat/i.test(text)) return "Syarat";
  if (/^antara/i.test(text)) return "Antara";
  if (/^islam/i.test(text)) return "Islam";
  if (/^baligh/i.test(text)) return "Baligh";
  if (/^berakal/i.test(text)) return "Berakal";
  if (/^suci/i.test(text)) return "Suci";
  return `Huraian ${index + 1}`;
}

function splitLead(text: string): { lead: string; rest: string } {
  const colon = text.search(/[:：]/);
  if (colon > 0 && colon <= 70) {
    return { lead: text.slice(0, colon).trim(), rest: text.slice(colon + 1).trim() };
  }
  const sentence = text.match(/^(.{12,90}?[.!?])\s+(.*)$/s);
  if (sentence) return { lead: sentence[1].trim(), rest: sentence[2].trim() };
  return { lead: "", rest: text };
}

function stripTitlePrefix(text: string, title: string): string {
  if (/^(Huraian|Perkara|Antara)\b/i.test(title)) return text;
  const lower = text.toLowerCase();
  const t = title.toLowerCase();
  if (lower.startsWith(t) && text.length > title.length) {
    return text.slice(title.length).replace(/^[\s:：.-]+/, "");
  }
  return text;
}

function Equalizer() {
  return (
    <span aria-hidden className="flex items-end gap-0.5">
      <span className="h-3 w-1 animate-pulse rounded-full bg-current" />
      <span className="h-2 w-1 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
      <span className="h-3.5 w-1 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
    </span>
  );
}

function CardControls({
  state,
  replayEnabled,
  readyLabel,
  onReplay,
  index,
}: {
  state: CardState;
  replayEnabled: boolean;
  readyLabel: string;
  onReplay: (index: number) => void;
  index: number;
}) {
  if (state === "ready") {
    return (
      <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-forest px-4 py-2 text-xs font-bold text-white shadow-sm">
        ▶ {readyLabel}
      </span>
    );
  }
  if (state === "playing") {
    return (
      <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-grape/10 px-3 py-1.5 text-xs font-bold text-grape">
        <Equalizer /> Sedang dimainkan…
      </span>
    );
  }
  if (state === "locked") {
    return (
      <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
        🔒 Menunggu giliran
      </span>
    );
  }
  return (
    <span className="mt-3 flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 rounded-full bg-mint-light px-3 py-1 text-[11px] font-bold text-mint-dark">
        ✓ Selesai
      </span>
      {replayEnabled && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onReplay(index);
          }}
          className="transition-soft inline-flex items-center gap-1 rounded-full bg-forest/10 px-3 py-1 text-[11px] font-bold text-forest hover:bg-forest hover:text-white"
        >
          🔊 Dengar
        </button>
      )}
    </span>
  );
}

function CardContent({
  variant,
  state,
  text,
  index,
  theme,
  replayEnabled,
  readyLabel,
  onReplay,
}: {
  variant: CardVariant;
  state: CardState;
  text: string;
  index: number;
  theme: CardTheme;
  replayEnabled: boolean;
  readyLabel: string;
  onReplay: (index: number) => void;
}) {
  const title = cardTitle(text, index);
  const displayText = text.replace(/^\d+\.\s+/, "");
  const bodyText = stripTitlePrefix(displayText, title);
  const { lead, rest } = splitLead(displayText);
  const showLabel = !lead || lead.toLowerCase() !== title.toLowerCase();
  const locked = state === "locked";
  const featured = state === "ready" || state === "playing";
  const bodyClass = cn(
    "mt-1 leading-6 text-slate-700",
    locked && "line-clamp-2 opacity-60",
    featured && "text-[15px] leading-7",
  );
  const controls = (
    <CardControls
      state={state}
      replayEnabled={replayEnabled}
      readyLabel={readyLabel}
      onReplay={onReplay}
      index={index}
    />
  );

  if (variant === "checklist") {
    return (
      <div className="flex gap-3">
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-extrabold",
            state === "completed" ? "border-mint bg-mint text-white" : cn(theme.border, theme.label),
          )}
        >
          {state === "completed" ? "✓" : index + 1}
        </span>
        <div className="min-w-0 flex-1">
          {showLabel && <p className={cn("text-[10px] font-bold uppercase tracking-[0.18em]", theme.label)}>{title}</p>}
          {lead && <p className="font-display mt-1 text-base font-extrabold text-slate-900">{lead}</p>}
          <p className={cn(bodyClass, lead && "mt-0.5")}>{lead ? rest : bodyText}</p>
          {controls}
        </div>
      </div>
    );
  }

  if (variant === "timeline") {
    return (
      <div className="relative pl-11">
        <span
          aria-hidden
          className={cn(
            "absolute left-0 top-1 z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold text-white shadow-sm",
            state === "completed" ? "bg-mint" : theme.badge,
          )}
        >
          {state === "completed" ? "✓" : index + 1}
        </span>
        <p className={cn("text-[10px] font-bold uppercase tracking-[0.18em]", theme.label)}>{title}</p>
        <p className={cn(bodyClass, "mt-1")}>{bodyText}</p>
        {controls}
      </div>
    );
  }

  if (variant === "bento") {
    return (
      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-1 -top-5 font-display text-6xl font-black leading-none opacity-10"
        >
          {index + 1}
        </span>
        <div className="relative">
          <div className="flex items-center justify-between gap-2">
            <span aria-hidden className="text-2xl">{state === "completed" ? "✅" : CARD_ICONS[index % CARD_ICONS.length]}</span>
            <p className={cn("text-[10px] font-bold uppercase tracking-[0.18em]", theme.label)}>{title}</p>
          </div>
          <p className={cn(bodyClass, "mt-2")}>{bodyText}</p>
          {controls}
        </div>
      </div>
    );
  }

  if (variant === "quote") {
    return (
      <div className="relative text-center">
        <span aria-hidden className="font-display absolute left-1 top-0 text-4xl leading-none text-sand/50">“</span>
        <p
          className={cn(
            "mx-auto max-w-3xl font-display text-base font-semibold leading-8 text-slate-800 md:text-lg",
            locked && "line-clamp-2 opacity-60",
          )}
        >
          {displayText}
        </p>
        <div className="mt-2 flex justify-center">{controls}</div>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <div className="hidden w-10 shrink-0 flex-col items-center md:flex">
        <span className={cn("font-display text-2xl font-black", state === "completed" ? "text-mint" : "text-forest/25")}>
          {state === "completed" ? "✓" : String(index + 1).padStart(2, "0")}
        </span>
        <span className="mt-2 h-full w-px bg-gradient-to-b from-forest/25 to-transparent" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={cn("text-[10px] font-bold uppercase tracking-[0.2em]", theme.label)}>{title}</p>
          <span aria-hidden className="text-lg">{state === "completed" ? "✅" : CARD_ICONS[index % CARD_ICONS.length]}</span>
        </div>
        <p className={cn(bodyClass, "mt-1")}>{bodyText}</p>
        {controls}
      </div>
    </div>
  );
}

function LessonSlide({
  slide,
  completedIndices,
  onCardCompleted,
  revision,
  variant,
}: {
  slide: Slide;
  completedIndices: number[];
  onCardCompleted: (index: number) => void;
  revision: boolean;
  variant: CardVariant;
}) {
  const meta = TYPE_META[slide.type] ?? TYPE_META.TEXT;
  const moduleNo = Number(slide.id.match(/^m(\d+)/)?.[1] ?? 1);
  const theme = CARD_THEMES[(moduleNo - 1) % CARD_THEMES.length];
  const firstIncomplete = slide.body.findIndex((_, i) => !completedIndices.includes(i));
  const allComplete = revision || completedIndices.length >= slide.body.length;
  const [sequenceState, setSequenceState] = useState<"idle" | "playing" | "paused" | "completed">(
    allComplete ? "completed" : "idle",
  );
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const replayEnabled = allComplete || sequenceState === "completed";
  const readyLabel = sequenceState === "paused" ? "Sambung Dengar" : "Mula Dengar";

  useEffect(() => {
    if (completedIndices.length >= slide.body.length && sequenceState !== "completed") {
      setSequenceState("completed");
      setCurrentIndex(null);
    }
  }, [completedIndices.length, slide.body.length, sequenceState]);

  function startSequence() {
    if (allComplete) return;
    const start = firstIncomplete >= 0 ? firstIncomplete : 0;
    playClick();
    setError(null);
    setSequenceState("playing");
    setCurrentIndex(start);
    const items = slide.body.slice(start).map((text, offset) => ({
      url: cardAudioUrl(slide.id, start + offset),
      text,
    }));
    playCardSequence(items, {
      onStart: (i) => setCurrentIndex(start + i),
      onEnd: (i) => onCardCompleted(start + i),
      onComplete: () => {
        setSequenceState("completed");
        setCurrentIndex(null);
        playSuccess();
      },
      onError: (i) => {
        setSequenceState("paused");
        setCurrentIndex(start + i);
        setError("Audio tidak dapat dimainkan. Tekan Sambung untuk cuba lagi.");
      },
    });
  }

  function pauseSequence() {
    playClick();
    stopAllAudio();
    setSequenceState("paused");
    setCurrentIndex(null);
  }

  function replay(index: number) {
    playClick();
    playAudioOrSpeak(cardAudioUrl(slide.id, index), slide.body[index]);
  }

  function stateFor(index: number): CardState {
    if (revision || sequenceState === "completed" || completedIndices.includes(index)) return "completed";
    if (sequenceState === "playing" && currentIndex === index) return "playing";
    if ((sequenceState === "idle" || sequenceState === "paused") && index === firstIncomplete) return "ready";
    return "locked";
  }

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

        {sequenceState === "playing" && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-forest/15 bg-forest/5 px-4 py-3">
            <p className="text-xs font-bold text-forest">
              🔊 Sedang memainkan kad {(currentIndex ?? 0) + 1} / {slide.body.length}…
            </p>
            <button
              onClick={pauseSequence}
              className="transition-soft rounded-full bg-white px-4 py-1.5 text-[11px] font-bold text-forest shadow-sm hover:bg-forest hover:text-white"
            >
              ⏸ Hentikan
            </button>
          </div>
        )}

        {replayEnabled && (
          <div className="mb-4 rounded-2xl bg-mint-light/60 px-4 py-3 text-xs font-semibold text-mint-dark">
            ✅ Semua kad selesai. Anda boleh dengar satu-satu menggunakan butang 🔊 Dengar.
          </div>
        )}

        {error && (
          <div className="mb-4">
            <Alert>{error}</Alert>
          </div>
        )}

        <div className={cn("grid gap-3", variant === "bento" && "md:grid-cols-2", variant === "quote" && "gap-4")}>
          {slide.body.map((text, i) => {
            const state = stateFor(i);
            const borderClass =
              state === "completed" ? "border-mint/50" : state === "playing" ? "border-grape/40" : variant === "quote" ? "border-sand/50" : theme.border;
            const backgroundClass =
              state === "completed"
                ? "bg-mint-light/30"
                : variant === "quote"
                  ? "bg-gradient-to-br from-sun-light/70 via-white to-coral-light/40"
                  : `bg-gradient-to-br ${theme.card}`;
            return (
              <div
                key={i}
                role={state === "ready" ? "button" : undefined}
                tabIndex={state === "ready" ? 0 : undefined}
                onClick={state === "ready" ? startSequence : undefined}
                onKeyDown={
                  state === "ready"
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          startSequence();
                        }
                      }
                    : undefined
                }
                className={cn(
                  "transition-soft relative rounded-2xl border-2 p-4 md:p-5",
                  variant === "editorial" && "border-l-4",
                  variant === "bento" && "overflow-hidden",
                  variant === "timeline" &&
                    "before:absolute before:left-[31px] before:top-12 before:bottom-2 before:w-px before:bg-slate-200 before:content-['']",
                  borderClass,
                  backgroundClass,
                  state === "ready" && "cursor-pointer ring-2 ring-forest/15 hover:-translate-y-0.5 hover:shadow-md",
                  state === "playing" && "ring-2 ring-grape/15 shadow-lg",
                  state === "locked" && "opacity-80",
                )}
              >
                <CardContent
                  variant={variant}
                  state={state}
                  text={text}
                  index={i}
                  theme={theme}
                  replayEnabled={replayEnabled}
                  readyLabel={readyLabel}
                  onReplay={replay}
                />
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
  const previousSlideRef = useRef<string | null>(null);

  const initialSet = useMemo(() => new Set(initiallyViewed), [initiallyViewed]);
  const slide = module.slides[idx];
  const total = module.slides.length;
  const revision = initialSet.has(slide.id) || sessionPassed.has(slide.id);
  const previouslyViewed = initialSet.has(slide.id);
  const completedForSlide = completedCards[slide.id] ?? [];
  const cardsGate = slide.body.length === 0 || completedForSlide.length >= slide.body.length;
  const done = revision || cardsGate;
  const isLast = idx === total - 1;
  const pct = total === 0 ? 0 : Math.round(((idx + 1) / total) * 100);

  const moduleVariant: CardVariant =
    module.order === 2
      ? "checklist"
      : module.order === 3
        ? "timeline"
        : module.order === 4 || module.order === 6
          ? "bento"
          : module.order === 7
            ? "quote"
            : "editorial";
  const variant: CardVariant = slide.type === "QUOTE" || slide.type === "SUMMARY" ? "quote" : moduleVariant;

  useEffect(() => {
    stopAllAudio();
  }, [idx]);

  useEffect(() => {
    return () => stopAllAudio();
  }, []);

  useEffect(() => {
    if (revision) return;
    if (slide.body.length > 0 && completedForSlide.length >= slide.body.length && !sessionPassed.has(slide.id)) {
      setSessionPassed((m) => (m.has(slide.id) ? m : new Set(m).add(slide.id)));
      onMarkViewed(slide.id);
    }
  }, [completedForSlide.length, slide.body.length, slide.id, revision, sessionPassed, onMarkViewed]);

  useEffect(() => {
    const prev = previousSlideRef.current;
    if (prev && prev !== slide.id) {
      const prevSlide = module.slides.find((s) => s.id === prev);
      const prevCompleted = completedCards[prev] ?? [];
      if (prevSlide && prevCompleted.length < prevSlide.body.length && !sessionPassed.has(prev)) {
        setCompletedCards((m) => {
          if (!(prev in m)) return m;
          const next = { ...m };
          delete next[prev];
          return next;
        });
      }
    }
    previousSlideRef.current = slide.id;
  }, [slide.id, module.slides, completedCards, sessionPassed]);

  function completeSlide(slideId: string) {
    playClick();
    setSessionPassed((m) => (m.has(slideId) ? m : new Set(m).add(slideId)));
    onMarkViewed(slideId);
  }

  function markCardCompleted(index: number) {
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
      title="Dengar semua kad sehingga habis dahulu"
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
        variant={variant}
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
            title={done ? "Ke slaid seterusnya" : "Dengar semua kad sehingga habis dahulu"}
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
          <span>Tekan kad pertama dan dengar sehingga kad terakhir untuk membuka slaid seterusnya.</span>
        </div>
      )}
      {previouslyViewed && (
        <p className="mt-4 text-right text-xs font-medium text-sky-dark">📖 Mod ulangkaji — anda bebas mendengar kad satu-satu.</p>
      )}
      {done && !previouslyViewed && (
        <p className="mt-4 text-right text-xs font-medium text-mint-dark">✅ Semua kad selesai — anda boleh teruskan.</p>
      )}
    </div>
  );
}
