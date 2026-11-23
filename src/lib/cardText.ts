/**
 * Logik tajuk kecil kad yang dikongsi antara paparan slaid dan penjana audio.
 * Ini memastikan audio menyebut label yang sama dengan yang dilihat pelajar.
 */
export type CardVariant =
  | "editorial"
  | "checklist"
  | "timeline"
  | "bento"
  | "quote"
  | "split"
  | "benefit";

export function cardTitle(text: string, index: number): string {
  const num = text.match(/^(\d+)\.\s+/);
  if (num) return `Perkara ${num[1]}`;
  if (/^maksud/i.test(text)) return "Maksud";
  if (/^dari segi/i.test(text)) return "Pengertian";
  if (/^syarat wajib/i.test(text)) return "Syarat wajib";
  if (/^syarat sah/i.test(text)) return "Syarat sah";
  if (/^syarat/i.test(text)) return "Syarat";
  if (/^antara akibat/i.test(text)) return "Akibat";
  if (/^antara/i.test(text)) return "Antara";
  if (/^islam/i.test(text)) return "Islam";
  if (/^baligh/i.test(text)) return "Baligh";
  if (/^berakal/i.test(text)) return "Berakal";
  if (/^suci/i.test(text)) return "Suci";
  return `Huraian ${index + 1}`;
}

export function splitLead(text: string): { lead: string; rest: string } {
  const colon = text.search(/[:：]/);
  if (colon > 0 && colon <= 70) {
    return { lead: text.slice(0, colon).trim(), rest: text.slice(colon + 1).trim() };
  }
  const sentence = text.match(/^(.{12,90}?[.!?])\s+(.*)$/s);
  if (sentence) return { lead: sentence[1].trim(), rest: sentence[2].trim() };
  return { lead: "", rest: text };
}

export function stripTitlePrefix(text: string, title: string): string {
  if (/^(Huraian|Perkara|Antara)\b/i.test(title)) return text;
  const lower = text.toLowerCase();
  const t = title.toLowerCase();
  const next = text.charAt(title.length);
  if (lower.startsWith(t) && text.length > title.length && /[\s:：.-]/.test(next)) {
    const remainder = text.slice(title.length).replace(/^[\s:：.-]+/, "");
    return remainder.charAt(0).toUpperCase() + remainder.slice(1);
  }
  return text;
}

export function moduleCardVariant(order: number): CardVariant {
  if (order === 2) return "checklist";
  if (order === 3) return "timeline";
  if (order === 4) return "bento";
  if (order === 5) return "split";
  if (order === 6) return "benefit";
  if (order === 7) return "quote";
  return "editorial";
}

export function slideCardVariant(moduleOrder: number, slideType: string): CardVariant {
  return slideType === "QUOTE" || slideType === "SUMMARY" ? "quote" : moduleCardVariant(moduleOrder);
}

/** Teks penuh yang perlu dibaca untuk satu kad: label dahulu, kemudian isi. */
export function narrationForCard(text: string, index: number, variant: CardVariant): string {
  const title = cardTitle(text, index);
  const displayText = text.replace(/^\d+\.\s+/, "").trim();

  if (variant === "quote") return displayText;

  const bodyText = stripTitlePrefix(displayText, title);
  if (!bodyText) return title;
  return `${title}. ${bodyText}`;
}
