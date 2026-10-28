import "dotenv/config";
import { fork } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure port defaults to 3001 so it never conflicts with port 3000 (store-analytics)
process.env.PORT = process.env.PORT || "3001";
process.env.NODE_ENV = process.env.NODE_ENV || "production";

const serveBin = path.resolve(__dirname, "node_modules/@react-router/serve/bin.js");
const buildPath = path.resolve(__dirname, "build/server/index.js");

console.log(`[PartFinder] Starting production server on port ${process.env.PORT}...`);

const child = fork(serveBin, [buildPath], {
  env: process.env,
  stdio: "inherit",
});

const shutdown = (signal) => {
  if (child.pid) {
    child.kill(signal);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

child.on("exit", (code, signal) => {
  if (code !== null) process.exit(code);
  if (signal) process.kill(process.pid, signal);
});
