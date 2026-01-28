import { useRef, useCallback } from "react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  WINDOW_WIDTH,
  MINI_WINDOW_WIDTH,
  MINI_WINDOW_HEIGHT,
  MAX_MINI_MASCOTS,
} from "../constants";

// Import sound
import ganbattaSound from "../resources/ganbatta.wav";

interface MiniMascotInfo {
  windowLabel: string;
  taskId: string;
}

interface UseMiniMascotReturn {
  createMiniMascot: (taskId: string) => Promise<string | null>;
  closeMiniMascot: (taskId: string) => Promise<void>;
  closeAllMiniMascots: () => Promise<void>;
}

export function useMiniMascot(): UseMiniMascotReturn {
  const activeMascots = useRef<MiniMascotInfo[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playGanbattaSound = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(ganbattaSound);
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch((err) => {
      console.warn("Failed to play ganbatta sound:", err);
    });
  }, []);

  const createMiniMascot = useCallback(async (taskId: string): Promise<string | null> => {
    // Check if we've reached the max
    if (activeMascots.current.length >= MAX_MINI_MASCOTS) {
      console.warn("Max mini mascots reached, not creating new one");
      return null;
    }

    // Find available slot (1-5)
    const usedSlots = new Set(
      activeMascots.current.map((m) => parseInt(m.windowLabel.split("-").pop() || "0"))
    );
    let slot = 1;
    while (usedSlots.has(slot) && slot <= MAX_MINI_MASCOTS) {
      slot++;
    }

    if (slot > MAX_MINI_MASCOTS) {
      console.warn("No available slots for mini mascot");
      return null;
    }

    const windowLabel = `mini-mascot-${slot}`;

    // Get main window position
    const appWindow = getCurrentWindow();
    const position = await appWindow.outerPosition();
    const factor = await appWindow.scaleFactor();
    const mascotX = position.x / factor;
    const mascotY = position.y / factor;

    // Calculate offset based on number of active mascots
    // Place to the right of main mascot, stacking horizontally
    const offsetIndex = activeMascots.current.length;
    const offsetX = WINDOW_WIDTH + (offsetIndex * MINI_WINDOW_WIDTH) + 10;

    // Create the mini mascot window
    const miniWindow = new WebviewWindow(windowLabel, {
      url: `index.html?miniMascot=true&id=${slot}`,
      title: "Mini Supiki",
      width: MINI_WINDOW_WIDTH,
      height: MINI_WINDOW_HEIGHT,
      x: Math.round(mascotX + offsetX),
      y: Math.round(mascotY + (140 - MINI_WINDOW_HEIGHT)), // Align bottom with main mascot
      resizable: false,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      shadow: false,
    });

    // Wait for window to be created
    await new Promise<void>((resolve) => {
      miniWindow.once("tauri://created", () => resolve());
      miniWindow.once("tauri://error", () => resolve());
    });

    // Track this mascot
    activeMascots.current.push({ windowLabel, taskId });
    console.log(`Created mini mascot ${windowLabel} for task ${taskId}`);

    return windowLabel;
  }, []);

  const closeMiniMascot = useCallback(async (taskId: string): Promise<void> => {
    const mascotIndex = activeMascots.current.findIndex((m) => m.taskId === taskId);
    if (mascotIndex === -1) {
      console.warn(`No mini mascot found for task ${taskId}`);
      return;
    }

    const mascot = activeMascots.current[mascotIndex];
    activeMascots.current.splice(mascotIndex, 1);

    // Play completion sound
    playGanbattaSound();

    // Close the window
    const window = await WebviewWindow.getByLabel(mascot.windowLabel);
    if (window) {
      await window.close();
      console.log(`Closed mini mascot ${mascot.windowLabel}`);
    }
  }, [playGanbattaSound]);

  const closeAllMiniMascots = useCallback(async (): Promise<void> => {
    // Play sound once if there are any mascots
    if (activeMascots.current.length > 0) {
      playGanbattaSound();
    }

    // Close all windows
    for (const mascot of activeMascots.current) {
      const window = await WebviewWindow.getByLabel(mascot.windowLabel);
      if (window) {
        await window.close();
      }
    }

    activeMascots.current = [];
    console.log("Closed all mini mascots");
  }, [playGanbattaSound]);

  return {
    createMiniMascot,
    closeMiniMascot,
    closeAllMiniMascots,
  };
}
