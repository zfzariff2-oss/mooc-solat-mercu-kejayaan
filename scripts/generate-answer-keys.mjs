/**
 * Menjana supabase/migrations/003_seed.sql daripada kandungan frontend.
 * Jalankan: npm run generate:keys
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const { COURSE, MODULES, FINAL_QUIZ } = await import("../src/content/course.ts");

function q(value) {
  return `'${String(value ?? "").replace(/'/g, "''").replace(/\r?\n/g, " ")}'`;
}

function arr(values) {
  return `array[${values.map((v) => q(v)).join(", ")}]::text[]`;
}

const lines = [];
lines.push("-- ============================================================================");
lines.push("-- AUTO-GENERATED oleh scripts/generate-answer-keys.mjs");
lines.push("-- Jalankan selepas 001_schema.sql dan 002_rpc.sql.");
lines.push("-- ============================================================================");
lines.push("");
lines.push("-- Bersihkan metadata kursus lama (kemajuan pelajar tidak dipadam).");
lines.push("delete from public.course_quizzes;");
lines.push("delete from public.course_lessons;");
lines.push("delete from public.question_keys;");
lines.push("");

lines.push("-- Metadata modul");
for (const m of MODULES) {
  const slideIds = m.slides.map((s) => s.id);
  lines.push(
    `insert into public.course_lessons (id, title, "order", total_slides, quiz_id, slide_ids) values (` +
      `${q(m.id)}, ${q(`${m.num}: ${m.title}`)}, ${m.order}, ${m.slides.length}, ${q(m.quiz.id)}, ${arr(slideIds)}) ` +
      `on conflict (id) do update set title = excluded.title, "order" = excluded."order", total_slides = excluded.total_slides, quiz_id = excluded.quiz_id, slide_ids = excluded.slide_ids;`,
  );
}
lines.push("");

lines.push("-- Metadata kuiz");
for (const m of MODULES) {
  lines.push(
    `insert into public.course_quizzes (id, lesson_id, title, kind, passing_score, question_count) values (` +
      `${q(m.quiz.id)}, ${q(m.id)}, ${q(m.quiz.title)}, 'MODULE', ${m.quiz.passingScore}, ${m.quiz.questions.length}) ` +
      `on conflict (id) do update set lesson_id = excluded.lesson_id, title = excluded.title, kind = excluded.kind, passing_score = excluded.passing_score, question_count = excluded.question_count;`,
  );
}
lines.push(
  `insert into public.course_quizzes (id, lesson_id, title, kind, passing_score, question_count) values (` +
    `${q(FINAL_QUIZ.id)}, null, ${q(FINAL_QUIZ.title)}, 'FINAL', 0, ${FINAL_QUIZ.questions.length}) ` +
    `on conflict (id) do update set lesson_id = null, title = excluded.title, kind = 'FINAL', passing_score = 0, question_count = excluded.question_count;`,
);
lines.push("");

lines.push("-- Kunci jawapan kuiz modul");
for (const m of MODULES) {
  for (const question of m.quiz.questions) {
    lines.push(
      `insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values (` +
        `${q(question.id)}, ${q(m.quiz.id)}, 'MODULE', ${q(question.correctAnswer)}, ${question.points ?? 1}, ${q(question.explanation)}) ` +
        `on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;`,
    );
  }
}
lines.push("");

lines.push("-- Kunci jawapan pentaksiran akhir");
for (const question of FINAL_QUIZ.questions) {
  lines.push(
    `insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values (` +
      `${q(question.id)}, ${q(FINAL_QUIZ.id)}, 'FINAL', ${q(question.correctAnswer)}, ${question.points ?? 1}, ${q(question.explanation)}) ` +
      `on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;`,
  );
}
lines.push("");
lines.push("-- Pastikan tetapan lalai wujud.");
lines.push("insert into public.app_settings (key, value) values ('sheet_webhook_url', ''), ('sheet_webhook_secret', '') on conflict (key) do nothing;");
lines.push("");

const out = path.join(root, "supabase", "migrations", "003_seed.sql");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, lines.join("\n"), "utf8");
console.log(`Ditulis: ${out}`);

// ---------------------------------------------------------------------------
// Jana juga versi AWAM kandungan (tanpa correctAnswer/explanation) supaya
// jawapan betul tidak masuk ke bundle frontend.
// ---------------------------------------------------------------------------
const publicModules = MODULES.map((m) => ({
  ...m,
  quiz: {
    ...m.quiz,
    questions: m.quiz.questions.map(({ correctAnswer, explanation, ...q }) => q),
  },
}));
const publicFinal = {
  ...FINAL_QUIZ,
  questions: FINAL_QUIZ.questions.map(({ correctAnswer, explanation, ...q }) => q),
};

const publicFile = `/**
 * AUTO-GENERATED oleh scripts/generate-answer-keys.mjs.
 * JANGAN edit fail ini secara manual — ubah src/content/course.ts dan jalankan
 * npm run generate:keys.
 *
 * Fail ini TIDAK mengandungi jawapan betul.
 */

export type SlideType = "TEXT" | "QUOTE" | "SUMMARY" | "ACTIVITY";

export interface Slide {
  id: string;
  title: string;
  type: SlideType;
  body: string[];
  arabic?: string;
  sourcePage?: string;
  standard?: string;
}

export interface Question {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  points?: number;
}

export interface Quiz {
  id: string;
  title: string;
  passingScore: number;
  questions: Question[];
}

export interface Module {
  id: string;
  num: string;
  title: string;
  description: string;
  order: number;
  estimatedMinutes: number;
  slides: Slide[];
  quiz: Quiz;
}

const DATA = ${JSON.stringify(
  { COURSE, MODULES: publicModules, FINAL_QUIZ: publicFinal },
  null,
  2,
)};

export const COURSE = DATA.COURSE;
export const MODULES = DATA.MODULES as Module[];
export const FINAL_QUIZ = DATA.FINAL_QUIZ as Quiz;
export const FINAL_QUESTION_COUNT = FINAL_QUIZ.questions.length;

export function getModule(id: string): Module | undefined {
  return MODULES.find((m) => m.id === id);
}

export function getModuleByQuizId(quizId: string): Module | undefined {
  return MODULES.find((m) => m.quiz.id === quizId);
}

export function getSlide(moduleId: string, slideId: string): Slide | undefined {
  return getModule(moduleId)?.slides.find((s) => s.id === slideId);
}
`;

const publicOut = path.join(root, "src", "content", "publicCourse.ts");
fs.writeFileSync(publicOut, publicFile, "utf8");
console.log(`Ditulis: ${publicOut}`);
console.log(`Modul: ${MODULES.length}`);
console.log(`Soalan kuiz modul: ${MODULES.reduce((n, m) => n + m.quiz.questions.length, 0)}`);
console.log(`Soalan pentaksiran akhir: ${FINAL_QUIZ.questions.length}`);
