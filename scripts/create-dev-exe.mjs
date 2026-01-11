#!/usr/bin/env node
/**
 * Create dev and supiki executables by copying the main exe
 *
 * After Tauri build, this copies claude-mascot.exe to:
 * - claude_mascot_dev.exe (dev mode detection via exe name)
 * - claude-mascot-supiki.exe (supiki variant)
 *
 * All artifacts are collected in the artifacts/ directory.
 */

import { copyFileSync, existsSync, readdirSync, mkdirSync, statSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const artifactsDir = join(rootDir, "artifacts");

// Find the built exe in target/release or target/debug
const releaseDir = join(rootDir, "src-tauri/target/release");
const debugDir = join(rootDir, "src-tauri/target/debug");
const mcpReleaseDir = join(rootDir, "mascot-mcp/target/release");

// Ensure artifacts directory exists
function ensureArtifactsDir() {
  if (!existsSync(artifactsDir)) {
    mkdirSync(artifactsDir, { recursive: true });
    console.log(`Created: ${artifactsDir}`);
  }
}

function findAndCopyExe(dir) {
  if (!existsSync(dir)) return false;

  const files = readdirSync(dir);
  const exeFile = files.find(f => f.endsWith(".exe") && !f.includes("_dev") && !f.includes("-supiki") && f.includes("mascot"));

  if (exeFile) {
    const srcPath = join(dir, exeFile);
    const baseName = exeFile.replace(".exe", "");

    // Copy main exe to artifacts
    const mainDest = join(artifactsDir, exeFile);
    console.log(`Copying ${exeFile} -> artifacts/`);
    copyFileSync(srcPath, mainDest);
    console.log(`Created: ${mainDest}`);

    // Create dev exe in artifacts
    const devName = baseName.replace(/-/g, "_") + "_dev.exe";
    const devPath = join(artifactsDir, devName);
    console.log(`Copying ${exeFile} -> ${devName}`);
    copyFileSync(srcPath, devPath);
    console.log(`Created: ${devPath}`);

    // Create supiki exe in artifacts
    const supikiName = baseName + "-supiki.exe";
    const supikiPath = join(artifactsDir, supikiName);
    console.log(`Copying ${exeFile} -> ${supikiName}`);
    copyFileSync(srcPath, supikiPath);
    console.log(`Created: ${supikiPath}`);

    return true;
  }
  return false;
}

// Copy mascot-mcp.exe to artifacts
function copyMcpExe() {
  const mcpExe = join(mcpReleaseDir, "mascot-mcp.exe");
  if (existsSync(mcpExe)) {
    const destPath = join(artifactsDir, "mascot-mcp.exe");
    copyFileSync(mcpExe, destPath);
    console.log(`Copied: mascot-mcp.exe -> artifacts/`);
    return true;
  }
  console.log("mascot-mcp.exe not found in release directory");
  return false;
}

// Copy installer files from bundle directory
function copyInstallers() {
  const bundleDirs = [
    { dir: join(rootDir, "src-tauri/target/release/bundle/nsis"), ext: ".exe" },
    { dir: join(rootDir, "src-tauri/target/release/bundle/msi"), ext: ".msi" },
  ];

  for (const { dir, ext } of bundleDirs) {
    if (existsSync(dir)) {
      const files = readdirSync(dir);
      for (const file of files) {
        if (file.endsWith(ext)) {
          const srcPath = join(dir, file);
          // Only copy files, not directories
          if (statSync(srcPath).isFile()) {
            const destPath = join(artifactsDir, file);
            copyFileSync(srcPath, destPath);
            console.log(`Copied installer: ${file} -> artifacts/`);
          }
        }
      }
    }
  }
}

// Print summary
function printSummary() {
  console.log("\n=== Build Artifacts ===");
  if (existsSync(artifactsDir)) {
    const files = readdirSync(artifactsDir);
    for (const file of files) {
      const filePath = join(artifactsDir, file);
      const stats = statSync(filePath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`  ${file} (${sizeMB} MB)`);
    }
  }
  console.log(`\nAll artifacts are in: ${artifactsDir}`);
}

console.log("Creating build artifacts...\n");
ensureArtifactsDir();

if (findAndCopyExe(releaseDir)) {
  console.log("\nExecutables created from release build");
  copyMcpExe();
  copyInstallers();
  printSummary();
} else if (findAndCopyExe(debugDir)) {
  console.log("\nExecutables created from debug build");
  copyMcpExe();
  printSummary();
} else {
  console.log("No exe found to copy. Run 'npm run build' first.");
}
