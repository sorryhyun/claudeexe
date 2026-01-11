//! MCP server for controlling the Clawd desktop mascot.
//!
//! This server provides tools that Claude can use to control the mascot's
//! emotions and movement. The actual mascot control happens when Tauri
//! parses the tool_use events from Claude CLI's output stream.

use std::future::Future;

use anyhow::Result;
use rmcp::{
    handler::server::{router::tool::ToolRouter, tool::Parameters},
    model::*,
    schemars, tool, tool_handler, tool_router, ServerHandler, ServiceExt,
};

/// Request to set the mascot's emotional expression
#[derive(serde::Deserialize, schemars::JsonSchema)]
pub struct SetEmotionRequest {
    /// The emotion to display: neutral, happy, sad, excited, thinking, surprised, love
    emotion: String,
    /// Duration in milliseconds (default: 5000)
    #[serde(default)]
    duration_ms: Option<u32>,
}

/// Request to move the mascot to a screen position
#[derive(serde::Deserialize, schemars::JsonSchema)]
pub struct MoveToRequest {
    /// Target position: "left", "right", "center", or an x-coordinate number
    target: String,
}

/// Request to capture a screenshot
#[derive(serde::Deserialize, schemars::JsonSchema)]
pub struct CaptureScreenshotRequest {
    /// Optional description of what to look for in the screenshot
    #[serde(default)]
    description: Option<String>,
}

/// The mascot MCP server
pub struct MascotService {
    tool_router: ToolRouter<MascotService>,
}

#[tool_router]
impl MascotService {
    fn new() -> Self {
        Self {
            tool_router: Self::tool_router(),
        }
    }

    /// Set the mascot's emotional expression.
    /// Use this to make Clawd express different emotions like happy, sad, excited, etc.
    #[tool(
        description = "Set the mascot's emotional expression. Available emotions: neutral, happy, sad, excited, thinking, surprised, love"
    )]
    async fn set_emotion(
        &self,
        Parameters(req): Parameters<SetEmotionRequest>,
    ) -> String {
        let duration = req.duration_ms.unwrap_or(5000);
        // The tool result is returned to Claude; Tauri parses tool_use from stream
        // and emits the event to the frontend
        format!(
            "Emotion set to '{}' for {}ms. The mascot is now expressing this emotion.",
            req.emotion, duration
        )
    }

    /// Move the mascot to a position on screen.
    /// Use this to make Clawd walk to different parts of the screen.
    #[tool(
        description = "Move the mascot to a screen position. Target can be: 'left', 'right', 'center', or a specific x-coordinate"
    )]
    async fn move_to(&self, Parameters(req): Parameters<MoveToRequest>) -> String {
        format!(
            "Moving mascot to: {}. The mascot is now walking to this position.",
            req.target
        )
    }

    /// Capture a screenshot of the user's screen.
    /// Use this when you need to see what the user is looking at.
    #[tool(description = "Capture a screenshot of the user's screen to see what they're looking at")]
    async fn capture_screenshot(
        &self,
        Parameters(req): Parameters<CaptureScreenshotRequest>,
    ) -> String {
        let desc = req
            .description
            .unwrap_or_else(|| "general view".to_string());
        // In the actual implementation, Tauri will handle the screenshot capture
        // when it sees this tool_use in the stream
        format!(
            "Screenshot captured (looking for: {}). Analyzing the screen contents...",
            desc
        )
    }
}

#[tool_handler]
impl ServerHandler for MascotService {
    fn get_info(&self) -> ServerInfo {
        ServerInfo {
            capabilities: ServerCapabilities::builder().enable_tools().build(),
            ..Default::default()
        }
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    // Serve via stdio (Claude CLI spawns this process)
    let transport = (tokio::io::stdin(), tokio::io::stdout());
    let service = MascotService::new().serve(transport).await?;
    service.waiting().await?;
    Ok(())
}
