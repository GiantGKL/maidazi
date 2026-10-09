import test from "node:test";
import assert from "node:assert/strict";
import {
  SAMPLES,
  allocateCents,
  buildPlan,
  editMember,
  memberTotal,
  quoteDemo,
  readiness,
  receiptText,
  resolveAmbiguity,
  toggleLock,
  violations,
} from "../shared/planner.js";

test("later change to referenced meal is ambiguous, not silently propagated", () => {
  const plan = buildPlan(SAMPLES[0].text, 120);
  assert.equal(plan.members.length, 4);
  assert.equal(plan.members[0].items[0], "beef");
  assert.equal(plan.members[1].items[0], "chicken");
  assert.equal(plan.members[1].ambiguity.source, "小王");
  assert.ok(plan.members[1].items.includes("zero"));
  const resolved = resolveAmbiguity(plan, "p2", "after");
  assert.equal(resolved.members[1].items[0], "beef");
  assert.ok(resolved.members[1].items.includes("zero"));
  assert.equal(resolved.members[1].ambiguity, null);
});
test("future or absent reference stays unresolved", () => {
  const plan = buildPlan("甲：和乙一样。\n乙：牛肉汉堡。");
  assert.ok(plan.members[0].ambiguity);
  assert.equal(plan.members[0].ambiguity.before, null);
  assert.throws(() => resolveAmbiguity(plan, "p1", "before"));
});
test("locks prevent both direct editing and confirmation of ambiguity", () => {
  const plan = buildPlan(SAMPLES[0].text);
  assert.throws(() => toggleLock(plan, "p2"));
  const locked = toggleLock(plan, "p1");
  assert.throws(() => editMember(locked, "p1", ["fish"]));
  const edited = editMember(locked, "p3", ["chicken", "zero"]);
  assert.strictEqual(edited.members[0], locked.members[0]);
  assert.equal(edited.members[0].locked, true);
  assert.equal(plan.members[0].locked, false);
});
test("explicit unlock enables a local change, with other members untouched", () => {
  let plan = toggleLock(buildPlan("甲：牛肉汉堡。\n乙：鸡肉汉堡。"), "p1");
  plan = toggleLock(plan, "p1");
  const edited = editMember(plan, "p1", ["fish", "zero"]);
  assert.strictEqual(edited.members[1], plan.members[1]);
  assert.equal(edited.revision, plan.revision + 1);
  assert.equal(edited.members[0].locked, false);
});
test("diet preferences are enforced on manually selected foods", () => {
  const plan = buildPlan("甲：鸡肉汉堡，不吃辣，无糖，不要咖啡。");
  const edited = editMember(plan, "p1", ["spicy", "cola", "coffee"]);
  assert.deepEqual(violations(edited.members[0]), [
    "包含辣味餐品",
    "包含含糖饮品",
    "包含咖啡",
  ]);
  assert.throws(() => toggleLock(edited, "p1"));
});
test("negative ingredient requests are not interpreted as positive selections", () => {
  const p = buildPlan("甲：随便，不要牛肉，不要饮料。\n乙：随便，不吃鸡肉。");
  assert.deepEqual(p.members[0].items, ["chicken"]);
  assert.deepEqual(violations(p.members[1]), []);
  assert.equal(p.members[1].items[0], "beef");
});
test("personal budget is conservatively checked before discount", () => {
  const p = buildPlan("甲：牛肉汉堡，预算25元。");
  assert.equal(memberTotal(p.members[0]), 2700);
  assert.match(violations(p.members[0])[0], /2.00/);
  assert.throws(() => toggleLock(p, "p1"));
});
test("demo promotion is deterministic and recomputed after change", () => {
  const p = buildPlan(SAMPLES[0].text);
  const before = quoteDemo(p);
  assert.equal(before.subtotal, 11500);
  assert.equal(before.discount, 1000);
  assert.equal(before.total, 10500);
  const after = quoteDemo(editMember(p, "p1", ["chicken"]));
  assert.equal(after.subtotal, 9800);
  assert.equal(after.discount, 0);
  assert.equal(after.total, 9800);
  assert.notEqual(before.revision, after.revision);
});
test("proportional shares sum exactly, including awkward one-cent cases", () => {
  assert.deepEqual(allocateCents(100, [1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(allocateCents(2, [1, 1, 1]), [1, 1, 0]);
  for (let total = 1; total < 5000; total += 37) {
    const allocations = allocateCents(total, [2311, 3257, 1977, 2500]);
    assert.equal(
      allocations.reduce((a, b) => a + b, 0),
      total,
    );
    assert.ok(allocations.every(Number.isInteger));
  }
  assert.throws(() => allocateCents(-1, [1]));
});
test("unknown lines are retained as warnings and block finalization", () => {
  let p = buildPlan("甲：鸡肉汉堡。\n还有一个人想要特别的");
  p = toggleLock(p, "p1");
  assert.equal(p.warnings.length, 1);
  assert.equal(readiness(p).ready, false);
});
test("out-of-scope quantities and allergies require manual review", () => {
  const p = buildPlan("甲：两个鸡肉汉堡。\n乙：鱼肉汉堡，花生过敏。");
  assert.ok(p.members.every((m) => m.needsReview));
  assert.throws(() => toggleLock(p, "p1"));
});
test("no false finished state while over total budget", () => {
  let p = buildPlan("甲：牛肉汉堡。\n乙：鱼肉汉堡。", 20);
  p = toggleLock(toggleLock(p, "p1"), "p2");
  assert.equal(readiness(p).ready, false);
  assert.ok(readiness(p).issues.includes("整单超出预算"));
});
test("ready plan produces a clearly labeled demo receipt", () => {
  let p = buildPlan(SAMPLES[1].text, 100);
  for (const m of p.members) p = toggleLock(p, m.id);
  assert.equal(readiness(p).ready, true);
  const text = receiptText(p);
  assert.match(text, /非真实订单/);
  assert.match(text, /阿泽/);
  assert.equal(
    quoteDemo(p).shares.reduce((n, s) => n + s.amount, 0),
    quoteDemo(p).total,
  );
});
test("invalid and oversized inputs are rejected", () => {
  for (const budget of [NaN, Infinity, -1, 0, 10001])
    assert.throws(() => buildPlan("甲：鸡肉汉堡。", budget));
  assert.throws(() => buildPlan(""));
  assert.throws(() => buildPlan("x".repeat(6001)));
  assert.throws(() => buildPlan("没有任何人名格式"));
  assert.throws(() =>
    editMember(buildPlan("甲：鸡肉汉堡。"), "p1", ["not-a-food"]),
  );
});
