#!/usr/bin/env node
/**
 * Create dev executable by copying the main exe
 *
 * After Tauri build, this copies claude-mascot.exe to claude_mascot_dev.exe
 * The Rust code detects "_dev" or "-dev" in the exe name to enable dev mode
 */

import { copyFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

// Find the built exe in target/release or target/debug
const releaseDir = join(rootDir, "src-tauri/target/release");
const debugDir = join(rootDir, "src-tauri/target/debug");

function findAndCopyExe(dir) {
  if (!existsSync(dir)) return false;

  const files = readdirSync(dir);
  const exeFile = files.find(f => f.endsWith(".exe") && !f.includes("_dev") && f.includes("mascot"));

  if (exeFile) {
    const srcPath = join(dir, exeFile);
    const baseName = exeFile.replace(".exe", "");
    const devName = baseName.replace(/-/g, "_") + "_dev.exe";
    const destPath = join(dir, devName);

    console.log(`Copying ${exeFile} -> ${devName}`);
    copyFileSync(srcPath, destPath);
    console.log(`Created: ${destPath}`);
    return true;
  }
  return false;
}

// Also copy in the bundle directory if it exists
function copyInBundle() {
  const bundleDirs = [
    join(rootDir, "src-tauri/target/release/bundle/nsis"),
    join(rootDir, "src-tauri/target/release/bundle/msi"),
  ];

  for (const dir of bundleDirs) {
    if (existsSync(dir)) {
      findAndCopyExe(dir);
    }
  }
}

console.log("Creating dev executable...");

if (findAndCopyExe(releaseDir)) {
  console.log("Dev exe created in release directory");
  copyInBundle();
} else if (findAndCopyExe(debugDir)) {
  console.log("Dev exe created in debug directory");
} else {
  console.log("No exe found to copy. Run 'npm run build' first.");
}
