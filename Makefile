.PHONY: test test-ts test-rust test-mcp dev build lint clean codegen-tauri bundle-mcp

# Run all tests
test: test-ts test-rust test-mcp

# Run TypeScript tests
test-ts:
	npm run test

# Run Rust tests (Tauri backend)
test-rust:
	cd src-tauri && cargo test

# Run Rust tests (MCP server)
test-mcp:
	cd mascot-mcp && cargo test

# Development mode
dev:
	npm run dev

# Build mascot-mcp binary
bundle-mcp:
	cd mascot-mcp && cargo build --release

# Build production
build: bundle-mcp
	npm run build

# Run linter
lint:
	npm run lint

# Type check
check: check-ts check-rust check-mcp

check-ts:
	npm run vite:build

check-rust:
	cd src-tauri && cargo check

check-mcp:
	cd mascot-mcp && cargo check

# Clean build artifacts
clean:
	rm -rf dist
	rm -rf artifacts
	cd src-tauri && cargo clean
	cd mascot-mcp && cargo clean

# Generate TypeScript bindings from Rust commands
codegen-tauri:
	cd src-tauri && cargo run --bin codegen
