import { spawn } from "node:child_process";
import path from "node:path";

const processes = [];
let shuttingDown = false;
const rootDir = process.cwd();
const serverEntry = path.resolve(rootDir, "server/knowledge-api.mjs");
const npmExecPath = process.env.npm_execpath;

function killChildren(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of processes) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => process.exit(exitCode), 120);
}

function spawnProcess(command, args, label) {
  const child = spawn(command, args, {
    stdio: "inherit",
    env: process.env,
    cwd: rootDir,
  });

  child.on("exit", (code) => {
    if (!shuttingDown && code !== null && code !== 0) {
      console.error(`[${label}] exited with code ${code}`);
      killChildren(code);
    }
  });

  processes.push(child);
}

spawnProcess(process.execPath, [serverEntry], "knowledge-api");

if (npmExecPath) {
  spawnProcess(process.execPath, [npmExecPath, "run", "dev:vite"], "vite");
} else {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  spawnProcess(npmCommand, ["run", "dev:vite"], "vite");
}

process.on("SIGINT", () => killChildren(0));
process.on("SIGTERM", () => killChildren(0));
