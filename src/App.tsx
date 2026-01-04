import { useEffect, useRef, useState, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { PhysicalPosition } from "@tauri-apps/api/dpi";
import Clawd from "./Clawd";
import SpeechBubble from "./SpeechBubble";
import ChatInput from "./ChatInput";
import { useMascotState } from "./useMascotState";
import { usePhysics } from "./usePhysics";
import { useChatHistory } from "./useChatHistory";
import type { Emotion } from "./emotions";

const WINDOW_WIDTH = 160;
const WINDOW_HEIGHT = 140;

function App() {
  const [isDragging, setIsDragging] = useState(false);
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const walkTimeoutRef = useRef<number | null>(null);
  const autoWalkRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const mascot = useMascotState();

  // Callback to update mascot emotion based on agent activity
  const handleEmotionChange = useCallback((emotion: Emotion) => {
    mascot.setEmotion(emotion);
  }, [mascot]);

  const chat = useChatHistory({ onEmotionChange: handleEmotionChange });

  const handlePositionUpdate = useCallback(() => {
    // Position updated - could track for UI if needed
  }, []);

  const handleGrounded = useCallback((grounded: boolean) => {
    mascot.setGrounded(grounded);
    if (grounded && mascot.state === "jumping") {
      mascot.setState("idle");
    }
    if (!grounded && mascot.state !== "jumping") {
      mascot.setState("falling");
    }
  }, [mascot]);

  const handleEdgeHit = useCallback((edge: "left" | "right") => {
    // Turn around when hitting an edge
    mascot.setDirection(edge === "left" ? "right" : "left");
  }, [mascot]);

  const physics = usePhysics({
    windowWidth: WINDOW_WIDTH,
    windowHeight: WINDOW_HEIGHT,
    onPositionUpdate: handlePositionUpdate,
    onGrounded: handleGrounded,
    onEdgeHit: handleEdgeHit,
  });

  // Start physics on mount
  useEffect(() => {
    if (physicsEnabled && !chatOpen) {
      physics.startPhysics();
    }
    return () => {
      physics.stopPhysics();
    };
  }, [physicsEnabled, chatOpen]);

  // Handle physics when chat opens/closes (no window resize needed)
  useEffect(() => {
    if (chatOpen) {
      physics.stopPhysics();
    } else if (physicsEnabled) {
      physics.startPhysics();
    }
  }, [chatOpen]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages, chat.isTyping]);

  // Auto-walk behavior: randomly start walking (disabled when chat is open)
  useEffect(() => {
    if (chatOpen) return;

    const scheduleAutoWalk = () => {
      const delay = 15000 + Math.random() * 30000; // 15-45 seconds
      autoWalkRef.current = window.setTimeout(() => {
        if (!isDragging && mascot.state === "idle" && mascot.isGrounded && !chatOpen) {
          // 30% chance to start walking
          if (Math.random() > 0.7) {
            const direction = Math.random() > 0.5 ? "right" : "left";
            mascot.setDirection(direction);
            mascot.setState("walking");
            physics.startWalking(direction);

            // Walk for 1-2 seconds
            const walkDuration = 1000 + Math.random() * 1000;
            walkTimeoutRef.current = window.setTimeout(() => {
              physics.stopWalking();
              mascot.setState("idle");
            }, walkDuration);
          }
        }
        scheduleAutoWalk();
      }, delay);
    };

    scheduleAutoWalk();

    return () => {
      if (autoWalkRef.current) clearTimeout(autoWalkRef.current);
      if (walkTimeoutRef.current) clearTimeout(walkTimeoutRef.current);
    };
  }, [isDragging, mascot.state, mascot.isGrounded, chatOpen]);

  // Drag handling
  useEffect(() => {
    const handleMouseMove = async (e: MouseEvent) => {
      if (!isDragging) return;

      // Check if moved enough to count as drag (more than 5 pixels)
      if (dragStartPos.current) {
        const dx = Math.abs(e.clientX - dragStartPos.current.x);
        const dy = Math.abs(e.clientY - dragStartPos.current.y);
        if (dx > 5 || dy > 5) {
          wasDragged.current = true;
        }
      }

      const appWindow = getCurrentWindow();
      const factor = await appWindow.scaleFactor();
      const currentPos = await appWindow.outerPosition();

      const newPosition = new PhysicalPosition(
        Math.round(currentPos.x + e.movementX * factor),
        Math.round(currentPos.y + e.movementY * factor)
      );
      await appWindow.setPosition(newPosition);
    };

    const handleMouseUp = async () => {
      setIsDragging(false);
      dragStartPos.current = null;

      // If clicked on Clawd without dragging, don't restart physics
      // The click handler will manage it (chat toggle)
      if (clickedOnClawd.current && !wasDragged.current) {
        clickedOnClawd.current = false;
        return;
      }

      clickedOnClawd.current = false;
      // Re-sync physics position after drag
      await physics.syncPosition();
      if (physicsEnabled) {
        physics.startPhysics();
      }
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, physics, physicsEnabled]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    clickedOnClawd.current = false; // Background click, not Clawd
    setIsDragging(true);
    // Stop physics while dragging
    physics.stopPhysics();
    physics.stopWalking();
    if (walkTimeoutRef.current) {
      clearTimeout(walkTimeoutRef.current);
    }
    mascot.setState("idle");
  };

  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const wasDragged = useRef(false);
  const clickedOnClawd = useRef(false);

  const handleClawdMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Track start position to detect drag vs click
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    wasDragged.current = false;
    clickedOnClawd.current = true;
    setIsDragging(true);
    physics.stopPhysics();
    physics.stopWalking();
    if (walkTimeoutRef.current) {
      clearTimeout(walkTimeoutRef.current);
    }
    mascot.setState("idle");
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Only toggle chat if it wasn't a drag
    if (wasDragged.current) {
      wasDragged.current = false;
      // If it was a drag on Clawd, restart physics now
      await physics.syncPosition();
      if (physicsEnabled) {
        physics.startPhysics();
      }
      return;
    }

    // Toggle chat mode
    const wasOpen = chatOpen;
    setChatOpen((prev) => !prev);
    if (!wasOpen) {
      // Opening chat - stop walking and enter talking state
      physics.stopWalking();
      mascot.setState("talking");
      if (walkTimeoutRef.current) {
        clearTimeout(walkTimeoutRef.current);
      }
    } else {
      // Closing chat - handled by useEffect (resize first, then physics)
      mascot.setState("idle");
    }
  };

  const handleSendMessage = (message: string) => {
    chat.sendMessage(message);
    // Note: mascot state is now managed by the agent hook via onEmotionChange
  };

  // Double-click to toggle physics
  const handleDoubleClick = () => {
    setPhysicsEnabled((prev) => !prev);
  };

  return (
    <div
      className={`mascot-container ${chatOpen ? "chat-mode" : ""}`}
      onMouseDown={chatOpen ? undefined : handleMouseDown}
      onDoubleClick={chatOpen ? undefined : handleDoubleClick}
    >
      <div className="clawd-wrapper">
        {chatOpen && (
          <div className="chat-container">
            {/* Tool indicator when agent is using tools */}
            {chat.streamingState?.currentToolName && (
              <div className="tool-indicator">
                Using: {chat.streamingState.currentToolName}
              </div>
            )}
            <div className="chat-messages">
              {chat.messages.map((msg) => (
                <SpeechBubble
                  key={msg.id}
                  message={msg.content}
                  sender={msg.sender}
                  isStreaming={msg.isStreaming}
                />
              ))}
              {chat.isTyping && !chat.messages.some(m => m.isStreaming) && (
                <SpeechBubble message="" sender="clawd" isTyping />
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-row">
              <ChatInput onSend={handleSendMessage} disabled={chat.isTyping} />
              {chat.isTyping && (
                <button className="interrupt-btn" onClick={chat.interrupt}>
                  Stop
                </button>
              )}
            </div>
          </div>
        )}
        <Clawd
          state={mascot.state}
          direction={mascot.direction}
          emotion={mascot.emotion}
          onClick={handleClick}
          onMouseDown={chatOpen ? undefined : handleClawdMouseDown}
        />
      </div>
    </div>
  );
}

export default App;
