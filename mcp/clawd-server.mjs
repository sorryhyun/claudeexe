#!/usr/bin/env node
/**
 * Clawd MCP Server - Desktop Awareness Tools
 *
 * MCP (Model Context Protocol) server providing desktop awareness tools:
 * - get_current_time: Get current date/time information
 * - get_active_window: Get information about the currently focused window
 * - get_system_info: Get basic system information
 * - check_notifications: Check for system notifications
 *
 * Note: Emotion control is handled by emotion-server.mjs
 */

import { createInterface } from "readline";
import { mkdirSync } from "fs";
import { join } from "path";
import { tmpdir, hostname, platform, userInfo } from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Temp directory for clawd data
const CLAWD_DIR = join(tmpdir(), "clawd-emotion");

// Ensure directory exists
try {
  mkdirSync(CLAWD_DIR, { recursive: true });
} catch (e) {
  // Directory might already exist
}

/**
 * Get current date/time information
 */
function getCurrentTime() {
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  };

  return {
    iso: now.toISOString(),
    formatted: now.toLocaleString('en-US', options),
    date: now.toLocaleDateString('en-US'),
    time: now.toLocaleTimeString('en-US'),
    timestamp: now.getTime(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
    hour: now.getHours(),
    minute: now.getMinutes(),
  };
}

/**
 * Get active window information (Windows-specific)
 */
async function getActiveWindow() {
  if (platform() !== 'win32') {
    return { error: "Active window detection only supported on Windows" };
  }

  try {
    // PowerShell script to get active window info
    const psScript = `
      Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        using System.Text;
        public class Win32 {
          [DllImport("user32.dll")]
          public static extern IntPtr GetForegroundWindow();
          [DllImport("user32.dll")]
          public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
          [DllImport("user32.dll")]
          public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
        }
"@
      $hwnd = [Win32]::GetForegroundWindow()
      $sb = New-Object System.Text.StringBuilder 256
      [void][Win32]::GetWindowText($hwnd, $sb, 256)
      $processId = 0
      [void][Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId)
      $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
      @{
        title = $sb.ToString()
        processName = if ($process) { $process.ProcessName } else { "Unknown" }
        processId = $processId
      } | ConvertTo-Json
    `;

    const { stdout } = await execAsync(`powershell -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
      timeout: 5000
    });

    return JSON.parse(stdout.trim());
  } catch (e) {
    return {
      error: "Failed to get active window",
      details: e.message
    };
  }
}

/**
 * Get basic system information
 */
function getSystemInfo() {
  const user = userInfo();
  return {
    hostname: hostname(),
    platform: platform(),
    username: user.username,
    homeDir: user.homedir,
  };
}

/**
 * Check for system notifications
 * On Windows, attempts to get recent toast notifications
 */
async function checkNotifications() {
  if (platform() !== 'win32') {
    return { notifications: [], note: "Notification detection only supported on Windows" };
  }

  try {
    // Try to get recent notifications from Windows Action Center
    // This requires Windows 10+ and may have limited access
    const psScript = `
      try {
        $notifications = @()

        # Try to get notifications from BurntToast module if available
        if (Get-Module -ListAvailable -Name BurntToast) {
          # BurntToast doesn't provide reading notifications, just sending
        }

        # Check for any pending notifications in common locations
        $recentApps = Get-Process | Where-Object { $_.MainWindowTitle -match "notification|alert|reminder" } | Select-Object -First 5 ProcessName, MainWindowTitle

        foreach ($app in $recentApps) {
          $notifications += @{
            source = $app.ProcessName
            title = $app.MainWindowTitle
            time = (Get-Date).ToString("o")
          }
        }

        # Return as JSON
        @{
          notifications = $notifications
          checkedAt = (Get-Date).ToString("o")
        } | ConvertTo-Json -Depth 3
      } catch {
        @{ notifications = @(); error = $_.Exception.Message } | ConvertTo-Json
      }
    `;

    const { stdout } = await execAsync(`powershell -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
      timeout: 5000
    });

    const result = JSON.parse(stdout.trim());
    return result;
  } catch (e) {
    return {
      notifications: [],
      error: "Failed to check notifications",
      details: e.message,
      note: "System notification access is limited on Windows. Consider using external notification bridges."
    };
  }
}

/**
 * Handle JSON-RPC request
 */
async function handleRequest(request) {
  const { id, method, params } = request;

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "clawd-mcp-server",
            version: "2.0.0",
          },
        },
      };

    case "notifications/initialized":
      return null;

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: [
            {
              name: "get_current_time",
              description:
                "Get the current date and time. Use this when the user asks about the current time, date, day of the week, or when you need to be aware of the current moment.",
              inputSchema: {
                type: "object",
                properties: {},
                required: [],
              },
            },
            {
              name: "get_active_window",
              description:
                "Get information about the currently focused/active window on the user's desktop. Returns the window title and process name. Use this to understand what the user is currently working on.",
              inputSchema: {
                type: "object",
                properties: {},
                required: [],
              },
            },
            {
              name: "get_system_info",
              description:
                "Get basic system information including hostname, platform, and current user. Use this when you need to know about the user's system environment.",
              inputSchema: {
                type: "object",
                properties: {},
                required: [],
              },
            },
            {
              name: "check_notifications",
              description:
                "Check for system notifications and alerts. Use this to be aware of what's happening on the user's system. Note: Notification access is limited on Windows.",
              inputSchema: {
                type: "object",
                properties: {},
                required: [],
              },
            },
          ],
        },
      };

    case "tools/call":
      const { name, arguments: args } = params;

      if (name === "get_current_time") {
        const timeInfo = getCurrentTime();
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(timeInfo, null, 2),
              },
            ],
          },
        };
      }

      if (name === "get_active_window") {
        const windowInfo = await getActiveWindow();
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(windowInfo, null, 2),
              },
            ],
          },
        };
      }

      if (name === "get_system_info") {
        const sysInfo = getSystemInfo();
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(sysInfo, null, 2),
              },
            ],
          },
        };
      }

      if (name === "check_notifications") {
        const notifInfo = await checkNotifications();
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(notifInfo, null, 2),
              },
            ],
          },
        };
      }

      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Unknown tool: ${name}`,
        },
      };

    default:
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      };
  }
}

// Set up stdio communication
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", async (line) => {
  try {
    const request = JSON.parse(line);
    const response = await handleRequest(request);

    if (response) {
      process.stdout.write(JSON.stringify(response) + "\n");
    }
  } catch (e) {
    process.stderr.write(`Error parsing request: ${e.message}\n`);
  }
});

// Keep process alive
process.stdin.resume();

// Log startup to stderr
process.stderr.write("Clawd MCP Server v2.0.0 started\n");
