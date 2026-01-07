/**
 * High-level Emotion type - the semantic emotion exposed as a tool.
 * This maps to FacialState for visual rendering.
 */
export type Emotion =
  | "neutral"
  | "happy"
  | "sad"
  | "excited"
  | "thinking"
  | "confused"
  | "surprised"
  | "curious";

export const EMOTIONS: Emotion[] = [
  "neutral",
  "happy",
  "sad",
  "excited",
  "thinking",
  "confused",
  "surprised",
  "curious",
];

// Re-export FacialState types for components that need the visual config
export type { FacialState, EyeConfig } from "./facialState";
export { FACIAL_STATES, FACIAL_CONFIG, emotionToFacial } from "./facialState";
