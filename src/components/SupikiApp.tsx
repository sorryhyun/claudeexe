import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { MascotApp } from "./MascotApp";
import Supiki from "./mascot/Supiki";
import { useSupikiSounds } from "../hooks/useSupikiSounds";
import { useMiniMascot } from "../hooks/useMiniMascot";

interface SubagentStartEvent {
  taskId: string;
  description: string;
}

interface SubagentEndEvent {
  taskId: string;
}

function SupikiApp() {
  const { playEmotionSound, playCompletionSound } = useSupikiSounds();
  const miniMascot = useMiniMascot();

  // Play ganbatta sound when clicking "Bye"
  useEffect(() => {
    const unlisten = listen("bye-clicked", () => {
      playCompletionSound();
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [playCompletionSound]);

  // Handle subagent (Task) events - spawn and close mini mascots
  useEffect(() => {
    const unlistenStart = listen<SubagentStartEvent>("subagent-start", async (event) => {
      console.log("Subagent started:", event.payload);
      await miniMascot.createMiniMascot(event.payload.taskId);
    });

    const unlistenEnd = listen<SubagentEndEvent>("subagent-end", async (event) => {
      console.log("Subagent ended:", event.payload);
      await miniMascot.closeMiniMascot(event.payload.taskId);
    });

    return () => {
      unlistenStart.then((fn) => fn());
      unlistenEnd.then((fn) => fn());
    };
  }, [miniMascot]);

  return (
    <MascotApp
      renderMascot={(props) => (
        <Supiki
          animationState={props.animationState}
          direction={props.direction}
          onClick={props.onClick}
          onMouseDown={props.onMouseDown}
          onContextMenu={props.onContextMenu}
        />
      )}
      onEmotionChange={playEmotionSound}
    />
  );
}

export default SupikiApp;
