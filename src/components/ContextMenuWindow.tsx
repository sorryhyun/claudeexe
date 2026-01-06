import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";

function ContextMenuWindow() {
  useEffect(() => {
    const handleBlur = async () => {
      const win = getCurrentWindow();
      await win.close();
    };

    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const win = getCurrentWindow();
        await win.close();
      }
    };

    // Close on blur (clicking outside)
    window.addEventListener("blur", handleBlur);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleChatHistory = async () => {
    await emit("open-chat-history");
    const win = getCurrentWindow();
    await win.close();
  };

  const handleExit = async () => {
    const win = getCurrentWindow();
    await win.close();
    await invoke("quit_app");
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
