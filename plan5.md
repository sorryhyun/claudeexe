# Plan 5: Use Claude Code CLI as Backend

Shell out to `claude` CLI instead of re-implementing the agent SDK.

## Status: ✅ Feasibility Confirmed

Tested and verified:
- `--print` mode for non-interactive output
- `--output-format stream-json --verbose` for streaming
- `--resume <session-id>` for session continuity
- `--mcp-config` for custom tools
- `--allowedTools` for pre-approving MCP tools

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Claude Mascot.exe (Tauri)                     │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React)                                                │
│  └── Chat UI, mascot rendering, event listeners                  │
├─────────────────────────────────────────────────────────────────┤
│  Backend (Rust)                                                  │
│  ├── Spawn `claude` CLI with args                                │
│  ├── Parse streaming JSON from stdout                            │
│  ├── Emit events to frontend                                     │
│  └── Store session_id for resume                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │ spawn
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  claude (user's installed Claude Code)                           │
│  --print --output-format stream-json --verbose                   │
│  --mcp-config mascot-mcp.json                                    │
│  --allowedTools "mcp__mascot__*"                                 │
│  --resume <session-id>                                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │ stdio
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  mascot-mcp.exe (Rust binary, ~500KB)                            │
│  └── Provides: set_emotion, move_to, capture_screenshot, etc.   │
│  └── No runtime dependencies (no Node.js required)              │
└─────────────────────────────────────────────────────────────────┘
```

## Verified CLI Pattern

```bash
claude --print \
  --output-format stream-json \
  --verbose \
  --mcp-config "path/to/mascot-mcp.json" \
  --allowedTools "mcp__mascot__set_emotion" "mcp__mascot__move_to" \
  --system-prompt "You are Clawd, a friendly mascot..." \
  --resume <session-id> \
  "user prompt here"
```

## Streaming JSON Output Format

Each line is a JSON object:

```jsonc
// 1. Init event (first line)
{
  "type": "system",
  "subtype": "init",
  "session_id": "uuid",
  "tools": ["mcp__mascot__set_emotion", ...],
  "mcp_servers": [{"name": "mascot", "status": "connected"}]
}

// 2. Assistant message (may include tool_use)
{
  "type": "assistant",
  "message": {
    "content": [
      {"type": "text", "text": "Let me show you..."},
      {"type": "tool_use", "id": "toolu_xxx", "name": "mcp__mascot__set_emotion", "input": {"emotion": "happy"}}
    ]
  }
}

// 3. Tool result
{
  "type": "user",
  "tool_use_result": [{"type": "text", "text": "Emotion set to: happy"}]
}

// 4. Final result
{
  "type": "result",
  "subtype": "success",
  "result": "Done! The mascot is now showing a happy emotion.",
  "session_id": "uuid-to-save-for-resume"
}
```

## MCP Server Implementation (Rust)

Using the official [`rmcp`](https://github.com/modelcontextprotocol/rust-sdk) crate for a native MCP server.

### Project Structure

```
mascot-mcp/
├── Cargo.toml
└── src/
    └── main.rs
```

### Cargo.toml (`mascot-mcp/Cargo.toml`)

```toml
[package]
name = "mascot-mcp"
version = "0.1.0"
edition = "2021"

[dependencies]
rmcp = { version = "0.8", features = ["server", "transport-io"] }
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
schemars = "1.0"
```

### MCP Server (`mascot-mcp/src/main.rs`)

```rust
use rmcp::{
    ServerHandler, ServerInfo, ServerCapabilities, Implementation,
    ProtocolVersion, tool, tool_router, tool_handler,
    types::{CallToolResult, McpError},
    transport::stdio,
};
use schemars::JsonSchema;
use serde::Deserialize;

#[derive(Debug, Deserialize, JsonSchema)]
struct SetEmotionRequest {
    #[schemars(description = "The emotion to display: neutral, happy, sad, excited, thinking")]
    emotion: String,
    #[schemars(description = "Duration in milliseconds (default: 5000)")]
    duration: Option<u32>,
}

#[derive(Debug, Deserialize, JsonSchema)]
struct MoveToRequest {
    #[schemars(description = "Target position: left, right, or center")]
    target: String,
}

#[derive(Debug, Deserialize, JsonSchema)]
struct CaptureScreenshotRequest {
    #[schemars(description = "Optional region to capture")]
    region: Option<String>,
}

struct MascotService;

#[tool_router]
impl MascotService {
    #[tool(description = "Set the mascot's emotional expression")]
    async fn set_emotion(
        &self,
        req: SetEmotionRequest,
    ) -> Result<CallToolResult, McpError> {
        let duration = req.duration.unwrap_or(5000);
        // The tool result is returned to Claude; Tauri parses tool_use from stream
        Ok(CallToolResult::text(format!(
            "Emotion set to '{}' for {}ms",
            req.emotion, duration
        )))
    }

    #[tool(description = "Move the mascot to a screen position")]
    async fn move_to(
        &self,
        req: MoveToRequest,
    ) -> Result<CallToolResult, McpError> {
        Ok(CallToolResult::text(format!(
            "Moving mascot to: {}",
            req.target
        )))
    }

    #[tool(description = "Capture a screenshot of the user's screen")]
    async fn capture_screenshot(
        &self,
        req: CaptureScreenshotRequest,
    ) -> Result<CallToolResult, McpError> {
        // In real impl: use screenshots crate or Windows API
        let region = req.region.unwrap_or_else(|| "full".to_string());
        Ok(CallToolResult::text(format!(
            "Screenshot captured (region: {})",
            region
        )))
    }
}

#[tool_handler]
impl ServerHandler for MascotService {
    fn get_info(&self) -> ServerInfo {
        ServerInfo {
            protocol_version: ProtocolVersion::V_2024_11_05,
            capabilities: ServerCapabilities::builder()
                .enable_tools()
                .build(),
            server_info: Implementation::new("mascot-mcp", "1.0.0"),
            instructions: Some(
                "MCP server for controlling the Clawd desktop mascot. \
                 Use set_emotion to change expressions, move_to for positioning."
                    .to_string(),
            ),
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Serve via stdio (Claude CLI spawns this process)
    let service = MascotService.serve(stdio()).await?;
    service.waiting().await?;
    Ok(())
}
```

### MCP Config (`mascot-mcp.json`)

```json
{
  "mcpServers": {
    "mascot": {
      "command": "${APP_DIR}/mascot-mcp.exe",
      "args": []
    }
  }
}
```

Note: `${APP_DIR}` is resolved at runtime by Tauri to the app's resource directory.

### Build Commands

```bash
# Build the MCP server binary
cd mascot-mcp
cargo build --release

# Cross-compile for Windows (if on Linux/Mac)
cargo build --release --target x86_64-pc-windows-msvc

# Output: target/release/mascot-mcp.exe (~500KB-1MB)
```

## Rust Implementation

### 1. Claude Runner (`src-tauri/src/claude_runner.rs`)

```rust
use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader};
use serde::{Deserialize, Serialize};
use tauri::Emitter;

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum StreamEvent {
    System {
        session_id: String,
        #[serde(default)]
        mcp_servers: Vec<McpServerStatus>,
    },
    Assistant {
        message: AssistantMessage,
    },
    User {
        #[serde(default)]
        tool_use_result: Option<serde_json::Value>,
    },
    Result {
        subtype: String,
        result: String,
        session_id: String,
    },
}

#[derive(Debug, Deserialize)]
pub struct McpServerStatus {
    pub name: String,
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct AssistantMessage {
    pub content: Vec<ContentBlock>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ContentBlock {
    Text { text: String },
    ToolUse { id: String, name: String, input: serde_json::Value },
}

pub struct ClaudeRunner {
    session_id: Option<String>,
    mcp_config_path: String,
    system_prompt: String,
}

impl ClaudeRunner {
    pub fn new(mcp_config_path: String, system_prompt: String) -> Self {
        Self {
            session_id: None,
            mcp_config_path,
            system_prompt,
        }
    }

    pub async fn query(
        &mut self,
        prompt: &str,
        app: tauri::AppHandle,
    ) -> Result<String, String> {
        let mut args = vec![
            "--print".to_string(),
            "--output-format".to_string(), "stream-json".to_string(),
            "--verbose".to_string(),
            "--mcp-config".to_string(), self.mcp_config_path.clone(),
            "--allowedTools".to_string(),
            "mcp__mascot__set_emotion".to_string(),
            "mcp__mascot__move_to".to_string(),
            "--system-prompt".to_string(), self.system_prompt.clone(),
        ];

        // Add resume if we have a session
        if let Some(ref session_id) = self.session_id {
            args.push("--resume".to_string());
            args.push(session_id.clone());
        }

        // Add the prompt
        args.push(prompt.to_string());

        // Spawn claude process
        let mut child = Command::new("claude")
            .args(&args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn claude: {}", e))?;

        let stdout = child.stdout.take().unwrap();
        let reader = BufReader::new(stdout);

        let mut final_result = String::new();

        for line in reader.lines() {
            let line = line.map_err(|e| e.to_string())?;

            if let Ok(event) = serde_json::from_str::<StreamEvent>(&line) {
                match event {
                    StreamEvent::System { session_id, mcp_servers } => {
                        self.session_id = Some(session_id);
                        // Check MCP server status
                        for server in mcp_servers {
                            if server.status != "connected" {
                                eprintln!("MCP server {} status: {}", server.name, server.status);
                            }
                        }
                    }
                    StreamEvent::Assistant { message } => {
                        for block in message.content {
                            match block {
                                ContentBlock::Text { text } => {
                                    app.emit("agent-stream", &text).ok();
                                }
                                ContentBlock::ToolUse { name, input, .. } => {
                                    // MCP tool was called - the MCP server handles it
                                    // But we can also emit an event for the frontend
                                    if name == "mcp__mascot__set_emotion" {
                                        app.emit("agent-emotion", &input).ok();
                                    } else if name == "mcp__mascot__move_to" {
                                        app.emit("clawd-move", &input).ok();
                                    }
                                }
                            }
                        }
                    }
                    StreamEvent::Result { result, session_id, .. } => {
                        self.session_id = Some(session_id);
                        final_result = result;
                    }
                    _ => {}
                }
            }
        }

        child.wait().map_err(|e| e.to_string())?;

        app.emit("agent-result", serde_json::json!({
            "success": true,
            "text": final_result
        })).ok();

        Ok(final_result)
    }

    pub fn clear_session(&mut self) {
        self.session_id = None;
    }
}
```

### 2. Tauri Command (`src-tauri/src/commands.rs`)

```rust
use crate::claude_runner::ClaudeRunner;
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::State;

pub struct AppState {
    pub claude: Arc<Mutex<ClaudeRunner>>,
}

#[tauri::command]
pub async fn send_agent_message(
    message: String,
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let mut claude = state.claude.lock().await;

    // Run in background so we don't block
    let app_clone = app.clone();
    tokio::spawn(async move {
        if let Err(e) = claude.query(&message, app_clone.clone()).await {
            app_clone.emit("agent-error", serde_json::json!({ "error": e })).ok();
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn clear_session(state: State<'_, AppState>) -> Result<(), String> {
    let mut claude = state.claude.lock().await;
    claude.clear_session();
    Ok(())
}
```

### 3. MCP Server Communication

The MCP server runs as a separate process spawned by Claude CLI. To communicate tool results back to Tauri, we have options:

**Option A: Parse tool_use from Claude's output (simplest)**
- Already implemented above - we see `ContentBlock::ToolUse` in the stream
- Emit Tauri events directly when we see tool calls

**Option B: MCP server writes to a file/socket that Tauri reads**
- More complex but allows MCP server to trigger Tauri actions

**Option C: MCP server connects to Tauri via HTTP**
- MCP server makes HTTP request to localhost:PORT
- Tauri runs a small HTTP server

For the mascot use case, **Option A is sufficient** since we just need to react to emotions/moves.

## Implementation Tasks

| # | Task | LOC | Status |
|---|------|-----|--------|
| 1 | Create `mascot-mcp/` Rust crate with `rmcp` | ~100 | ☐ |
| 2 | Create `claude_runner.rs` | ~100 | ☐ |
| 3 | Create `mascot-mcp.json` config (generated at runtime) | ~10 | ☐ |
| 4 | Update `commands.rs` to use ClaudeRunner | ~30 | ☐ |
| 5 | Update `lib.rs` to initialize state | ~20 | ☐ |
| 6 | Add `mascot-mcp` to workspace `Cargo.toml` | ~5 | ☐ |
| 7 | Update Tauri build to compile & bundle `mascot-mcp.exe` | ~20 | ☐ |
| 8 | Delete old `sidecar/` directory | - | ☐ |
| 9 | Delete old sidecar build scripts | - | ☐ |
| 10 | Test end-to-end | - | ☐ |

**Total: ~285 lines of Rust code (no JS/Node.js required)**

## Prerequisites

Users must have Claude Code CLI installed:
```bash
# Via the installer (recommended - no Node.js required)
# https://claude.ai/download

# Or via npm (requires Node.js)
npm install -g @anthropic-ai/claude-code
```

The app should check for `claude` in PATH on startup and show a helpful message if not found.

**Note:** The Rust MCP server approach means users do NOT need Node.js installed - they only need Claude Code CLI (which has its own standalone installer).

## What We Keep

- `src/` - React frontend (unchanged)
- `src-tauri/` - Rust backend (simplified)

## What We Add

- `mascot-mcp/` - New Rust crate for MCP server (~100 LOC)

## What We Delete

- `sidecar/` - Entire directory (~90MB of Bun runtime)
- `scripts/bundle-sidecar.mjs`
- Complex sidecar spawning logic in `sidecar.rs`

## Result

| Metric | Before (Plan 4) | Plan 5 (Node.js MCP) | Plan 5 (Rust MCP) |
|--------|-----------------|----------------------|-------------------|
| New code | ~950 LOC Rust | ~250 LOC Rust + JS | ~285 LOC Rust |
| Complexity | High | Low | Low |
| Dependencies | Many new crates | Node.js runtime | `rmcp` crate only |
| Runtime required | None | Node.js | None |
| MCP server size | N/A | ~50MB (with Node) | ~500KB-1MB |
| Claude Code | Not needed | Required | Required |
| Total binary size | ~15MB | ~60MB+ | ~11MB |

## Advantages of Rust MCP Server

1. **No Node.js dependency** - Users don't need to install Node.js
2. **Tiny binary** - MCP server is ~500KB vs ~50MB with Node runtime
3. **Fast startup** - Native binary starts in milliseconds
4. **Type safety** - Compile-time guarantees for MCP protocol
5. **Single toolchain** - Everything is Rust, simpler build process
6. **Cross-compilation** - Easy to build for all platforms with `cargo`

## Open Questions (Resolved)

1. ~~How to bundle claude.exe?~~ → Require user to install Claude Code
2. ~~MCP server architecture?~~ → Rust binary using `rmcp` crate
3. ~~Session management?~~ → Use `--resume` flag with stored session_id
4. ~~Node.js dependency?~~ → Eliminated with Rust MCP server

## Next Steps

1. Create `mascot-mcp/` workspace member with `rmcp`
2. Implement MCP tools (set_emotion, move_to, capture_screenshot)
3. Implement `claude_runner.rs`
4. Update Tauri build to bundle `mascot-mcp.exe`
5. Test with the existing frontend
6. Remove old sidecar code
