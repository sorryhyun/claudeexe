import { useState, useEffect, useCallback } from "react";
import type { AgentQuestion } from "../services/agentTypes";
import "./QuestionModal.css";

interface QuestionModalProps {
  questionId: string;
  questions: AgentQuestion[];
  onSubmit: (answers: Record<string, string>) => void;
  onCancel?: () => void;
}

function QuestionModal({
  questionId: _questionId,
  questions,
  onSubmit,
  onCancel,
}: QuestionModalProps) {
  // Track selected answers for each question
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  // Track "Other" text input for each question
  const [otherText, setOtherText] = useState<Record<string, string>>({});
  // Track which questions have "Other" selected
  const [otherSelected, setOtherSelected] = useState<Record<string, boolean>>(
    {}
  );

  // Check if all questions have answers
  const allAnswered = questions.every((q) => {
    const selected = answers[q.question] || [];
    const hasOther = otherSelected[q.question] && otherText[q.question]?.trim();
    return selected.length > 0 || hasOther;
  });

  // Handle option selection
  const handleSelect = (question: AgentQuestion, optionLabel: string) => {
    setAnswers((prev) => {
      const current = prev[question.question] || [];

      if (question.multiSelect) {
        // Toggle for multi-select
        if (current.includes(optionLabel)) {
          return {
            ...prev,
            [question.question]: current.filter((l) => l !== optionLabel),
          };
        } else {
          return {
            ...prev,
            [question.question]: [...current, optionLabel],
          };
        }
      } else {
        // Single-select: replace
        // Clear "Other" when selecting a regular option
        setOtherSelected((prev) => ({ ...prev, [question.question]: false }));
        setOtherText((prev) => ({ ...prev, [question.question]: "" }));
        return {
          ...prev,
          [question.question]: [optionLabel],
        };
      }
    });
  };

  // Handle "Other" toggle
  const handleOtherToggle = (question: AgentQuestion) => {
    if (!question.multiSelect) {
      // For single-select, clear regular selections when choosing Other
      setAnswers((prev) => ({ ...prev, [question.question]: [] }));
    }
    setOtherSelected((prev) => ({
      ...prev,
      [question.question]: !prev[question.question],
    }));
  };

  // Handle submit
  const handleSubmit = useCallback(() => {
    const formattedAnswers: Record<string, string> = {};

    for (const question of questions) {
      const selected = answers[question.question] || [];
      const hasOther =
        otherSelected[question.question] && otherText[question.question]?.trim();

      const allSelected = hasOther
        ? [...selected, otherText[question.question].trim()]
        : selected;

      // Multi-select answers are comma-separated
      formattedAnswers[question.question] = allSelected.join(", ");
    }

    onSubmit(formattedAnswers);
  }, [questions, answers, otherSelected, otherText, onSubmit]);

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onCancel) {
        onCancel();
      } else if (e.key === "Enter" && allAnswered && !e.shiftKey) {
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [allAnswered, handleSubmit, onCancel]);

  return (
    <div className="question-modal-overlay">
      <div className="question-modal">
        <div className="question-modal-header">
          <span>Question from Clawd</span>
          {onCancel && (
            <button className="question-modal-close" onClick={onCancel}>
              x
            </button>
          )}
        </div>

        <div className="question-modal-body">
          {questions.map((question, index) => (
            <div key={index} className="question-item">
              <div className="question-header-tag">{question.header}</div>
              <div className="question-text">{question.question}</div>

              <div className="question-options">
                {question.options.map((option, optIndex) => {
                  const isSelected = (
                    answers[question.question] || []
                  ).includes(option.label);

                  return (
                    <button
                      key={optIndex}
                      className={`question-option ${isSelected ? "selected" : ""}`}
                      onClick={() => handleSelect(question, option.label)}
                    >
                      <span className="option-indicator">
                        {question.multiSelect ? (
                          isSelected ? "✓" : "○"
                        ) : isSelected ? (
                          "●"
                        ) : (
                          "○"
                        )}
                      </span>
                      <div className="option-content">
                        <div className="option-label">{option.label}</div>
                        {option.description && (
                          <div className="option-description">
                            {option.description}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* "Other" option */}
                <button
                  className={`question-option other-option ${otherSelected[question.question] ? "selected" : ""}`}
                  onClick={() => handleOtherToggle(question)}
                >
                  <span className="option-indicator">
                    {question.multiSelect ? (
                      otherSelected[question.question] ? "✓" : "○"
                    ) : otherSelected[question.question] ? (
                      "●"
                    ) : (
                      "○"
                    )}
                  </span>
                  <div className="option-content">
                    <div className="option-label">Other</div>
                  </div>
                </button>

                {otherSelected[question.question] && (
                  <input
                    type="text"
                    className="other-input"
                    placeholder="Enter your answer..."
                    value={otherText[question.question] || ""}
                    onChange={(e) =>
                      setOtherText((prev) => ({
                        ...prev,
                        [question.question]: e.target.value,
                      }))
                    }
                    autoFocus
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="question-modal-footer">
          <button
            className="question-submit-btn"
            onClick={handleSubmit}
            disabled={!allAnswered}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuestionModal;
