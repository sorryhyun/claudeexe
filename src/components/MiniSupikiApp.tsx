import { useEffect, useState, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import supikiImage from "../resources/supiki.webp";

interface MiniSupikiAppProps {
  id: string;
}

function MiniSupikiApp({ id }: MiniSupikiAppProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [bobOffset, setBobOffset] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Pop-in animation on mount
  useEffect(() => {
    // Small delay then show
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Bobbing animation for "working" effect
  useEffect(() => {
    let startTime = Date.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      // Gentle bobbing motion
      const offset = Math.sin(elapsed / 300) * 2;
      setBobOffset(offset);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Listen for close event from main window
  useEffect(() => {
    const currentWindow = getCurrentWindow();

    // Also close if the window loses focus and main mascot signals
    const unlisten = listen("close-mini-mascot", async (event) => {
      const payload = event.payload as { id?: string };
      if (!payload.id || payload.id === id) {
        await currentWindow.close();
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [id]);

  return (
    <div
      className="mini-mascot-container"
      style={{
        width: "80px",
        height: "70px",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        transform: `scale(${isVisible ? 1 : 0}) translateY(${bobOffset}px)`,
        transition: isVisible ? "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" : "none",
        transformOrigin: "center bottom",
      }}
    >
      <img
        src={supikiImage}
        alt="Mini Supiki"
        style={{
          maxWidth: "70px",
          maxHeight: "60px",
          width: "auto",
          height: "auto",
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
        }}
        draggable={false}
      />
    </div>
  );
}

export default MiniSupikiApp;
