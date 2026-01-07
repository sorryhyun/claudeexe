import { useEffect, useState, useCallback, useMemo } from "react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Clawd from "./Clawd";
import { useAnimationState } from "../hooks/useMascotState";
import { usePhysics } from "../hooks/usePhysics";
import { useChatWindow } from "../hooks/useChatWindow";
import { useDrag } from "../hooks/useDrag";
import { useAutoWalk } from "../hooks/useAutoWalk";
import { useClawdEvents } from "../hooks/useClawdEvents";
import { useContextMenu } from "../hooks/useContextMenu";
import { WINDOW_WIDTH, WINDOW_HEIGHT, CHAT_WIDTH, CHAT_HEIGHT } from "../constants";

function App() {
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  const clawd = useAnimationState();
  const { openContextMenu, closeContextMenu } = useContextMenu();

  // Chat window management
  const chatWindow = useChatWindow(
    () => {
      // onOpen
      setChatOpen(true);
      clawd.setAnimationState("talking");
    },
    () => {
      // onClose
      setChatOpen(false);
      clawd.setAnimationState("idle");
    }
  );

  // Physics callbacks
  const handlePositionUpdate = useCallback(
    async (x: number, y: number) => {
      await chatWindow.updatePosition(x, y);
    },
    [chatWindow]
  );

  const handleGrounded = useCallback(
    (grounded: boolean) => {
      clawd.setGrounded(grounded);
      if (grounded && clawd.animationState === "jumping") {
        clawd.setAnimationState("idle");
      }
      if (!grounded && clawd.animationState !== "jumping") {
        clawd.setAnimationState("falling");
      }
    },
    [clawd]
  );

  const handleEdgeHit = useCallback(
    (edge: "left" | "right") => {
      clawd.setDirection(edge === "left" ? "right" : "left");
    },
    [clawd]
  );

  const physics = usePhysics({
    windowWidth: WINDOW_WIDTH,
    windowHeight: WINDOW_HEIGHT,
    onPositionUpdate: handlePositionUpdate,
    onGrounded: handleGrounded,
    onEdgeHit: handleEdgeHit,
  });

  // Drag handling
  const { stopWalking: stopAutoWalk } = useAutoWalk({
    isEnabled: !chatOpen,
    canWalk: () => !drag.isDragging && clawd.animationState === "idle" && clawd.isGrounded,
    onStartWalk: (direction) => {
      clawd.setDirection(direction);
      clawd.setAnimationState("walking");
      physics.startWalking(direction);
    },
    onStopWalk: () => {
      physics.stopWalking();
      clawd.setAnimationState("idle");
    },
  });

  const drag = useDrag({
    onDragStart: () => {
      closeContextMenu();
      physics.stopPhysics();
      physics.stopWalking();
      stopAutoWalk();
      clawd.setAnimationState("idle");
    },
    onDragEnd: async () => {
      await physics.syncPosition();
      if (physicsEnabled && !chatOpen) {
        physics.startPhysics();
      }
    },
  });

  // Event handlers for Clawd events
  const eventHandlers = useMemo(
    () => ({
      onEmotionChange: (emotion: Parameters<typeof clawd.setEmotion>[0]) => {
        clawd.setEmotion(emotion);
      },
      onWalkToWindow: (targetX: number) => {
        const currentX = physics.getState().x;
        const direction = targetX > currentX ? "right" : "left";
        clawd.setDirection(direction);
        clawd.setAnimationState("walking");
        physics.walkToX(targetX, () => {
          clawd.setAnimationState("idle");
          clawd.setDirection(physics.getDirection());
          clawd.setEmotion("curious", 5000);
        });
      },
      onMove: (_target: string, targetX: number | null) => {
        if (targetX === null) return;
        const currentX = physics.getState().x;
        const direction = targetX > currentX ? "right" : "left";
        clawd.setDirection(direction);
        clawd.setAnimationState("walking");
        physics.walkToX(targetX, () => {
          clawd.setAnimationState("idle");
          clawd.setDirection(physics.getDirection());
        });
      },
      onChatClosed: () => {
        (chatWindow as ReturnType<typeof useChatWindow> & { _handleClosed: () => void })._handleClosed();
        if (physicsEnabled) {
          physics.startPhysics();
        }
      },
      onChatMoved: (chatX: number, chatY: number) => {
        chatWindow.updateOffset(chatX, chatY);
      },
      onOpenChatHistory: async () => {
        physics.stopPhysics();
        physics.stopWalking();
        await chatWindow.open();
      },
      onOpenSession: async (sessionId: string) => {
        // Close existing session viewer if open
        const existing = await WebviewWindow.getByLabel("session-viewer");
        if (existing) {
          await existing.close();
        }

        // Get position near Clawd
        const appWindow = getCurrentWindow();
        const position = await appWindow.outerPosition();
        const factor = await appWindow.scaleFactor();
        const clawdX = position.x / factor;
        const clawdY = position.y / factor;

        // Open session viewer window
        new WebviewWindow("session-viewer", {
          url: `index.html?chat=true&viewSession=${sessionId}`,
          title: "Chat History",
          width: CHAT_WIDTH,
          height: CHAT_HEIGHT,
          x: Math.round(clawdX + WINDOW_WIDTH - 5),
          y: Math.round(clawdY - CHAT_HEIGHT + WINDOW_HEIGHT - 20),
          resizable: false,
          decorations: false,
          transparent: true,
          alwaysOnTop: true,
          skipTaskbar: true,
          shadow: false,
        });
      },
    }),
    [clawd, physics, chatWindow, physicsEnabled]
  );

  useClawdEvents(eventHandlers, {
    chatOpen,
    isDragging: drag.isDragging,
    getCurrentX: () => physics.getState().x,
  });

  // Start physics on mount and when chat closes
  useEffect(() => {
    if (physicsEnabled && !chatOpen) {
      physics.startPhysics();
    } else {
      physics.stopPhysics();
    }
    // Note: physics methods are stable (useCallback), so we don't need physics in deps
    // Adding physics to deps would cause the effect to re-run on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [physicsEnabled, chatOpen]);

  // Click handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    drag.startDrag(e, false);
  };

  const handleClawdMouseDown = (e: React.MouseEvent) => {
    drag.startDrag(e, true);
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (drag.wasDragged) {
      drag.resetDragState();
      await physics.syncPosition();
      if (physicsEnabled) {
        physics.startPhysics();
      }
      return;
    }

    if (chatOpen) {
      await chatWindow.close();
      await physics.syncPosition();
      if (physicsEnabled) {
        physics.startPhysics();
      }
    } else {
      physics.stopPhysics();
      physics.stopWalking();
      await chatWindow.open();
    }
  };

  const handleDoubleClick = () => {
    setPhysicsEnabled((prev) => !prev);
  };

  return (
    <div
      className="mascot-container"
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      <div className="clawd-wrapper">
        <Clawd
          animationState={clawd.animationState}
          direction={clawd.direction}
          emotion={clawd.emotion}
          onClick={handleClick}
          onMouseDown={handleClawdMouseDown}
          onContextMenu={openContextMenu}
        />
      </div>
    </div>
  );
}

export default App;
