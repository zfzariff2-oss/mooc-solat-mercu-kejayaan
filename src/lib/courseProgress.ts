import type { LessonProgress } from "./types";

/** Modul pertama terbuka; modul seterusnya hanya terbuka selepas modul sebelumnya selesai. */
export function isLessonUnlocked(lessons: LessonProgress[], index: number): boolean {
  const lesson = lessons[index];
  if (!lesson) return false;
  // Modul yang sudah selesai kekal boleh dibuka untuk ulang kaji.
  if (lesson.completed) return true;
  if (typeof lesson.unlocked === "boolean") return lesson.unlocked;
  return index === 0 || lessons[index - 1]?.completed === true;
}

/** Nota/slaid lengkap apabila semua slaid telah ditandakan viewed. */
export function areSlidesCompleted(lesson: LessonProgress): boolean {
  if (typeof lesson.slides_completed === "boolean") return lesson.slides_completed;
  return lesson.total_slides > 0 && lesson.slides_viewed >= lesson.total_slides;
}

export function findLessonIndex(lessons: LessonProgress[], lessonId: string): number {
  return lessons.findIndex((lesson) => lesson.lesson_id === lessonId);
}
