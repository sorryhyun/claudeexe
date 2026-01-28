import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useModalWindow } from "../../hooks/useModalWindow";
import "../../styles/questionmodal.css";

interface PlanModeExitModalProps {
  onConfirm: () => void;
  onDeny?: (reason?: string) => void;
}

function PlanModeExitModal({ onConfirm, onDeny }: PlanModeExitModalProps) {
  const { t } = useTranslation();

  // Use modal window hook for escape key
  useModalWindow({
    onEscape: () => onDeny?.("User pressed escape"),
  });

  // Handle Enter key to confirm
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        onConfirm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onConfirm]);

  const handleDeny = useCallback(() => {
    onDeny?.("User requested to keep planning");
  }, [onDeny]);

  return (
    <div className="modal-overlay question-modal-overlay">
      <div className="modal question-modal plan-mode-exit-modal">
        <div className="modal-header question-modal-header">
          <span>{t("planModeModal.title")}</span>
        </div>

        <div className="modal-body">
          <div className="question-item">
            <div className="question-text">
              {t("planModeModal.message")}
            </div>
          </div>
        </div>

        <div className="modal-footer question-modal-footer plan-mode-exit-footer">
          {onDeny && (
            <button className="question-nav-btn" onClick={handleDeny}>
              {t("planModeModal.keepPlanning")}
            </button>
          )}
          <button className="question-submit-btn" onClick={onConfirm}>
            {t("planModeModal.startImplementation")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PlanModeExitModal;
