interface SpeechBubbleProps {
  message: string;
  isTyping?: boolean;
  isStreaming?: boolean;
  sender: "user" | "clawd";
}

/**
 * Render message content with basic markdown support for code blocks
 */
function renderContent(message: string) {
  // Split by code blocks (```...```)
  const parts = message.split(/(```[\s\S]*?```)/g);

  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      // Extract language and code
      const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
      if (match) {
        const [, lang, code] = match;
        return (
          <pre key={i} className="code-block" data-lang={lang || undefined}>
            <code>{code.trim()}</code>
          </pre>
        );
      }
    }
    // Regular text - preserve line breaks
    return (
      <span key={i}>
        {part.split("\n").map((line, j, arr) => (
          <span key={j}>
            {line}
            {j < arr.length - 1 && <br />}
          </span>
        ))}
      </span>
    );
  });
}

function SpeechBubble({
  message,
  isTyping,
  isStreaming,
  sender,
}: SpeechBubbleProps) {
  return (
    <div
      className={`speech-bubble speech-bubble-${sender} ${isStreaming ? "streaming" : ""}`}
    >
      <div className="speech-bubble-content">
        {isTyping ? (
          <span className="typing-indicator">
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
          </span>
        ) : (
          <>
            {renderContent(message)}
            {isStreaming && <span className="cursor-blink">|</span>}
          </>
        )}
      </div>
      <div className="speech-bubble-tail"></div>
    </div>
  );
}

export default SpeechBubble;
