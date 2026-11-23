/**
 * Pemain audio Google TTS (fail MP3 statik).
 * Jika fail audio tiada/ gagal, fallback ke Web Speech API.
 */
import { speak, stopSpeaking } from "./sfx";
import { assetUrl } from "./asset";
import { normalizeTtsText } from "./ttsText";

let currentAudio: HTMLAudioElement | null = null;
let sequenceAudio: HTMLAudioElement | null = null;
let sequenceToken = 0;

export interface SequenceItem {
  url: string;
  text: string;
}

export interface SequenceCallbacks {
  onStart?: (index: number) => void;
  onEnd?: (index: number) => void;
  onComplete?: () => void;
  onError?: (index: number, error?: unknown) => void;
}

export function cardAudioUrl(slideId: string, index: number): string {
  return assetUrl(`audio/tts/cards/${slideId}-${index}.mp3`);
}

export function slideTitleAudioUrl(slideId: string): string {
  return assetUrl(`audio/tts/titles/${slideId}.mp3`);
}

export function questionAudioUrl(questionId: string): string {
  return assetUrl(`audio/tts/questions/${questionId}.mp3`);
}

function cleanupAudio(audio: HTMLAudioElement | null): void {
  if (!audio) return;
  audio.onended = null;
  audio.onerror = null;
  audio.onpause = null;
  try {
    audio.pause();
  } catch {
    /* abaikan */
  }
  try {
    audio.removeAttribute("src");
    audio.load();
  } catch {
    /* abaikan */
  }
}

/** Hentikan semua audio MP3, senarai main, dan TTS pelayar. */
export function stopAllAudio(): void {
  sequenceToken++;
  const seq = sequenceAudio;
  sequenceAudio = null;
  cleanupAudio(seq);
  const single = currentAudio;
  currentAudio = null;
  cleanupAudio(single);
  stopSpeaking();
}

/**
 * Main satu audio. Jika MP3 tidak wujud atau gagal dimainkan,
 * guna suara terbina dalam pelayar sebagai fallback.
 */
export function playAudioOrSpeak(url: string, fallbackText: string, onEnd?: () => void): void {
  stopAllAudio();
  const audio = new Audio(url);
  audio.preload = "auto";
  currentAudio = audio;

  const finish = () => {
    if (currentAudio === audio) currentAudio = null;
    onEnd?.();
  };

  audio.onended = finish;
  audio.onerror = () => {
    if (currentAudio !== audio) return;
    currentAudio = null;
    speak(normalizeTtsText(fallbackText), onEnd);
  };

  const promise = audio.play();
  if (promise) {
    promise.catch(() => {
      if (currentAudio !== audio) return;
      currentAudio = null;
      speak(normalizeTtsText(fallbackText), onEnd);
    });
  }
}

/**
 * Main senarai kad secara automatik: kad 1 → kad 2 → seterusnya.
 * Satu elemen audio digunakan semula supaya sambungan selepas setiap kad
 * kekal dibenarkan oleh dasar autoplay pelayar.
 */
export function playCardSequence(items: SequenceItem[], callbacks: SequenceCallbacks = {}): void {
  stopAllAudio();
  const token = sequenceToken;
  const audio = new Audio();
  audio.preload = "auto";
  audio.volume = 1;
  sequenceAudio = audio;
  let index = 0;

  const playNext = () => {
    if (token !== sequenceToken) return;
    if (index >= items.length) {
      sequenceAudio = null;
      callbacks.onComplete?.();
      return;
    }

    const current = index;
    const item = items[current];
    callbacks.onStart?.(current);
    let settled = false;
    let fallbackStarted = false;

    const finish = (ok: boolean, error?: unknown) => {
      if (settled) return;
      settled = true;
      audio.onended = null;
      audio.onerror = null;
      audio.onpause = null;
      if (token !== sequenceToken) return;
      if (!ok) {
        callbacks.onError?.(current, error);
        return;
      }
      callbacks.onEnd?.(current);
      index += 1;
      playNext();
    };

    const fallbackToSpeech = (error?: unknown) => {
      if (settled || fallbackStarted || token !== sequenceToken) return;
      fallbackStarted = true;
      audio.onerror = null;
      speak(normalizeTtsText(item.text), () => finish(true, error));
    };

    audio.onended = () => finish(true);
    audio.onerror = () => fallbackToSpeech();
    audio.onpause = () => {
      if (token !== sequenceToken) finish(false);
    };

    audio.src = item.url;
    audio.load();
    const promise = audio.play();
    if (promise) {
      promise.catch((error) => fallbackToSpeech(error));
    }
  };

  playNext();
}
