#!/usr/bin/env node
/**
 * Bundle the sidecar into a single JavaScript file
 *
 * Uses esbuild to bundle all JS into a single CommonJS file that can be
 * run with Node.js. No longer compiles to standalone exe to avoid
 * Windows Defender false positives.
 */

import { build } from "esbuild";
import { copyFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

async function bundle() {
  console.log("Bundling sidecar...");

  const outDir = join(rootDir, "sidecar-dist");
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  // Bundle with esbuild to a single CommonJS file
  console.log("Bundling with esbuild...");
  await build({
    entryPoints: [join(rootDir, "sidecar/agent-sidecar.mjs")],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    outfile: join(outDir, "agent-sidecar.cjs"),
    external: [],
    minify: false, // Keep readable for debugging
    sourcemap: false,
  });
  console.log("  Created: sidecar-dist/agent-sidecar.cjs");

  // Copy prompt files alongside the bundle
  copyFileSync(
    join(rootDir, "sidecar/prompt.txt"),
    join(outDir, "prompt.txt")
  );
  console.log("  Copied: prompt.txt");

  // Copy dev prompt if it exists
  const devPromptPath = join(rootDir, "sidecar/dev-prompt.txt");
  if (existsSync(devPromptPath)) {
    copyFileSync(devPromptPath, join(outDir, "dev-prompt.txt"));
    console.log("  Copied: dev-prompt.txt");
  }

  // Copy supiki prompt if it exists
  const supikiPromptPath = join(rootDir, "sidecar/supiki_prompt.txt");
  if (existsSync(supikiPromptPath)) {
    copyFileSync(supikiPromptPath, join(outDir, "supiki_prompt.txt"));
    console.log("  Copied: supiki_prompt.txt");
  }

  console.log("\nSidecar bundled successfully!");
  console.log(`  Output: ${join(outDir, "agent-sidecar.cjs")}`);
  console.log("\nNote: Node.js v18+ is required on the target machine.");
  console.log("\nTo use in production build:");
  console.log("  1. Run: npm run build");
  console.log("  2. Tauri will bundle sidecar-dist/*.cjs and *.txt as resources");
}

bundle().catch((err) => {
  console.error("Bundle failed:", err);
  process.exit(1);
});
