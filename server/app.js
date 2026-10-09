import express from "express";
import { z } from "zod";
import { connectMcd } from "./mcp.js";
import { runQuoteAgent } from "./agent.js";

const ConfigSchema = z.object({
  token: z.string().max(4096).optional(),
  baseUrl: z.string().max(500).optional(),
  apiKey: z.string().max(4096).optional(),
  model: z.string().max(200).optional(),
});
export function makeApp(
  initial = {},
  { connect = connectMcd, agent = runQuoteAgent } = {},
) {
  const app = express();
  const config = { ...initial };
  let busy = false;
  const configured = () => ({
    mcp: Boolean(config.token),
    model: Boolean(config.baseUrl && config.apiKey && config.model),
  });
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    const host = req.headers.host || "";
    if (!/^(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(host))
      return res.status(403).json({ error: "仅允许本机访问。" });
    const origin = req.headers.origin;
    if (origin && origin !== `http://${host}`)
      return res.status(403).json({ error: "不允许跨站请求。" });
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    if (req.path.startsWith("/api/")) {
      res.setHeader("Cache-Control", "no-store");
      if (
        req.method !== "GET" &&
        (req.headers["x-maidazi-client"] !== "local-app" ||
          !req.is("application/json"))
      )
        return res.status(403).json({ error: "请求来源无效。" });
    }
    next();
  });
  app.use(express.json({ limit: "40kb" }));
  app.get("/api/health", (req, res) =>
    res.json({
      ok: true,
      name: "maidazi",
      version: "0.1.0",
      configured: configured(),
    }),
  );
  app.post("/api/config", (req, res) => {
    if (busy)
      return res.status(409).json({ error: "请等当前查询结束后再更改配置。" });
    const parsed = ConfigSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "配置格式不正确。" });
    const update = parsed.data;
    if (update.baseUrl) {
      try {
        const url = new URL(update.baseUrl);
        if (
          url.username ||
          url.password ||
          url.search ||
          url.hash ||
          !(
            url.protocol === "https:" ||
            (url.protocol === "http:" &&
              ["127.0.0.1", "localhost"].includes(url.hostname))
          )
        )
          throw new Error();
      } catch {
        return res
          .status(400)
          .json({
            error:
              "模型接口须为 HTTPS 地址，或本机 HTTP 地址；请勿包含密钥参数。",
          });
      }
    }
    for (const [key, value] of Object.entries(update))
      if (value?.trim()) config[key] = value.trim();
    res.json({ configured: configured() });
  });
  app.post("/api/config/clear", (req, res) => {
    if (busy)
      return res.status(409).json({ error: "请等当前查询结束后再清除配置。" });
    for (const key of Object.keys(config)) delete config[key];
    res.json({ configured: configured() });
  });
  app.post("/api/mcp/check", async (req, res) => {
    let connection;
    try {
      connection = await connect(config.token);
      res.json({
        ok: true,
        tools: connection.tools.map((t) => ({
          name: t.name,
          description: t.description,
        })),
      });
    } catch (error) {
      res.status(502).json({ error: safeError(error, config) });
    } finally {
      await connection?.close().catch(() => {});
    }
  });
  app.post("/api/live/quote", async (req, res) => {
    const parsed = z
      .object({ request: z.string().trim().min(4).max(10000) })
      .safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "请输入地点和点餐需求（最多 10000 字）。" });
    if (!configured().mcp || !configured().model)
      return res
        .status(400)
        .json({ error: "先配置麦当劳 Token 和支持工具调用的模型接口。" });
    if (busy)
      return res.status(409).json({ error: "已有核价正在进行，请稍后再试。" });
    busy = true;
    let connection;
    try {
      const snapshot = { ...config };
      connection = await connect(snapshot.token);
      const result = await agent({
        connection,
        config: snapshot,
        request: parsed.data.request,
      });
      res.json(result);
    } catch (error) {
      res.status(502).json({ error: safeError(error, config) });
    } finally {
      busy = false;
      await connection?.close().catch(() => {});
    }
  });
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "接口不存在。" }),
  );
  app.use((error, req, res, next) => {
    res.status(400).json({ error: "请求无法解析，请检查输入。" });
  });
  return app;
}
function safeError(error, config) {
  let message = error?.message || "连接失败，请检查配置后重试。";
  for (const secret of [config.token, config.apiKey])
    if (secret) message = message.split(secret).join("[已隐藏]");
  message = message.replace(/Bearer\s+\S+/gi, "Bearer [已隐藏]");
  return message.slice(0, 500);
}
