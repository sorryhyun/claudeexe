import { useState, useCallback, useRef, useEffect } from "react";
import type { Emotion } from "../emotion";
import { EMOTION_RESET_DURATION, TALK_DURATION } from "../constants";

export type AnimationState = "idle" | "walking" | "talking" | "jumping" | "falling";
export type Direction = "left" | "right";

interface AnimationStateManager {
  animationState: AnimationState;
  direction: Direction;
  emotion: Emotion;
  setAnimationState: (state: AnimationState) => void;
  setDirection: (dir: Direction) => void;
  setEmotion: (emotion: Emotion, duration?: number) => void;
  triggerJump: () => void;
  triggerTalk: () => void;
  isGrounded: boolean;
  setGrounded: (grounded: boolean) => void;
}

export function useAnimationState(): AnimationStateManager {
  const [animationState, setAnimationStateInternal] = useState<AnimationState>("idle");
  const [direction, setDirection] = useState<Direction>("right");
  const [emotion, setEmotionInternal] = useState<Emotion>("neutral");
  const [isGrounded, setGrounded] = useState(true);
  const stateTimeoutRef = useRef<number | null>(null);
  const emotionTimeoutRef = useRef<number | null>(null);

  const setAnimationState = useCallback((newState: AnimationState) => {
    if (stateTimeoutRef.current) {
      clearTimeout(stateTimeoutRef.current);
      stateTimeoutRef.current = null;
    }
    setAnimationStateInternal(newState);
  }, []);

  const triggerJump = useCallback(() => {
    if (!isGrounded) return;
    setAnimationState("jumping");
    setGrounded(false);
  }, [isGrounded, setAnimationState]);

  const triggerTalk = useCallback(() => {
    setAnimationState("talking");
    stateTimeoutRef.current = window.setTimeout(() => {
      setAnimationStateInternal("idle");
    }, TALK_DURATION);
  }, [setAnimationState]);

  const setEmotion = useCallback((newEmotion: Emotion, duration?: number) => {
    if (emotionTimeoutRef.current) {
      clearTimeout(emotionTimeoutRef.current);
      emotionTimeoutRef.current = null;
    }
    setEmotionInternal(newEmotion);

    // Auto-reset to neutral after duration (default from constants)
    if (newEmotion !== "neutral") {
      const resetDuration = duration ?? EMOTION_RESET_DURATION;
      emotionTimeoutRef.current = window.setTimeout(() => {
        setEmotionInternal("neutral");
      }, resetDuration);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (stateTimeoutRef.current) {
        clearTimeout(stateTimeoutRef.current);
      }
      if (emotionTimeoutRef.current) {
        clearTimeout(emotionTimeoutRef.current);
      }
    };
  }, []);

  return {
    animationState,
    direction,
    emotion,
    setAnimationState,
    setDirection,
    setEmotion,
    triggerJump,
    triggerTalk,
    isGrounded,
    setGrounded,
  };
}
