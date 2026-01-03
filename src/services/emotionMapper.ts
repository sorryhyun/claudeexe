import type { MascotState } from "../useMascotState";
import type { EmotionContext } from "./agentTypes";

// Keywords/patterns that suggest different emotions
const EMOTION_PATTERNS = {
  excited: [
    /done|complete|success|finished|fixed|solved/i,
    /great|awesome|perfect|excellent/i,
    /!\s*$/,
  ],
  confused: [
    /\?{2,}/,
    /not sure|unclear|confused|don't understand/i,
    /could you clarify|what do you mean/i,
  ],
  thinking: [
    /let me|analyzing|looking|searching|checking/i,
    /hmm|well|interesting/i,
  ],
};

/**
 * Detect the appropriate mascot emotion based on agent context
 */
export function detectEmotion(context: EmotionContext): MascotState {
  const { content, isToolRunning, hasError } = context;

  // Error state - return to idle
  if (hasError) {
    return "idle";
  }

  // Tool is actively running - show "talking" (working)
  if (isToolRunning) {
    return "talking";
  }

  // Check for excited patterns (task completion) - celebrate with jump!
  for (const pattern of EMOTION_PATTERNS.excited) {
    if (pattern.test(content)) {
      return "jumping";
    }
  }

  // Check for thinking patterns
  for (const pattern of EMOTION_PATTERNS.thinking) {
    if (pattern.test(content)) {
      return "talking";
    }
  }

  // Default to talking while responding
  if (content.length > 0) {
    return "talking";
  }

  return "idle";
}

/**
 * Determine how long to maintain the emotional state
 */
export function getEmotionDuration(state: MascotState): number {
  switch (state) {
    case "jumping":
      return 1000; // Quick celebratory jump
    case "talking":
      return 2000; // Standard talking duration
    default:
      return 0;
  }
}
