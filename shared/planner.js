// All fixture amounts are integer cents. This catalog is fictional demo data.
export const CATALOG = [
  {
    id: "chicken",
    name: "香酥鸡肉堡",
    price: 1800,
    kind: "main",
    protein: "chicken",
    spicy: false,
    art: "chicken",
  },
  {
    id: "beef",
    name: "芝士牛肉堡",
    price: 2200,
    kind: "main",
    protein: "beef",
    spicy: false,
    art: "beef",
  },
  {
    id: "spicy",
    name: "香辣鸡肉堡",
    price: 2000,
    kind: "main",
    protein: "chicken",
    spicy: true,
    art: "spicy",
  },
  {
    id: "fish",
    name: "香脆鱼肉堡",
    price: 2100,
    kind: "main",
    protein: "fish",
    spicy: false,
    art: "fish",
  },
  {
    id: "cola",
    name: "可乐",
    price: 500,
    kind: "drink",
    sugar: true,
    art: "drink",
  },
  {
    id: "zero",
    name: "无糖可乐",
    price: 500,
    kind: "drink",
    sugar: false,
    art: "drink",
  },
  {
    id: "tea",
    name: "无糖茶",
    price: 600,
    kind: "drink",
    sugar: false,
    art: "drink",
  },
  {
    id: "coffee",
    name: "美式咖啡",
    price: 900,
    kind: "drink",
    sugar: false,
    art: "coffee",
  },
  { id: "fries", name: "小份薯条", price: 800, kind: "side", art: "fries" },
  {
    id: "nuggets",
    name: "鸡块（4块）",
    price: 1200,
    kind: "side",
    art: "nuggets",
  },
];
export const SAMPLES = [
  {
    title: "办公室午餐",
    note: "4 位搭子 · 有人临时改主意",
    budget: 120,
    text: "小王：鸡肉汉堡，不吃辣，加一份薯条。\n小李：和小王一样，饮料换无糖可乐。\n阿橙：鱼肉汉堡，不要咖啡，预算30元。\n我：随便，25元以内就好。\n小王：等等，我还是换牛肉汉堡吧。",
  },
  {
    title: "周末小聚",
    note: "3 位搭子 · 每个人都有偏好",
    budget: 100,
    text: "小夏：牛肉汉堡，无糖茶。\n阿泽：香辣鸡肉汉堡，可乐，再加薯条。\n我：鱼肉汉堡，不要饮料。",
  },
  {
    title: "预算挑战",
    note: "3 位搭子 · 试试处理超预算",
    budget: 60,
    text: "小王：牛肉汉堡，可乐。\n小李：鱼肉汉堡，无糖茶。\n我：鸡肉汉堡，加薯条。",
  },
];
export const money = (cents) => (cents / 100).toFixed(2);
export const itemById = (id) => CATALOG.find((item) => item.id === id);
export const memberTotal = (member) =>
  member.items.reduce((total, id) => total + (itemById(id)?.price || 0), 0);
