import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

/**
 * Move Clawd to a position on screen (X-axis, always walks)
 * @param {Function} emit - Function to emit events to Rust
 */
export function createMoveTool(emit) {
  return tool(
    "move_to",
    "Move Clawd to a horizontal position on the screen by walking. Use this to reposition yourself! You can move to the left edge, right edge, center, or a specific X coordinate.",
    {
      target: z.enum(["coordinates", "left", "right", "center"]).describe(
        "Where to move: 'coordinates' for specific x position, 'left' for left edge of screen, 'right' for right edge, 'center' for screen center"
      ),
      x: z.number().optional().describe(
        "X coordinate in pixels (only used when target is 'coordinates')"
      ),
    },
    async ({ target, x }) => {
      // Validate coordinates target has x
      if (target === "coordinates" && x === undefined) {
        return {
          content: [{ type: "text", text: "Error: x coordinate is required when target is 'coordinates'" }],
        };
      }

      // Log to stderr for debugging
      process.stderr.write(`[move_to] Called with target=${target}, x=${x}\n`);

      const event = {
        type: "move",
        target,
        x: x ?? null,
      };

      process.stderr.write(`[move_to] Emitting: ${JSON.stringify(event)}\n`);
      emit(event);

      return {
        content: [{ type: "text", text: "finished" }],
      };
    }
  );
}
