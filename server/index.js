import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import express from "express";
import { makeApp } from "./app.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = makeApp({
  token: process.env.MCD_MCP_TOKEN,
  baseUrl: process.env.LLM_BASE_URL,
  apiKey: process.env.LLM_API_KEY,
  model: process.env.LLM_MODEL,
});
const isDev = process.argv.includes("--dev");
if (isDev) {
  const { createServer } = await import("vite");
  const vite = await createServer({
    root,
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  if (!fs.existsSync(path.join(root, "dist/index.html"))) {
    console.error("请先执行 npm run build。");
    process.exit(1);
  }
  app.use(express.static(path.join(root, "dist")));
  app.get("/{*path}", (req, res) =>
    res.sendFile(path.join(root, "dist/index.html")),
  );
}
const port = Number(process.env.PORT || 3210);
const server = app.listen(port, "127.0.0.1", () => {
  fs.mkdirSync(path.join(root, "work"), { recursive: true });
  fs.writeFileSync(path.join(root, "work/server.pid"), String(process.pid));
  console.log(
    `\n  麦搭子已启动 → http://127.0.0.1:${port}\n  模式：${isDev ? "开发" : "本地应用"} · 关闭此进程可停止服务\n`,
  );
});
server.on("error", (error) => {
  console.error(
    error.code === "EADDRINUSE"
      ? `端口 ${port} 已占用。请检查已有麦搭子窗口，或修改 .env 中的 PORT。`
      : error.message,
  );
  process.exit(1);
});
