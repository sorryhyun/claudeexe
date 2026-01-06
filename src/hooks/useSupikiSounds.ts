import { useRef, useCallback, useEffect } from "react";
import type { Emotion } from "../emotions";

// Import sound files
import goodSound from "../supiki/good.wav";
import euSound from "../supiki/eu.wav";
import dontpushSound from "../supiki/dontpush.wav";

export type SupikiSoundTrigger = "click" | "emotion";

interface UseSupikiSoundsReturn {
  playClickSound: () => void;
  playEmotionSound: (emotion: Emotion) => void;
}

export function useSupikiSounds(): UseSupikiSoundsReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastEmotionRef = useRef<Emotion>("neutral");

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = 0.5;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playSound = useCallback((soundUrl: string) => {
    if (!audioRef.current) return;

    // Stop any currently playing sound
    audioRef.current.pause();
    audioRef.current.currentTime = 0;

    // Play new sound
    audioRef.current.src = soundUrl;
    audioRef.current.play().catch((err) => {
      console.warn("Failed to play sound:", err);
    });
  }, []);

  // Play sound when clicked - "eu.wav"
  const playClickSound = useCallback(() => {
    playSound(euSound);
  }, [playSound]);

  // Play sound based on emotion
  const playEmotionSound = useCallback((emotion: Emotion) => {
    // Only play if emotion changed
    if (emotion === lastEmotionRef.current) return;
    lastEmotionRef.current = emotion;

    // Map emotions to sounds:
    // - happy, excited -> good.wav
    // - sad, confused -> dontpush.wav (sad/angry)
    // - others: no sound
    switch (emotion) {
      case "happy":
      case "excited":
        playSound(goodSound);
        break;
      case "sad":
      case "confused": // treating confused as "angry/frustrated"
        playSound(dontpushSound);
        break;
      default:
        // No sound for neutral, thinking, surprised, curious
        break;
    }
  }, [playSound]);

  return {
    playClickSound,
    playEmotionSound,
  };
}
