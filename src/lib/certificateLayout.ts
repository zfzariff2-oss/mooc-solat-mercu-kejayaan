import { formatDateMY } from "./utils";

/** Saiz asal templat sijil (Sijil Baru.png). */
export const CERT_WIDTH = 1536;
export const CERT_HEIGHT = 1024;

/** Warna teks dinamik yang meniru teks asal templat. */
export const CERT_COLORS = {
  navy: "#04163d",
  sentence: "#060921",
  white: "#ffffff",
  nameShadow: "#a9b8ca",
  classShadow: "#9eb2c8",
  sentenceShadow: "#b9c4d4",
  numberShadow: "#073f68",
} as const;

/**
 * Kedudukan baseline (dalam unit imej 1536 x 1024) dan saiz teks asas.
 * Nilai saiz dipilih supaya lebar teks contoh asal hampir sama dengan templat.
 */
export const CERT_LAYOUT = {
  name: { x: 768, baseline: 598, maxWidth: 885, size: 64.5 },
  className: { x: 768, baseline: 674, maxWidth: 330, size: 33.6 },
  sentenceLine1: { x: 768, baseline: 731.5, maxWidth: 900, size: 35 },
  sentenceLine2: { x: 768, baseline: 768.5, maxWidth: 900, size: 35 },
  certificateNumber: { x: 768, baseline: 838.5, maxWidth: 345, size: 28.2 },
} as const;

export function certificateClassText(className: string | null | undefined): string {
  const value = className?.trim();
  return `Kelas: ${value || "—"}`;
}

export function certificateNumberText(certificateNumber: string): string {
  return `No. Sijil: ${certificateNumber}`;
}

export function certificateSentence(courseTitle: string, issuedAt: string) {
  const date = formatDateMY(issuedAt);
  return {
    line1: "Telah berjaya menamatkan kursus MOOC Pendidikan Islam",
    line2Before: "bertajuk ",
    line2Course: courseTitle,
    line2After: ` pada ${date}.`,
    line2: `bertajuk ${courseTitle} pada ${date}.`,
  };
}

/**
 * Anggaran lebar untuk pratonton SVG sahaja. PDF menggunakan metrik font sebenar.
 * `avgCharWidth` ialah lebar purata setiap aksara dalam unit em.
 */
export function fitPreviewTextSize(
  text: string,
  baseSize: number,
  maxWidth: number,
  avgCharWidth: number,
): number {
  const estimated = Math.max(1, text.length) * avgCharWidth * baseSize;
  if (estimated <= maxWidth) return baseSize;
  return Math.max(12, (maxWidth / (Math.max(1, text.length) * avgCharWidth)));
}
