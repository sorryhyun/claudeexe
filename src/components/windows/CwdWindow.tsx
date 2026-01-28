import { useState, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit } from "@tauri-apps/api/event";
import { useTranslation } from "react-i18next";
import { commands } from "../../bindings";
import { useModalWindow } from "../../hooks/useModalWindow";
import { Modal } from "../modals/Modal";
import "../../styles/cwdmodal.css";

function CwdWindow() {
  const { t } = useTranslation();
  const [currentCwd, setCurrentCwd] = useState<string | null>(null);
  const [recentCwds, setRecentCwds] = useState<string[]>([]);
  const [inputPath, setInputPath] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Track when folder picker is open to skip blur handling
  const folderPickerOpenRef = useRef(false);

  const handleClose = async () => {
    const win = getCurrentWindow();
    await win.close();
  };

  const { handleDragStart } = useModalWindow({
    onEscape: handleClose,
    closeOnBlur: true,
    blurDelay: 150,
    skipBlurRef: folderPickerOpenRef,
  });

  // Load current cwd and recent cwds
  useEffect(() => {
    const loadData = async () => {
      try {
        const cwd = await commands.getActualCwd();
        setCurrentCwd(cwd);
        const recent = await commands.getRecentCwds();
        setRecentCwds(recent);
      } catch (err) {
        console.error("[CwdWindow] Failed to load data:", err);
      }
    };
    loadData();
  }, []);

  // Handle path change
  const handleSetCwd = async (path: string) => {
    try {
      setError(null);
      const result = await commands.setSidecarCwd(path);
      if (result.status === "ok") {
        // Emit event to notify chat window to clear history
        emit("cwd-changed");
        handleClose();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(`${t("cwdWindow.errorPrefix")}: ${err}`);
    }
  };

  // Open native folder picker and apply immediately
  const handleBrowse = async () => {
    try {
      // Mark folder picker as open to prevent close-on-blur
      folderPickerOpenRef.current = true;
      const folder = await commands.pickFolder();
      folderPickerOpenRef.current = false;
      if (folder) {
        setInputPath(folder);
        // Automatically apply the selected folder
        await handleSetCwd(folder);
      }
    } catch (err) {
      folderPickerOpenRef.current = false;
      console.error("[CwdWindow] Failed to pick folder:", err);
    }
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPath.trim()) {
      handleSetCwd(inputPath.trim());
    }
  };

  // Get display name for path (last folder name)
  const getDisplayName = (path: string) => {
    const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
    return parts[parts.length - 1] || path;
  };

  return (
    <Modal
      title={t("cwdWindow.title")}
      onClose={handleClose}
      className="cwd-modal"
      onMouseDown={handleDragStart}
      footer={<span className="cwd-hint">{t("cwdWindow.hint")}</span>}
    >
      <div className="cwd-modal-body">
        {/* Current CWD display */}
        <div className="cwd-current">
          <span className="cwd-label">{t("cwdWindow.currentDir")}</span>
          <span className="cwd-path" title={currentCwd || t("cwdWindow.loading")}>
            {currentCwd ? getDisplayName(currentCwd) : t("cwdWindow.loading")}
          </span>
        </div>

        {/* Input for new path */}
        <form className="cwd-input-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="cwd-input"
            placeholder={t("cwdWindow.placeholder")}
            value={inputPath}
            onChange={(e) => setInputPath(e.target.value)}
            autoFocus
          />
          <div className="cwd-btn-stack">
            <button
              type="button"
              className="cwd-browse-btn"
              onClick={handleBrowse}
            >
              {t("cwdWindow.browse")}
            </button>
            <button
              type="submit"
              className="cwd-submit-btn"
              disabled={!inputPath.trim()}
            >
              {t("cwdWindow.set")}
            </button>
          </div>
        </form>

        {error && <div className="cwd-error">{error}</div>}

        {/* Recent CWDs */}
        {recentCwds.length > 0 && (
          <div className="cwd-recent">
            <span className="cwd-label">{t("cwdWindow.recent")}</span>
            <div className="cwd-recent-list">
              {recentCwds.map((path, index) => (
                <button
                  key={index}
                  className="cwd-recent-item"
                  onClick={() => handleSetCwd(path)}
                  title={path}
                >
                  {getDisplayName(path)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default CwdWindow;
