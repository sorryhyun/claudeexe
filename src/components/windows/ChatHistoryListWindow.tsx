import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emitTo } from "@tauri-apps/api/event";
import { useTranslation } from "react-i18next";
import { sessionStorage } from "../../services/sessionStorage";
import type { ChatSession } from "../../services/agentTypes";
import { useModalWindow } from "../../hooks/useModalWindow";
import { Modal } from "../modals/Modal";
import { getLanguage } from "../../services/settingsStorage";

function formatDate(timestamp: number, t: (key: string) => string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const locale = getLanguage();

  if (days === 0) {
    return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  } else if (days === 1) {
    return t("historyList.yesterday");
  } else if (days < 7) {
    return date.toLocaleDateString(locale, { weekday: "short" });
  } else {
    return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
  }
}

function ChatHistoryListWindow() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    setSessions(sessionStorage.getSessions());
  }, []);

  const handleClose = async () => {
    const win = getCurrentWindow();
    await win.close();
  };

  const { handleDragStart } = useModalWindow({
    onEscape: handleClose,
    closeOnBlur: true,
    blurDelay: 150,
    skipDragSelector: ".history-list-item",
  });

  const handleSelectSession = async (session: ChatSession) => {
    // Emit to main window to open this session
    await emitTo("main", "open-session", { sessionId: session.id });
    await handleClose();
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    sessionStorage.deleteSession(sessionId);
    setSessions(sessionStorage.getSessions());
  };

  return (
    <Modal
      title={t("historyList.title")}
      onClose={handleClose}
      className="history-list-window"
      onMouseDown={handleDragStart}
    >
      <div className="history-list-body">
        {sessions.length === 0 ? (
          <div className="history-list-empty">{t("historyList.empty")}</div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="history-list-item"
              onClick={() => handleSelectSession(session)}
            >
              <div className="history-list-item-content">
                <div className="history-list-item-title">{session.title}</div>
                <div className="history-list-item-meta">
                  <span>{session.messageCount} {t("historyList.messages")}</span>
                  <span>{formatDate(session.updatedAt, t)}</span>
                </div>
              </div>
              <button
                className="history-list-item-delete"
                onClick={(e) => handleDeleteSession(e, session.id)}
                title={t("historyList.delete")}
              >
                x
              </button>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

export default ChatHistoryListWindow;
