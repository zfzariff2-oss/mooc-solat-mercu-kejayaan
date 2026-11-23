/**
 * Menjana audio Google Cloud TTS untuk tajuk slaid, setiap kad slaid dan soalan.
 *
 * Key TIDAK disimpan dalam repo. Jalankan:
 *   GOOGLE_TTS_API_KEY="..." node scripts/generate-google-tts.mjs
 *
 * Guna --force untuk jana semula fail sedia ada.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeTtsText } from "../src/lib/ttsText.ts";
import { narrationForCard, slideCardVariant } from "../src/lib/cardText.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const { MODULES, FINAL_QUIZ } = await import("../src/content/course.ts");

const API_KEY = process.env.GOOGLE_TTS_API_KEY;
if (!API_KEY) {
  console.error("RALAT: set GOOGLE_TTS_API_KEY dahulu.");
  process.exit(1);
}

const force = process.argv.includes("--force");
const outRoot = path.join(root, "public", "audio", "tts");
const titlesDir = path.join(outRoot, "titles");
const cardsDir = path.join(outRoot, "cards");
const questionsDir = path.join(outRoot, "questions");
fs.mkdirSync(titlesDir, { recursive: true });
fs.mkdirSync(cardsDir, { recursive: true });
fs.mkdirSync(questionsDir, { recursive: true });

const VOICE = "ms-MY-Wavenet-A";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function synthesize(text, outPath, label, attempt = 1) {
  if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
    console.log(`↷ skip ${label}`);
    return;
  }

  const body = {
    input: { text },
    voice: { languageCode: "ms-MY", name: VOICE },
    audioConfig: { audioEncoding: "MP3", speakingRate: 0.95, pitch: 0 },
  };

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      console.warn(`… retry ${label} (${res.status})`);
      await sleep(2000 * attempt);
      return synthesize(text, outPath, label, attempt + 1);
    }
    throw new Error(`Gagal ${label}: HTTP ${res.status} ${detail.slice(0, 300)}`);
  }

  const json = await res.json();
  if (!json.audioContent) {
    throw new Error(`Gagal ${label}: audioContent tiada.`);
  }
  const buffer = Buffer.from(json.audioContent, "base64");
  fs.writeFileSync(outPath, buffer);
  console.log(`✓ ${label} (${Math.round(buffer.length / 1024)} KB)`);
  await sleep(160);
}

const cardCount = MODULES.reduce(
  (total, m) => total + m.slides.reduce((sum, s) => sum + s.body.length, 0),
  0,
);
const slideCount = MODULES.reduce((total, m) => total + m.slides.length, 0);
console.log(`Menjana ${slideCount} audio tajuk, ${cardCount} audio kad…`);

for (const module of MODULES) {
  for (const slide of module.slides) {
    await synthesize(
      normalizeTtsText(`${slide.title}.`),
      path.join(titlesDir, `${slide.id}.mp3`),
      `${slide.id}-title`,
    );

    const variant = slideCardVariant(module.order, slide.type);
    for (let i = 0; i < slide.body.length; i++) {
      const text = normalizeTtsText(narrationForCard(slide.body[i], i, variant));
      const outPath = path.join(cardsDir, `${slide.id}-${i}.mp3`);
      await synthesize(text, outPath, `${slide.id}-${i}`);
    }
  }
}

const allQuestions = [...MODULES.flatMap((m) => m.quiz.questions), ...FINAL_QUIZ.questions];
console.log(`Menjana ${allQuestions.length} audio soalan…`);

for (const q of allQuestions) {
  const options = [q.optionA, q.optionB, q.optionC, q.optionD]
    .filter((t) => t && t.trim())
    .map((t, idx) => `Pilihan ${"ABCD"[idx]}. ${t}`)
    .join(". ");
  const text = normalizeTtsText(`${q.question}. ${options}`);
  const outPath = path.join(questionsDir, `${q.id}.mp3`);
  await synthesize(text, outPath, q.id);
}

console.log("Selesai.");
