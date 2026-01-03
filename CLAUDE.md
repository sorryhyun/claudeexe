# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Mascot is a desktop mascot application featuring "Clawd" - an animated character that lives on the user's desktop. Built with Tauri v2 (Rust backend) + React + TypeScript (frontend).

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Run in development mode (Tauri + Vite)
npm run build        # Build for production
npm run vite:build   # Build frontend only (TypeScript + Vite)
npm run icons        # Regenerate icons from source image
```

For Rust backend development:
```bash
cd src-tauri && cargo build    # Build Rust backend
cd src-tauri && cargo check    # Type-check Rust code
```

## Architecture

### Frontend (React/TypeScript)

- `src/App.tsx` - Main application component orchestrating physics, mascot state, and user interactions (drag, click, double-click)
- `src/Clawd.tsx` - SVG-based mascot component with CSS animations for different states
- `src/useMascotState.ts` - State machine managing mascot states: idle, walking, talking, jumping, falling
- `src/usePhysics.ts` - Physics engine handling gravity, collisions, walking, and window positioning via Tauri APIs
- `src/styles.css` - CSS animations for mascot states (idle bobbing, walking, jumping, falling, talking)

### Backend (Rust/Tauri)

- `src-tauri/src/lib.rs` - Tauri app setup with system tray (show/hide/quit menu items) and window management
- `src-tauri/src/main.rs` - Entry point
- `src-tauri/tauri.conf.json` - Tauri configuration (transparent window, always-on-top, no decorations, 160x140 size)

### Key Behaviors

- **Physics**: Window moves via Tauri's `setPosition` API with gravity, floor/wall collisions, and bounce effects
- **Auto-walk**: Randomly triggers walking behavior every 3-10 seconds
- **Interactions**: Single-click triggers jump/talk/walk; double-click toggles physics; drag repositions window
- **Direction**: Mascot faces left/right by CSS `scaleX(-1)` transform
