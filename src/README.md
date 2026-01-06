# Frontend (React / TypeScript)

## Directory Structure

```
src/
├── components/       # React components
├── hooks/            # Custom React hooks
├── services/         # Backend integration (Tauri IPC, agent service)
├── types/            # Centralized type exports
├── styles/           # CSS modules
├── constants.ts      # App-wide constants
├── emotions.ts       # Emotion types and visual config
└── main.tsx          # Entry point with routing
```

## Components (`components/`)

| File | Description |
|------|-------------|
| `App.tsx` | Main orchestrator: physics, mascot state, drag/click handlers, window management |
| `Clawd.tsx` | SVG mascot with emotion-based eyes/eyebrows and state animations |
| `ChatWindow.tsx` | Chat UI container with message list and input |
| `ChatInput.tsx` | Message input form |
| `SpeechBubble.tsx` | Message bubble with markdown code block support |
| `ContextMenuWindow.tsx` | Right-click context menu |

## Hooks (`hooks/`)

| File | Description |
|------|-------------|
| `useMascotState.ts` | State machine: idle, walking, talking, jumping, falling + emotions |
| `usePhysics.ts` | Physics engine: gravity, collisions, walking, window positioning |
| `useAgentChat.ts` | Claude agent integration with streaming and tool tracking |
| `useChatHistory.ts` | Wrapper around useAgentChat for backward compatibility |

## Services (`services/`)

| File | Description |
|------|-------------|
| `agentService.ts` | Tauri IPC bridge to sidecar agent |
| `agentTypes.ts` | TypeScript interfaces for agent messages |
| `emotionMapper.ts` | Detects emotions from message content |

## Key Behaviors

- **Physics**: Window moves via Tauri's `setPosition` API with gravity, floor/wall collisions, and bounce effects
- **Auto-walk**: Randomly triggers walking every 15-45 seconds (30% chance)
- **Interactions**: Click toggles chat; double-click toggles physics; drag repositions
- **Direction**: Mascot faces left/right via CSS `scaleX(-1)` transform
- **Emotions**: Set via agent's `set_emotion` tool, received via Tauri events
