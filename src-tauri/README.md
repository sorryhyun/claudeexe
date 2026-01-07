# Backend (Rust / Tauri v2)

## Files

```
src/
├── lib.rs       # App entry, tauri-specta builder, tray/window setup
├── main.rs      # Binary entry point
├── state.rs     # Global state (Mutex statics, session persistence)
├── sidecar.rs   # Sidecar process management (spawn, IPC, event routing)
├── commands.rs  # Tauri IPC commands exposed to frontend
└── bin/
    └── codegen.rs  # TypeScript bindings generator
```

- `tauri.conf.json` - Tauri configuration

## Module Overview

| Module | Responsibility |
|--------|----------------|
| `lib.rs` | `run()` function, `create_specta_builder()`, system tray, window events |
| `state.rs` | Global statics (`SIDECAR_PROCESS`, `SESSION_ID`, `DEV_MODE`, `SUPIKI_MODE`), session file persistence |
| `sidecar.rs` | `SidecarMode` enum, `ensure_sidecar_running()`, `send_to_sidecar()`, stdout/stderr readers |
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

## Sidecar Communication

The Rust backend spawns and communicates with the Node.js sidecar (`sidecar/agent-sidecar.mjs`) via stdio. See `../sidecar/README.md` for the IPC protocol.

## Type-Safe IPC (tauri-specta)

Commands are exposed to the frontend via [tauri-specta](https://github.com/specta-rs/tauri-specta). TypeScript bindings are auto-generated to `../src/bindings.ts`.

To add a new command:
1. Add function with `#[tauri::command]` and `#[specta::specta]` in `commands.rs`
2. Register in `tauri_specta::collect_commands![...]` in `lib.rs`
3. Run `npm run dev` to regenerate bindings
