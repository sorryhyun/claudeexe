import { useRef, useCallback, useEffect } from "react";
import { getCurrentWindow, currentMonitor } from "@tauri-apps/api/window";
import { PhysicalPosition } from "@tauri-apps/api/dpi";

interface PhysicsState {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}

interface ScreenBounds {
  width: number;
  height: number;
  left: number;
  top: number;
}

interface PhysicsConfig {
  gravity: number;
  friction: number;
  bounceFactor: number;
  walkSpeed: number;
  jumpForce: number;
}

const DEFAULT_CONFIG: PhysicsConfig = {
  gravity: 0.5,
  friction: 0.95,
  bounceFactor: 0.6,
  walkSpeed: 2,
  jumpForce: -12,
};

interface UsePhysicsOptions {
  windowWidth: number;
  windowHeight: number;
  onPositionUpdate: (x: number, y: number) => void;
  onGrounded: (grounded: boolean) => void;
  onEdgeHit: (edge: "left" | "right") => void;
  config?: Partial<PhysicsConfig>;
}

export function usePhysics({
  windowWidth,
  windowHeight,
  onPositionUpdate,
  onGrounded,
  onEdgeHit,
  config = {},
}: UsePhysicsOptions) {
  const physicsConfig = { ...DEFAULT_CONFIG, ...config };
  const stateRef = useRef<PhysicsState>({
    x: 100,
    y: 100,
    velocityX: 0,
    velocityY: 0,
  });
  const screenBoundsRef = useRef<ScreenBounds | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const isWalkingRef = useRef(false);
  const walkDirectionRef = useRef<"left" | "right">("right");

  const updateScreenBounds = useCallback(async () => {
    try {
      const monitor = await currentMonitor();
      if (monitor) {
        screenBoundsRef.current = {
          width: monitor.size.width,
          height: monitor.size.height,
          left: monitor.position.x,
          top: monitor.position.y,
        };
      }
    } catch (e) {
      console.error("Failed to get monitor info:", e);
    }
  }, []);

  const setPosition = useCallback(async (x: number, y: number) => {
    try {
      const appWindow = getCurrentWindow();
      const factor = await appWindow.scaleFactor();
      const position = new PhysicalPosition(
        Math.round(x * factor),
        Math.round(y * factor)
      );
      await appWindow.setPosition(position);
    } catch (e) {
      console.error("Failed to set position:", e);
    }
  }, []);

  const applyForce = useCallback((forceX: number, forceY: number) => {
    stateRef.current.velocityX += forceX;
    stateRef.current.velocityY += forceY;
  }, []);

  const jump = useCallback(() => {
    if (stateRef.current.velocityY === 0) {
      stateRef.current.velocityY = physicsConfig.jumpForce;
      onGrounded(false);
    }
  }, [physicsConfig.jumpForce, onGrounded]);

  const startWalking = useCallback((direction: "left" | "right") => {
    isWalkingRef.current = true;
    walkDirectionRef.current = direction;
  }, []);

  const stopWalking = useCallback(() => {
    isWalkingRef.current = false;
  }, []);

  const physicsStep = useCallback(async () => {
    if (!screenBoundsRef.current) {
      await updateScreenBounds();
      return;
    }

    const bounds = screenBoundsRef.current;
    const state = stateRef.current;

    // Apply gravity
    state.velocityY += physicsConfig.gravity;

    // Apply walking velocity
    if (isWalkingRef.current) {
      const walkVel = walkDirectionRef.current === "right"
        ? physicsConfig.walkSpeed
        : -physicsConfig.walkSpeed;
      state.velocityX = walkVel;
    } else {
      // Apply friction when not walking
      state.velocityX *= physicsConfig.friction;
      if (Math.abs(state.velocityX) < 0.1) {
        state.velocityX = 0;
      }
    }

    // Update position
    state.x += state.velocityX;
    state.y += state.velocityY;

    // Floor collision (bottom of screen)
    const floorY = bounds.height - windowHeight;
    if (state.y >= floorY) {
      state.y = floorY;
      if (state.velocityY > 0) {
        if (state.velocityY > 5) {
          state.velocityY = -state.velocityY * physicsConfig.bounceFactor;
        } else {
          state.velocityY = 0;
          onGrounded(true);
        }
      }
    }

    // Wall collisions (screen edges)
    const rightEdge = bounds.width - windowWidth;
    if (state.x <= bounds.left) {
      state.x = bounds.left;
      state.velocityX = Math.abs(state.velocityX) * physicsConfig.bounceFactor;
      onEdgeHit("left");
    } else if (state.x >= rightEdge) {
      state.x = rightEdge;
      state.velocityX = -Math.abs(state.velocityX) * physicsConfig.bounceFactor;
      onEdgeHit("right");
    }

    // Update window position
    await setPosition(state.x, state.y);
    onPositionUpdate(state.x, state.y);
  }, [
    physicsConfig,
    windowWidth,
    windowHeight,
    onPositionUpdate,
    onGrounded,
    onEdgeHit,
    setPosition,
    updateScreenBounds,
  ]);

  const startPhysics = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    const loop = async () => {
      if (!isRunningRef.current) return;
      await physicsStep();
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    updateScreenBounds().then(() => {
      animationFrameRef.current = requestAnimationFrame(loop);
    });
  }, [physicsStep, updateScreenBounds]);

  const stopPhysics = useCallback(() => {
    isRunningRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const syncPosition = useCallback(async () => {
    try {
      const appWindow = getCurrentWindow();
      const position = await appWindow.outerPosition();
      const factor = await appWindow.scaleFactor();
      stateRef.current.x = position.x / factor;
      stateRef.current.y = position.y / factor;
    } catch (e) {
      console.error("Failed to sync position:", e);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopPhysics();
    };
  }, [stopPhysics]);

  return {
    startPhysics,
    stopPhysics,
    jump,
    applyForce,
    startWalking,
    stopWalking,
    syncPosition,
    updateScreenBounds,
    getState: () => stateRef.current,
  };
}
