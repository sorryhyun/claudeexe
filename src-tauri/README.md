# Backend (Rust / Tauri v2)

## Files

```
src/
├── lib.rs           # App entry, tauri-specta builder, tray/window setup
├── main.rs          # Binary entry point
├── state.rs         # Global state (Mutex statics, session persistence)
├── claude_runner.rs # Claude CLI process management, streaming JSON parsing
├── commands.rs      # Tauri IPC commands exposed to frontend
└── bin/
    └── codegen.rs   # TypeScript bindings generator
```

- `tauri.conf.json` - Tauri configuration

## Module Overview

| Module | Responsibility |
|--------|----------------|
| `lib.rs` | `run()` function, `create_specta_builder()`, system tray, window events |
| `state.rs` | Global statics (`SESSION_ID`, `DEV_MODE`, `SUPIKI_MODE`), session file persistence |
| `claude_runner.rs` | Spawns Claude CLI, parses streaming JSON output, emits events to frontend |
| `commands.rs` | All `#[tauri::command]` functions: `send_agent_message`, `quit_app`, `is_dev_mode`, etc. |

## Window Configuration

Defined in `tauri.conf.json`:
- Size: 160x140 pixels
- Transparent, no decorations, always-on-top
- Skips taskbar, no shadow

## Commands

```bash
cargo build    # Build backend
cargo check    # Type-check Rust code
cargo test     # Run unit tests
```

## Claude CLI Integration

The Rust backend spawns the Claude Code CLI (`claude`) with streaming JSON output:

```bash
claude --print \
  --output-format stream-json \
  --verbose \
  --mcp-config "path/to/mascot-mcp.json" \
  --allowedTools "mcp__mascot__*" \
  --system-prompt "..." \
  --resume <session-id> \
  "user prompt"
```

The `claude_runner.rs` module handles:
- Spawning the CLI process
- Parsing streaming JSON events (`system`, `assistant`, `user`, `result`)
- Emitting events to the frontend via Tauri's event system
- Session management for conversation resume

## Type-Safe IPC (tauri-specta)

Commands are exposed to the frontend via [tauri-specta](https://github.com/specta-rs/tauri-specta). TypeScript bindings are auto-generated to `../src/bindings.ts`.

To add a new command:
1. Add function with `#[tauri::command]` and `#[specta::specta]` in `commands.rs`
2. Register in `tauri_specta::collect_commands![...]` in `lib.rs`
3. Run `npm run dev` to regenerate bindings
