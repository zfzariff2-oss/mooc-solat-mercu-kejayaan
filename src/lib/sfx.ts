/**
 * Kesan bunyi ringan + TTS Bahasa Melayu menggunakan Web Speech API.
 *
 * TTS guna suara terbina dalam pelayar (Chrome/Edge biasanya ada suara ms-MY).
 * Ini mengelakkan API key Google Cloud TTS daripada didedahkan dalam frontend
 * statik GitHub Pages.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

function tone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.045,
  delay = 0,
): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

/** Bunyi klik lembut. */
export function playClick(): void {
  tone(620, 0.045, "sine", 0.032);
}

/** Bunyi jawapan betul / pilihan tepat. */
export function playCorrect(): void {
  tone(660, 0.1, "sine", 0.05);
  tone(880, 0.16, "sine", 0.05, 0.1);
}

/** Bunyi berjaya / lulus / sijil. */
export function playSuccess(): void {
  tone(523.25, 0.12, "sine", 0.05);
  tone(659.25, 0.12, "sine", 0.05, 0.12);
  tone(783.99, 0.2, "sine", 0.05, 0.24);
}

/** Bunyi jawapan salah / gagal. */
export function playWrong(): void {
  tone(220, 0.18, "sawtooth", 0.035);
  tone(180, 0.22, "sawtooth", 0.03, 0.18);
}

/** Bunyi ralat sistem. */
export function playError(): void {
  tone(160, 0.12, "square", 0.03);
  tone(120, 0.18, "square", 0.03, 0.14);
}

/** Hentikan TTS yang sedang bermain. */
export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

/** Baca teks dalam Bahasa Melayu menggunakan suara terbina dalam pelayar. */
export function speak(text: string, onEnd?: () => void): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) {
    onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = "ms-MY";
  utterance.rate = 0.95;
  utterance.pitch = 1;

  const voices = window.speechSynthesis.getVoices();
  const malay =
    voices.find((v) => v.lang.toLowerCase().startsWith("ms")) ??
    voices.find((v) => /malay|malaysia|gadis|andika/i.test(v.name));
  if (malay) utterance.voice = malay;

  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
}
