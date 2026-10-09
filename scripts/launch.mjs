import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
if (existsSync(path.join(root, ".env")))
  process.loadEnvFile(path.join(root, ".env"));
const port = Number(process.env.PORT || 3210);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("PORT must be between 1024 and 65535.");
const url = `http://127.0.0.1:${port}`;
const noBrowser = process.argv.includes("--no-browser");
const openBrowser = () => {
  if (noBrowser) return;
  const child = spawn("explorer.exe", [url], {
    windowsHide: true,
    detached: true,
    stdio: "ignore",
  });
  child.on("error", () => console.log(`Open this URL in your browser: ${url}`));
  child.unref();
};
try {
  const response = await fetch(url + "/api/health", {
    signal: AbortSignal.timeout(1500),
  });
  const health = await response.json();
  if (health.name === "maidazi") {
    console.log(`MaiDazi is already running: ${url}`);
    openBrowser();
    process.exit(0);
  }
  console.error(`Port ${port} is used by another application.`);
  process.exit(1);
} catch {}
function npm(args) {
  const result = spawnSync("cmd.exe", ["/d", "/s", "/c", `npm.cmd ${args}`], {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
if (!existsSync(path.join(root, "node_modules"))) npm("ci");
npm("run build");
const server = spawn(process.execPath, [path.join(root, "server/index.js")], {
  cwd: root,
  stdio: "inherit",
  windowsHide: true,
});
server.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
server.on("exit", (code) => process.exit(code || 0));
process.on("SIGINT", () => {
  server.kill();
  process.exit(0);
});
for (let attempt = 0; attempt < 40; attempt++) {
  await new Promise((resolve) => setTimeout(resolve, 250));
  try {
    const response = await fetch(url + "/api/health", {
      signal: AbortSignal.timeout(1000),
    });
    if ((await response.json()).name === "maidazi") {
      openBrowser();
      break;
    }
  } catch {}
}
