/**
 * Normalisasi teks untuk sebutan TTS.
 * Paparan di skrin tidak berubah — hanya teks yang dibaca oleh audio.
 */
const HONORIFICS: Array<[RegExp, string]> = [
  [/\bS\.?\s*A\.?\s*W\b/g, "Sallallahu alaihi wasallam"],
  [/\bS\.?\s*W\.?\s*T\b/g, "Subhanahu wa ta'ala"],
  [/\bR\.?\s*A\b/g, "Radiyallahu anhu"],
];

export function normalizeTtsText(text: string): string {
  let result = text
    .replace(/[“”„]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  for (const [pattern, replacement] of HONORIFICS) {
    result = result.replace(pattern, replacement);
  }

  return result.replace(/\s+/g, " ").trim();
}
