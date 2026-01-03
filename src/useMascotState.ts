import { useState, useCallback, useRef, useEffect } from "react";

export type MascotState = "idle" | "walking" | "talking" | "jumping" | "falling";
export type Direction = "left" | "right";

interface MascotStateManager {
  state: MascotState;
  direction: Direction;
  setState: (state: MascotState) => void;
  setDirection: (dir: Direction) => void;
  triggerJump: () => void;
  triggerTalk: () => void;
  isGrounded: boolean;
  setGrounded: (grounded: boolean) => void;
}

export function useMascotState(): MascotStateManager {
  const [state, setStateInternal] = useState<MascotState>("idle");
  const [direction, setDirection] = useState<Direction>("right");
  const [isGrounded, setGrounded] = useState(true);
  const stateTimeoutRef = useRef<number | null>(null);

  const setState = useCallback((newState: MascotState) => {
    if (stateTimeoutRef.current) {
      clearTimeout(stateTimeoutRef.current);
      stateTimeoutRef.current = null;
    }
    setStateInternal(newState);
  }, []);

  const triggerJump = useCallback(() => {
    if (!isGrounded) return;
    setState("jumping");
    setGrounded(false);
  }, [isGrounded, setState]);

  const triggerTalk = useCallback(() => {
    setState("talking");
    stateTimeoutRef.current = window.setTimeout(() => {
      setStateInternal("idle");
    }, 2000);
  }, [setState]);

  useEffect(() => {
    return () => {
      if (stateTimeoutRef.current) {
        clearTimeout(stateTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    direction,
    setState,
    setDirection,
    triggerJump,
    triggerTalk,
    isGrounded,
    setGrounded,
  };
}
