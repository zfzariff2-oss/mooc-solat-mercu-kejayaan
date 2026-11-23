import { Link } from "react-router-dom";
import type { LessonProgress } from "@/lib/types";
import { Card, ProgressBar } from "./ui";
import { cn } from "@/lib/utils";
import { playClick } from "@/lib/sfx";

const TONES = [
  { chip: "bg-forest/10 text-forest", btn: "bg-gradient-to-r from-forest to-forest-light shadow-forest/25", emoji: "📗", ring: "group-hover:ring-forest/20" },
  { chip: "bg-grape/10 text-grape", btn: "bg-gradient-to-r from-grape to-grape-dark shadow-grape/25", emoji: "📘", ring: "group-hover:ring-grape/20" },
  { chip: "bg-sky/10 text-sky-dark", btn: "bg-gradient-to-r from-sky to-sky-dark shadow-sky/25", emoji: "📙", ring: "group-hover:ring-sky/20" },
  { chip: "bg-coral/10 text-coral-dark", btn: "bg-gradient-to-r from-coral to-coral-dark shadow-coral/25", emoji: "📕", ring: "group-hover:ring-coral/20" },
  { chip: "bg-sun/15 text-sun-dark", btn: "bg-gradient-to-r from-sun to-sun-dark shadow-sun/25", emoji: "📒", ring: "group-hover:ring-sun/25" },
  { chip: "bg-mint/10 text-mint-dark", btn: "bg-gradient-to-r from-mint to-mint-dark shadow-mint/25", emoji: "📔", ring: "group-hover:ring-mint/20" },
];

export default function LessonCard({ lesson, href }: { lesson: LessonProgress; href: string }) {
  const done = lesson.completed;
  const tone = TONES[(lesson.order - 1) % TONES.length];
  return (
    <Card className={cn("card-hover group relative animate-fade-up overflow-hidden ring-2 ring-transparent", tone.ring)}>
      <span aria-hidden className="pointer-events-none absolute -right-2 -top-5 text-[5.5rem] leading-none opacity-10">
        {tone.emoji}
      </span>
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold tracking-widest", tone.chip)}>
            MODUL {lesson.order}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold",
              done ? "bg-mint-light text-mint-dark" : "bg-slate-100 text-slate-500",
            )}
          >
            {done ? "✓ SELESAI" : `${lesson.percentage}%`}
          </span>
        </div>
        <h2 className="font-display mt-3 max-w-[92%] text-2xl font-extrabold leading-snug text-slate-900">{lesson.title}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            📖 Slaid {lesson.slides_viewed}/{lesson.total_slides}
          </span>
          <span className={cn("inline-flex items-center gap-1.5", lesson.quiz_passed ? "text-mint-dark" : "text-slate-400")}>
            {lesson.quiz_passed ? "🧠 Kuiz lulus" : "🧠 Kuiz belum lulus"}
          </span>
        </div>
        <ProgressBar value={lesson.percentage} className="mt-4" />
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">{lesson.total_slides} slaid interaktif</span>
          <Link
            to={href}
            onClick={playClick}
            className={cn(
              "transition-soft rounded-full px-5 py-2 text-xs font-bold tracking-wide text-white shadow-lg hover:-translate-y-0.5",
              tone.btn,
            )}
          >
            {done ? "ULANGKAJI" : lesson.slides_viewed > 0 ? "SAMBUNG →" : "MULA →"}
          </Link>
        </div>
      </div>
    </Card>
  );
}
