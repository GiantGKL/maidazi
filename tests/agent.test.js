import test from "node:test";
import assert from "node:assert/strict";
import { runQuoteAgent } from "../server/agent.js";
import { normalizeResult, validateToolCall } from "../server/mcp.js";

const tools = [
  {
    name: "calculate-price",
    inputSchema: {
      type: "object",
      properties: { storeId: { type: "string" } },
      required: ["storeId"],
      additionalProperties: false,
    },
  },
];
const toolMessage = (
  name = "calculate-price",
  args = { storeId: "from-test-fixture" },
) => ({
  role: "assistant",
  tool_calls: [
    {
      id: "t1",
      type: "function",
      function: { name, arguments: JSON.stringify(args) },
    },
  ],
});
const final = (id = "call-1") => ({
  content: JSON.stringify({
    status: "quoted",
    message: "已返回计价数据",
    quoteCallId: id,
  }),
});
function sequence(messages) {
  let i = 0;
  return async () => messages[i++];
}

test("unknown schemas are discovered and enforced, not guessed", () => {
  assert.throws(() => validateToolCall(tools, "calculate-price", {}), /参数/);
  assert.throws(
    () => validateToolCall(tools, "calculate-price", { storeId: 12 }),
    /参数/,
  );
  assert.doesNotThrow(() =>
    validateToolCall(tools, "calculate-price", { storeId: "s1" }),
  );
});
test("write tools are denied even if advertised by the server", () => {
  for (const name of [
    "create-order",
    "auto-bind-coupons",
    "mall-create-order",
    "cancel-order",
    "draw-lottery",
  ]) {
    assert.throws(
      () =>
        validateToolCall([{ name, inputSchema: { type: "object" } }], name, {}),
      /禁止/,
    );
  }
});
test("assistant cannot fabricate a quote without a real call", async () => {
  await assert.rejects(
    runQuoteAgent({
      connection: { tools },
      config: {},
      request: "test",
      complete: sequence([final()]),
    }),
    /凭据/,
  );
});
test("successful quote includes exact original evidence and parameters", async () => {
  const official = {
    success: true,
    data: { total: 1234, currency: "CNY", unit: "fen" },
  };
  const result = await runQuoteAgent({
    connection: { tools, call: async () => ({ structuredContent: official }) },
    config: {},
    request: "test",
    complete: sequence([toolMessage(), final()]),
  });
  assert.deepEqual(result.quote.data, official);
  assert.deepEqual(result.quote.arguments, { storeId: "from-test-fixture" });
  assert.equal(result.trace.length, 1);
});
test("failed transport or business responses cannot become successful quotes", async () => {
  for (const reply of [
    { isError: true, content: [] },
    { structuredContent: { success: false, message: "coupon invalid" } },
  ]) {
    await assert.rejects(
      runQuoteAgent({
        connection: { tools, call: async () => reply },
        config: {},
        request: "test",
        complete: sequence([toolMessage(), final()]),
      }),
      /凭据/,
    );
  }
});
test("agent cannot invoke a write tool through model output", async () => {
  let called = false;
  await assert.rejects(
    runQuoteAgent({
      connection: {
        tools,
        call: async () => {
          called = true;
        },
      },
      config: {},
      request: "test",
      complete: sequence([toolMessage("create-order")]),
    }),
    /禁止/,
  );
  assert.equal(called, false);
});
test("model asks for missing data rather than producing an order", async () => {
  const result = await runQuoteAgent({
    connection: { tools },
    config: {},
    request: "test",
    complete: sequence([
      {
        content: JSON.stringify({
          status: "needs_input",
          message: "请选择门店。",
        }),
      },
    ]),
  });
  assert.equal(result.quote, null);
  assert.equal(result.status, "needs_input");
});
test("JSON tool content is parsed, free text is kept as data", () => {
  assert.deepEqual(
    normalizeResult({ content: [{ type: "text", text: '{"total":100}' }] }),
    { total: 100 },
  );
  assert.deepEqual(
    normalizeResult({ content: [{ type: "text", text: "raw text" }] }),
    { text: "raw text" },
  );
});
