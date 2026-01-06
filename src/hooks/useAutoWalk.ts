import { useEffect, useRef } from "react";
import {
  AUTO_WALK_MIN_DELAY,
  AUTO_WALK_MAX_DELAY,
  WALK_DURATION,
  AUTO_WALK_CHANCE,
} from "../constants";

export interface AutoWalkDeps {
  isEnabled: boolean;
  canWalk: () => boolean;
  onStartWalk: (direction: "left" | "right") => void;
  onStopWalk: () => void;
}

export function useAutoWalk({
  isEnabled,
  canWalk,
  onStartWalk,
  onStopWalk,
}: AutoWalkDeps): { stopWalking: () => void } {
  const autoWalkRef = useRef<number | null>(null);
  const walkTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isEnabled) return;

    const scheduleAutoWalk = () => {
      const delay =
        AUTO_WALK_MIN_DELAY + Math.random() * (AUTO_WALK_MAX_DELAY - AUTO_WALK_MIN_DELAY);

      autoWalkRef.current = window.setTimeout(() => {
        if (canWalk() && Math.random() > 1 - AUTO_WALK_CHANCE) {
          const direction = Math.random() > 0.5 ? "right" : "left";
          onStartWalk(direction);

          walkTimeoutRef.current = window.setTimeout(() => {
            onStopWalk();
          }, WALK_DURATION);
        }
        scheduleAutoWalk();
      }, delay);
    };

    scheduleAutoWalk();

    return () => {
      if (autoWalkRef.current) clearTimeout(autoWalkRef.current);
    };
  }, [isEnabled, canWalk, onStartWalk, onStopWalk]);

  const stopWalking = () => {
    if (walkTimeoutRef.current) {
      clearTimeout(walkTimeoutRef.current);
      walkTimeoutRef.current = null;
    }
  };

  return { stopWalking };
}
