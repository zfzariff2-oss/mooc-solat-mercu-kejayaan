/**
 * Pemain audio Google TTS (fail MP3 statik).
 * Jika fail audio tiada/ gagal, fallback ke Web Speech API.
 */
import { speak, stopSpeaking } from "./sfx";

let currentAudio: HTMLAudioElement | null = null;

export function cardAudioUrl(slideId: string, index: number): string {
  return `/audio/tts/cards/${slideId}-${index}.mp3`;
}

export function questionAudioUrl(questionId: string): string {
  return `/audio/tts/questions/${questionId}.mp3`;
}

/** Hentikan audio MP3 dan TTS pelayar. */
export function stopAllAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  stopSpeaking();
}

/**
 * Main audio Google TTS. Jika MP3 tidak wujud atau gagal dimainkan,
 * guna suara terbina dalam pelayar sebagai fallback.
 */
export function playAudioOrSpeak(url: string, fallbackText: string, onEnd?: () => void): void {
  stopAllAudio();
  const audio = new Audio(url);
  currentAudio = audio;

  const finish = () => {
    if (currentAudio === audio) currentAudio = null;
    onEnd?.();
  };

  audio.onended = finish;
  audio.onerror = () => {
    if (currentAudio === audio) currentAudio = null;
    speak(fallbackText, onEnd);
  };

  const promise = audio.play();
  if (promise) {
    promise.catch(() => {
      if (currentAudio === audio) currentAudio = null;
      speak(fallbackText, onEnd);
    });
  }
}
