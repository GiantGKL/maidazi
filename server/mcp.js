import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import Ajv from "ajv";

export const READ_TOOLS = new Set([
  "query-nearby-stores",
  "query-store-coupons",
  "query-meals",
  "query-meal-detail",
  "calculate-price",
  "now-time-info",
]);
const ajv = new Ajv({ strict: false, allErrors: true });

export async function connectMcd(token) {
  if (!token) throw new Error("尚未配置麦当劳 MCP Token。");
  const client = new Client({ name: "maidazi", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(
    new URL("https://mcp.mcd.cn"),
    {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    },
  );
  try {
    await client.connect(transport, { timeout: 20000 });
    const tools = [];
    let cursor;
    let page = 0;
    do {
      const result = await client.listTools(cursor ? { cursor } : {}, {
        timeout: 20000,
      });
      tools.push(...result.tools.filter((tool) => READ_TOOLS.has(tool.name)));
      cursor = result.nextCursor;
      if (++page > 20) throw new Error("工具列表分页超出限制。");
    } while (cursor);
    return {
      tools,
      call: (name, args) =>
        client.callTool({ name, arguments: args }, undefined, {
          timeout: 30000,
        }),
      close: () => client.close(),
    };
  } catch (error) {
    await client.close().catch(() => {});
    throw error;
  }
}
export function validateToolCall(tools, name, args) {
  if (!READ_TOOLS.has(name))
    throw new Error("本版本仅支持查询与核价，禁止下单、领券和积分操作。");
  const tool = tools.find((t) => t.name === name);
  if (!tool) throw new Error(`服务未提供工具 ${name}。`);
  const validate = ajv.compile(tool.inputSchema);
  if (!validate(args))
    throw new Error(
      `参数不符合当前官方工具格式：${ajv.errorsText(validate.errors)}`,
    );
}
export function normalizeResult(result) {
  if (result.structuredContent) return result.structuredContent;
  const text = (result.content || [])
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}
