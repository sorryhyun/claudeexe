use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

/// Persistent session ID for conversation continuity
static SESSION_ID: Mutex<Option<String>> = Mutex::new(None);

/// Send a message to Claude CLI and stream the response
#[tauri::command]
async fn send_claude_message(
    app: tauri::AppHandle,
    message: String,
) -> Result<String, String> {
    println!("[Rust] send_claude_message called with: {}", message);

    let session_id = SESSION_ID.lock().unwrap().clone();
    println!("[Rust] Current session_id: {:?}", session_id);

    // Build claude command with appropriate flags
    // Using: claude -p "message" --output-format stream-json --verbose
    let mut cmd = Command::new("claude");
    cmd.arg("-p") // Print mode (non-interactive)
        .arg(&message)
        .arg("--output-format")
        .arg("stream-json")
        .arg("--verbose"); // Required for stream-json with --print

    // Resume session if we have one
    if let Some(ref sid) = session_id {
        cmd.arg("--resume").arg(sid);
    }

    println!("[Rust] Command: claude -p \"{}\" --output-format stream-json --verbose", message);

    // Set up stdio
    cmd.stdout(Stdio::piped())
        .stderr(Stdio::piped());

    println!("[Rust] Spawning claude CLI...");
    // Spawn the process
    let mut child = cmd.spawn().map_err(|e| {
        let err_msg = format!("Failed to spawn claude: {}. Make sure Claude Code is installed and in PATH.", e);
        println!("[Rust] {}", err_msg);
        err_msg
    })?;

    println!("[Rust] Claude CLI spawned successfully");

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take();
    let reader = BufReader::new(stdout);

    // Spawn a thread to read stderr
    if let Some(stderr) = stderr {
        std::thread::spawn(move || {
            let stderr_reader = BufReader::new(stderr);
            for line in stderr_reader.lines() {
                if let Ok(line) = line {
                    println!("[Rust] STDERR: {}", line);
                }
            }
        });
    }

    let mut full_response = String::new();
    let mut captured_session_id: Option<String> = None;
    let mut line_count = 0;

    println!("[Rust] Starting to read stdout lines...");

    // Read and emit each line
    for line in reader.lines() {
        line_count += 1;
        match line {
            Ok(line_content) => {
                println!("[Rust] Line {}: {} chars", line_count, line_content.len());
                if line_content.trim().is_empty() {
                    continue;
                }

                // Try to parse as JSON to extract useful info
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line_content) {
                    println!("[Rust] Parsed JSON type: {:?}", json.get("type"));
                    // Capture session ID from init message
                    if json.get("type").and_then(|t| t.as_str()) == Some("system") {
                        if let Some(sid) = json.get("session_id").and_then(|s| s.as_str()) {
                            captured_session_id = Some(sid.to_string());
                        }
                    }

                    // Extract text content from assistant messages
                    if json.get("type").and_then(|t| t.as_str()) == Some("assistant") {
                        if let Some(content) = json.get("message").and_then(|m| m.get("content")) {
                            if let Some(arr) = content.as_array() {
                                for block in arr {
                                    if block.get("type").and_then(|t| t.as_str()) == Some("text") {
                                        if let Some(text) = block.get("text").and_then(|t| t.as_str()) {
                                            full_response = text.to_string();
                                            // Emit partial update
                                            let _ = app.emit("claude-stream", text);
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Handle result message
                    if json.get("type").and_then(|t| t.as_str()) == Some("result") {
                        if let Some(result) = json.get("result").and_then(|r| r.as_str()) {
                            full_response = result.to_string();
                        }

                        // Emit tool usage info
                        if let Some(subtype) = json.get("subtype").and_then(|s| s.as_str()) {
                            let _ = app.emit("claude-result", serde_json::json!({
                                "subtype": subtype,
                                "result": &full_response
                            }));
                        }
                    }
                }

                // Emit raw line for debugging/advanced use
                let _ = app.emit("claude-raw", &line_content);
            }
            Err(e) => {
                let _ = app.emit("claude-error", format!("Read error: {}", e));
            }
        }
    }

    println!("[Rust] Finished reading lines. Total: {}", line_count);

    // Wait for process to complete
    println!("[Rust] Waiting for process to complete...");
    let status = child.wait().map_err(|e| format!("Process wait failed: {}", e))?;
    println!("[Rust] Process exited with status: {}", status);

    // Store session ID for future messages
    if let Some(sid) = captured_session_id {
        println!("[Rust] Storing session ID: {}", sid);
        *SESSION_ID.lock().unwrap() = Some(sid);
    }

    if status.success() {
        println!("[Rust] Returning response: {} chars", full_response.len());
        Ok(full_response)
    } else {
        let err = format!("Claude exited with status: {}", status);
        println!("[Rust] {}", err);
        Err(err)
    }
}

/// Clear the current session
#[tauri::command]
fn clear_claude_session() {
    *SESSION_ID.lock().unwrap() = None;
}

/// Get current session ID
#[tauri::command]
fn get_session_id() -> Option<String> {
    SESSION_ID.lock().unwrap().clone()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            send_claude_message,
            clear_claude_session,
            get_session_id
        ])
        .setup(|app| {
            // Create tray menu
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let hide = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &hide, &quit])?;

            // Create tray icon
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
