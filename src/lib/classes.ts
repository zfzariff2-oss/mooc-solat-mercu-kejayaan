/** Senarai kelas Tingkatan 1 yang dibenarkan. */
export const CLASS_OPTIONS = [
  "1 AMANAH",
  "1 BUDIMAN",
  "1 CEKAL",
  "1 DAMAI",
  "1 EHSAN",
  "1 FIKRAH",
  "1 GIGIH",
  "1 JUJUR",
  "1 IKHLAS",
  "1 KUKUH",
  "1 MURNI",
] as const;

export type ClassOption = (typeof CLASS_OPTIONS)[number];

/** Normalkan kelas kepada huruf besar dan satu ruang sahaja. */
export function normalizeClassName(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toUpperCase();
}

export function isClassOption(value: string | null | undefined): value is ClassOption {
  return (CLASS_OPTIONS as readonly string[]).includes(normalizeClassName(value));
}
