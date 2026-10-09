import test from "node:test";
import assert from "node:assert/strict";
import { makeApp } from "../server/app.js";

async function withServer(run, initial = {}, deps = {}) {
  const app = makeApp(initial, deps);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, more = {}) =>
    fetch(base + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Maidazi-Client": "local-app",
        ...more,
      },
      body: JSON.stringify(body),
    });
  try {
    await run({ base, post });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}
test("health reveals presence of credentials, never their contents", async () => {
  await withServer(
    async ({ base }) => {
      const response = await fetch(base + "/api/health");
      const body = await response.text();
      assert.equal(response.status, 200);
      assert.ok(!body.includes("test-secret"));
      assert.equal(JSON.parse(body).configured.mcp, true);
      assert.equal(response.headers.get("cache-control"), "no-store");
    },
    { token: "test-secret" },
  );
});
test("cross-site writes and missing client headers are rejected", async () => {
  await withServer(async ({ base, post }) => {
    assert.equal(
      (await post("/api/config", {}, { Origin: "https://evil.example" }))
        .status,
      403,
    );
    assert.equal(
      (
        await fetch(base + "/api/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        })
      ).status,
      403,
    );
  });
});
test("missing credentials fail explicitly instead of falling back to demo data", async () => {
  await withServer(async ({ post }) => {
    const r = await post("/api/live/quote", { request: "四个人吃饭，上海" });
    assert.equal(r.status, 400);
    assert.match((await r.json()).error, /配置/);
  });
});
test("model API URL requires a secure endpoint or explicit localhost", async () => {
  await withServer(async ({ post }) => {
    for (const url of [
      "http://example.com/v1",
      "file:///etc/passwd",
      "https://user:password@example.com/v1",
      "https://example.com/v1?key=secret",
    ]) {
      assert.equal((await post("/api/config", { baseUrl: url })).status, 400);
    }
    assert.equal(
      (await post("/api/config", { baseUrl: "http://127.0.0.1:8080/v1" }))
        .status,
      200,
    );
  });
});
test("connection errors redact credentials", async () => {
  await withServer(
    async ({ post }) => {
      const response = await post("/api/mcp/check", {});
      const text = await response.text();
      assert.equal(response.status, 502);
      assert.ok(!text.includes("test-secret"));
    },
    { token: "test-secret" },
    {
      connect: async () => {
        throw new Error("bad Bearer test-secret");
      },
    },
  );
});
test("successful live request closes the connection and retains evidence", async () => {
  let closed = false;
  await withServer(
    async ({ post }) => {
      const response = await post("/api/live/quote", {
        request: "请查询上海门店菜单",
      });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).status, "needs_input");
    },
    {
      token: "test",
      apiKey: "test",
      baseUrl: "https://example.com/v1",
      model: "test",
    },
    {
      connect: async () => ({
        tools: [],
        close: async () => {
          closed = true;
        },
      }),
      agent: async () => ({ status: "needs_input", message: "请选择门店。" }),
    },
  );
  assert.equal(closed, true);
});
