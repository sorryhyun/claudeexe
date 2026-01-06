import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { emitTo } from "@tauri-apps/api/event";

function ContextMenuWindow() {
  // Close when losing focus (clicking outside)
  useEffect(() => {
    const win = getCurrentWindow();
    let blurTimeout: number | null = null;

    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        await win.close();
      }
    };

    // Close when window loses focus (with delay to allow click handlers to run first)
    const unlisten = win.onFocusChanged(async ({ payload: focused }) => {
      if (!focused) {
        // Small delay to allow button clicks to execute before closing
        blurTimeout = window.setTimeout(async () => {
          await win.close();
        }, 100);
      } else if (blurTimeout) {
        clearTimeout(blurTimeout);
        blurTimeout = null;
      }
    });

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (blurTimeout) clearTimeout(blurTimeout);
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleChatHistory = async () => {
    // Emit to main window (not current context menu window)
    await emitTo("main", "open-chat-history");
    const win = getCurrentWindow();
    await win.close();
  };

  const handleExit = async () => {
    // Invoke quit first - app will exit before this returns
    invoke("quit_app");
  };

  return (
    <div className="context-menu-window">
      <button className="context-menu-item" onClick={handleChatHistory}>
        Chat History
      </button>
      <div className="context-menu-divider" />
      <button className="context-menu-item context-menu-item-exit" onClick={handleExit}>
        Bye
      </button>
    </div>
  );
}

export default ContextMenuWindow;
