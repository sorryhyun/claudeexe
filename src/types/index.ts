/**
 * Centralized type exports
 * Import types from here instead of individual files for cleaner imports
 */

// Emotion types and config
export type { Emotion, EyeConfig } from "../emotions";
export { EMOTIONS, EMOTION_CONFIG } from "../emotions";

// Mascot state types
export type { MascotState, Direction } from "../hooks/useMascotState";

// Agent/chat types
export type {
  StreamingState,
  ToolUseInfo,
  AgentChatMessage,
  AgentQueryCallbacks,
  EmotionContext,
} from "../services/agentTypes";