export function constraintsFrom(text, previous = {}) {
  const c = { ...previous };
  if (/不吃辣|不要辣|不能吃辣|不辣/.test(text)) c.noSpicy = true;
  if (/可以吃辣|要辣的/.test(text)) c.noSpicy = false;
  if (/不要咖啡|不喝咖啡/.test(text)) c.noCoffee = true;
  if (/无糖|不喝含糖|不要糖/.test(text)) c.noSugar = true;
  if (/不要饮料|不喝饮料/.test(text)) c.noDrink = true;
  if (/不吃牛肉|不要牛肉/.test(text)) c.noBeef = true;
  if (/不吃鸡肉|不要鸡肉/.test(text)) c.noChicken = true;
  const budget =
    text.match(/(?:预算|不超过|别超过|最多)\s*(\d+(?:\.\d{1,2})?)/) ||
    text.match(/(\d+(?:\.\d{1,2})?)\s*(?:块|元)\s*(?:以内|以下)/);
  if (budget) c.budget = Math.round(Number(budget[1]) * 100);
  return c;
}
export function tagsFor(c) {
  return [
    c.noSpicy && "不吃辣",
    c.noSugar && "无糖饮品",
    c.noCoffee && "不要咖啡",
    c.noDrink && "不要饮料",
    c.noBeef && "不吃牛肉",
    c.noChicken && "不吃鸡肉",
    c.budget !== undefined && `≤ ¥${money(c.budget)}`,
  ].filter(Boolean);
}
export function violations(member) {
  const c = member.constraints;
  const items = member.items.map(itemById).filter(Boolean);
  return [
    c.noSpicy && items.some((i) => i.spicy) && "包含辣味餐品",
    c.noSugar && items.some((i) => i.sugar) && "包含含糖饮品",
    c.noCoffee && member.items.includes("coffee") && "包含咖啡",
    c.noDrink && items.some((i) => i.kind === "drink") && "包含饮品",
    c.noBeef && items.some((i) => i.protein === "beef") && "包含牛肉",
    c.noChicken && items.some((i) => i.protein === "chicken") && "包含鸡肉",
    c.budget !== undefined &&
      memberTotal(member) > c.budget &&
      `个人餐品原价超预算 ¥${money(memberTotal(member) - c.budget)}`,
  ].filter(Boolean);
}
function inferItems(text, constraints, previous) {
  let items = previous ? [...previous] : ["chicken", "cola"];
  const desired =
    /(?:牛肉|巨无霸)/.test(text) && !/(?:不吃|不要)牛肉/.test(text)
      ? "beef"
      : /鱼/.test(text)
        ? "fish"
        : /鸡/.test(text) && !/(?:不吃|不要)鸡肉/.test(text)
          ? /辣/.test(text) && !constraints.noSpicy
            ? "spicy"
            : "chicken"
          : null;
  if (desired)
    items = items.map((id) => (itemById(id)?.kind === "main" ? desired : id));
  if (!previous && !desired) {
    const allowed = CATALOG.find(
      (i) =>
        i.kind === "main" &&
        !(constraints.noChicken && i.protein === "chicken") &&
        !(constraints.noBeef && i.protein === "beef") &&
        !(constraints.noSpicy && i.spicy),
    );
    if (allowed) items[0] = allowed.id;
  }
  const drink = /无糖茶|乌龙茶/.test(text)
    ? "tea"
    : /咖啡/.test(text) && !constraints.noCoffee
      ? "coffee"
      : /无糖可乐/.test(text) || constraints.noSugar
        ? "zero"
        : /可乐/.test(text)
          ? "cola"
          : null;
  if (drink) {
    items = items.filter((id) => itemById(id)?.kind !== "drink");
    items.push(drink);
  }
  if (constraints.noDrink)
    items = items.filter((id) => itemById(id)?.kind !== "drink");
  if (constraints.noCoffee)
    items = items.map((id) => (id === "coffee" ? "zero" : id));
  if (
    /薯条/.test(text) &&
    !/不要薯条|去掉薯条/.test(text) &&
    !items.includes("fries")
  )
    items.push("fries");
  if (/不要薯条|去掉薯条/.test(text))
    items = items.filter((id) => id !== "fries");
  if (/鸡块/.test(text) && !/不要鸡块/.test(text) && !items.includes("nuggets"))
    items.push("nuggets");
  if (/不要鸡块/.test(text)) items = items.filter((id) => id !== "nuggets");
  return items;
}
export function buildPlan(text, budget = 120) {
  if (!text.trim()) throw new Error("先粘贴大家的点餐消息。");
  if (text.length > 6000) throw new Error("消息太长了，请控制在 6000 字以内。");
  if (
    !Number.isFinite(Number(budget)) ||
    Number(budget) <= 0 ||
    Number(budget) > 10000
  )
    throw new Error("请输入 0 至 10000 元之间的预算。");
  const members = [];
  const warnings = [];
  const references = [];
  const lines = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  lines.forEach((line, index) => {
    const match = line.match(/^([^：:\n]{1,16})[：:]\s*(.+)$/);
    if (!match) {
      warnings.push(`第 ${index + 1} 行未识别，请使用「名字：想吃什么」格式。`);
      return;
    }
    const [, name, message] = match;
    let member = members.find((m) => m.name === name.trim());
    if (!member) {
      if (members.length >= 6) {
        warnings.push(`第 ${index + 1} 行超出 6 人上限，尚未加入。`);
        return;
      }
      member = {
        id: `p${members.length + 1}`,
        name: name.trim(),
        items: null,
        constraints: {},
        messages: [],
        locked: false,
        ambiguity: null,
        needsReview: false,
      };
      members.push(member);
    }
    member.constraints = constraintsFrom(message, member.constraints);
    const ref = message.match(/(?:和|跟|同)\s*(.{1,16}?)\s*(?:一样|相同)/);
    if (ref) {
      const source = members.find((m) => m.name === ref[1].trim());
      const snapshot = source?.items ? [...source.items] : null;
      references.push({
        memberId: member.id,
        sourceName: ref[1].trim(),
        snapshot,
        index,
        message,
      });
      member.items = inferItems(message, member.constraints, snapshot);
    } else member.items = inferItems(message, member.constraints, member.items);
    member.messages.push(message);
    member.lastLine = index;
    if (
      !/牛肉|巨无霸|鱼|鸡|汉堡|可乐|咖啡|无糖|茶|薯条|随便|一样|相同/.test(
        message,
      ) ||
      /过敏|素食|两份|三份|[2-9]\s*(?:份|个)|两个|三个/.test(message)
    ) {
      member.needsReview = true;
    }
  });
  if (!members.length)
    throw new Error("没有识别到搭子。试试「小王：鸡肉汉堡，不吃辣」。");
  for (const ref of references) {
    const member = members.find((m) => m.id === ref.memberId);
    const source = members.find((m) => m.name === ref.sourceName);
    if (
      !source ||
      !ref.snapshot ||
      (source.lastLine > ref.index &&
        JSON.stringify(ref.snapshot) !== JSON.stringify(source.items))
    ) {
      member.ambiguity = {
        source: ref.sourceName,
        before: ref.snapshot
          ? inferItems(ref.message, member.constraints, ref.snapshot)
          : null,
        after: source?.items
          ? inferItems(ref.message, member.constraints, source.items)
          : null,
      };
    }
  }
  return {
    members,
    warnings,
    budget: Math.round(Number(budget) * 100),
    revision: 1,
    source: "demo",
  };
}
export function resolveAmbiguity(plan, id, choice) {
  return changeMember(plan, id, (member) => {
    const selection = member.ambiguity?.[choice];
    if (!selection) throw new Error("这个选择暂时不可用，请手动选餐。");
    return { ...member, items: [...selection], ambiguity: null, locked: false };
  });
}
function changeMember(plan, id, update) {
  const target = plan.members.find((m) => m.id === id);
  if (!target) throw new Error("找不到这位搭子。");
  return {
    ...plan,
    revision: plan.revision + 1,
    members: plan.members.map((m) => (m.id === id ? update(m) : m)),
  };
}
export function editMember(plan, id, items) {
  if (!items.length || items.some((i) => !itemById(i)))
    throw new Error("请选择有效餐品。");
  if (items.filter((i) => itemById(i).kind === "main").length !== 1)
    throw new Error("每位搭子需要一份主食。");
  return changeMember(plan, id, (member) => {
    if (member.locked) throw new Error("这份餐已锁定，请先解锁再修改。");
    return {
      ...member,
      items: [...items],
      ambiguity: null,
      needsReview: false,
    };
  });
}
export function toggleLock(plan, id) {
  return changeMember(plan, id, (member) => {
    if (
      !member.locked &&
      (member.ambiguity || member.needsReview || violations(member).length)
    )
      throw new Error("请先处理这位搭子的待确认需求。");
    return { ...member, locked: !member.locked };
  });
}
// Largest remainder allocation: stable tie-breaking, exact cents, no lost cent.
export function allocateCents(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (
    !Number.isSafeInteger(total) ||
    total < 0 ||
    weights.some((w) => !Number.isSafeInteger(w) || w < 0)
  )
    throw new Error("金额无效");
  if (!sum) return weights.map(() => 0);
  const rows = weights.map((w, i) => ({
    i,
    value: Math.floor((total * w) / sum),
    remainder: (total * w) % sum,
  }));
  let rest = total - rows.reduce((s, r) => s + r.value, 0);
  [...rows]
    .sort((a, b) => b.remainder - a.remainder || a.i - b.i)
    .forEach((row) => {
      if (rest > 0) {
        rows[row.i].value++;
        rest--;
      }
    });
  return rows.map((row) => row.value);
}
export function quoteDemo(plan) {
  const weights = plan.members.map(memberTotal);
  const subtotal = weights.reduce((a, b) => a + b, 0);
  const discount = subtotal >= 10000 ? 1000 : 0;
  const total = subtotal - discount;
  const allocations = allocateCents(total, weights);
  return {
    source: "demo",
    revision: plan.revision,
    subtotal,
    discount,
    total,
    shares: plan.members.map((m, i) => ({
      id: m.id,
      name: m.name,
      amount: allocations[i],
    })),
    overBudget: Math.max(0, total - plan.budget),
    promotion: "演示规则：餐品满 ¥100 减 ¥10",
  };
}
export function readiness(plan) {
  const issues = [...plan.warnings];
  for (const m of plan.members) {
    if (m.ambiguity) issues.push(`${m.name}的跟单需要确认`);
    if (m.needsReview) issues.push(`${m.name}的需求需要手动核对`);
    issues.push(...violations(m).map((v) => `${m.name}：${v}`));
    if (!m.locked) issues.push(`${m.name}还没有确认餐品`);
  }
  if (quoteDemo(plan).overBudget) issues.push("整单超出预算");
  return { ready: issues.length === 0, issues };
}
export function receiptText(plan, quote = quoteDemo(plan)) {
  return [
    "麦搭子 · 点餐清单",
    "【演示数据 · 非真实订单】",
    "",
    ...plan.members.map(
      (m) =>
        `${m.name}：${m.items.map((id) => itemById(id).name).join(" + ")}\n  分摊 ¥${money(quote.shares.find((s) => s.id === m.id).amount)}${m.locked ? " · 已确认" : " · 待确认"}`,
    ),
    "",
    `餐品原价 ¥${money(quote.subtotal)} / 演示优惠 ¥${money(quote.discount)}`,
    `合计 ¥${money(quote.total)} / 预算 ¥${money(plan.budget)}`,
    "分摊方式：优惠按餐品原价比例分配，尾差按最大余数补齐至分。",
    "此清单仅用于讨论；真实价格、商品与优惠以官方核价为准。",
  ].join("\n");
}
