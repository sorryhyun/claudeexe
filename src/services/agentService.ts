import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { AgentQueryCallbacks } from "./agentTypes";

export class AgentService {
  private listeners: UnlistenFn[] = [];

  async sendMessage(
    prompt: string,
    callbacks: AgentQueryCallbacks
  ): Promise<void> {
    console.log("[AgentService] Sending message:", prompt);
    callbacks.onStreamStart();

    // Clean up any previous listeners
    await this.cleanup();

    try {
      // Set up event listeners for streaming
      const streamListener = await listen<string>("claude-stream", (event) => {
        console.log("[AgentService] Stream event:", event.payload);
        callbacks.onPartialMessage(event.payload);
      });
      this.listeners.push(streamListener);

      const resultListener = await listen<{ subtype: string; result: string }>(
        "claude-result",
        (event) => {
          console.log("[AgentService] Result event:", event.payload);
          const { result } = event.payload;
          callbacks.onComplete(result, {
            costUsd: 0,
            sessionId: "",
          });
        }
      );
      this.listeners.push(resultListener);

      const errorListener = await listen<string>("claude-error", (event) => {
        console.error("[AgentService] Error event:", event.payload);
        callbacks.onError(new Error(event.payload));
      });
      this.listeners.push(errorListener);

      // Listen to raw output for debugging
      const rawListener = await listen<string>("claude-raw", (event) => {
        console.log("[AgentService] Raw CLI output:", event.payload);
      });
      this.listeners.push(rawListener);

      console.log("[AgentService] Invoking send_claude_message...");
      // Invoke the Rust command
      const result = await invoke<string>("send_claude_message", {
        message: prompt,
      });

      console.log("[AgentService] Invoke returned:", result);
      // If we got a direct result (no streaming events), use it
      if (result) {
        callbacks.onComplete(result, {
          costUsd: 0,
          sessionId: await this.getSessionId() || "",
        });
      }
    } catch (error) {
      console.error("[AgentService] Invoke error:", error);
      callbacks.onError(
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      await this.cleanup();
    }
  }

  private async cleanup(): Promise<void> {
    for (const unlisten of this.listeners) {
      unlisten();
    }
    this.listeners = [];
  }

  async interrupt(): Promise<void> {
    // Note: Interrupting a spawned process requires more complex handling
    // For now, we just clean up listeners
    await this.cleanup();
  }

  async clearSession(): Promise<void> {
    await invoke("clear_claude_session");
  }

  async getSessionId(): Promise<string | null> {
    return await invoke<string | null>("get_session_id");
  }
}

// Singleton instance
let agentServiceInstance: AgentService | null = null;

export function getAgentService(): AgentService {
  if (!agentServiceInstance) {
    agentServiceInstance = new AgentService();
  }
  return agentServiceInstance;
}
