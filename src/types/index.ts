/**
 * Centralized type exports
 * Import types from here instead of individual files for cleaner imports
 */

// Emotion types (high-level semantic emotion)
export type { Emotion, FacialState, EyeConfig } from "../emotion";
export { EMOTIONS, FACIAL_STATES, FACIAL_CONFIG, emotionToFacial } from "../emotion";

// Animation state types (physical/behavioral)
export type { AnimationState, Direction } from "../hooks/useMascotState";

// Agent/chat types
export type {
  StreamingState,
  ToolUseInfo,
  AgentChatMessage,
  AgentQueryCallbacks,
  EmotionContext,
} from "../services/agentTypes";
