import React, { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Clock3,
  Coffee,
  Copy,
  ExternalLink,
  History,
  Info,
  Link2,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  Minus,
  Plus,
  RotateCcw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UnlockKeyhole,
  Users,
  Utensils,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { BrandMark, FoodArt } from "./FoodArt.jsx";
import {
  CATALOG,
  SAMPLES,
  buildPlan,
  editMember,
  itemById,
  memberTotal,
  money,
  quoteDemo,
  readiness,
  receiptText,
  resolveAmbiguity,
  tagsFor,
  toggleLock,
  violations,
} from "../shared/planner.js";

const STORAGE_KEY = "maidazi-draft-v1";
function initialState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (
      saved?.version === 1 &&
      typeof saved.chat === "string" &&
      saved.chat.length <= 6000 &&
      Number.isFinite(saved.budget) &&
      saved.budget > 0 &&
      saved.budget <= 10000
    ) {
      const plan = buildPlan(saved.chat, saved.budget);
      if (
        Array.isArray(saved.members) &&
        saved.members.length === plan.members.length
      ) {
        for (const member of plan.members) {
          const stored = saved.members.find(
            (m) => m.id === member.id && m.name === member.name,
          );
          if (
            stored?.items?.length &&
            stored.items.length <= 6 &&
            stored.items.every((id) => itemById(id))
          ) {
            member.items = stored.items;
            if (stored.reviewed === true) {
              member.ambiguity = null;
              member.needsReview = false;
            }
            member.locked =
              stored.locked === true &&
              !member.ambiguity &&
              !member.needsReview &&
              !violations(member).length;
          }
        }
      }
      return { chat: saved.chat, budget: saved.budget, plan };
    }
  } catch {
    /* A corrupt or unavailable local draft must not prevent startup. */
  }
  return {
    chat: SAMPLES[0].text,
    budget: 120,
    plan: buildPlan(SAMPLES[0].text, 120),
  };
}
async function api(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Maidazi-Client": "local-app",
    },
    body: JSON.stringify(body || {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "操作未完成，请重试。");
  return data;
}
function Modal({ title, subtitle, children, onClose, wide = false }) {
  const panel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    function keydown(e) {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;
      const nodes = [
        ...panel.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select, textarea, a[href], [tabindex="0"]',
        ),
      ];
      if (!nodes.length) return;
      if (
        e.shiftKey &&
        (document.activeElement === nodes[0] ||
          document.activeElement === panel.current)
      ) {
        e.preventDefault();
        nodes.at(-1).focus();
      } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
        e.preventDefault();
        nodes[0].focus();
      }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`modal ${wide ? "wide" : ""}`}
      >
        <header className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" aria-label="关闭" onClick={onClose}>
            <X size={21} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function SettingsModal({ configured, refresh, onClose, notify }) {
  const [form, setForm] = useState({
    token: "",
    baseUrl: "",
    apiKey: "",
    model: "",
  });
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [tools, setTools] = useState(null);
  async function act(action) {
    setWorking(action);
    setError("");
    setTools(null);
    try {
      if (action === "clear") {
        await api("/api/config/clear");
        notify("会话中的接入配置已清除");
      } else {
        await api("/api/config", form);
        setForm({ token: "", baseUrl: "", apiKey: "", model: "" });
        if (action === "check") {
          const result = await api("/api/mcp/check");
          setTools(result.tools);
        } else notify("配置已保存在本地服务内存中");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      await refresh();
      setWorking("");
    }
  }
  return (
    <Modal
      title="连接真实门店"
      subtitle="演示可直接使用；真实查询需要你自己的服务凭据。"
      onClose={onClose}
    >
      <div className="connection-state">
        <span className={configured.mcp ? "dot green" : "dot"} />
        麦当劳 {configured.mcp ? "已配置，待连接验证" : "未配置"}
        <span className={configured.model ? "dot green" : "dot"} />
        模型 {configured.model ? "已配置" : "未配置"}
      </div>
      <div className="form-stack">
        <label>
          麦当劳 MCP Token{" "}
          <a href="https://open.mcd.cn/mcp" target="_blank" rel="noreferrer">
            申请 Token <ExternalLink size={12} />
          </a>
          <input
            autoComplete="off"
            type="password"
            value={form.token}
            placeholder={
              configured.mcp ? "已配置 · 留空保留" : "粘贴你的 MCP Token"
            }
            onChange={(e) => setForm({ ...form, token: e.target.value })}
          />
        </label>
        <div className="divider-label">支持工具调用的 OpenAI 兼容接口</div>
        <label>
          API Base URL
          <input
            value={form.baseUrl}
            placeholder="https://你的服务地址/v1"
            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
          />
        </label>
        <div className="form-row">
          <label>
            API Key
            <input
              type="password"
              autoComplete="off"
              value={form.apiKey}
              placeholder="留空保留已有配置"
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            />
          </label>
          <label>
            模型名称
            <input
              value={form.model}
              placeholder="服务商提供的模型 ID"
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
          </label>
        </div>
      </div>
      <p className="notice">
        <ShieldCheck size={17} />
        凭据仅存于本地服务内存，重启后清除；也可在项目 .env
        中配置。真实查询会将你提交的地点、点餐需求及相关工具结果发送给配置的模型服务。
      </p>
      <p className="muted small-text">
        当前版本开放门店、菜单、优惠查询和计价。网页不创建真实订单。
      </p>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      {tools && (
        <div className="success-box">
          <CheckCheck size={17} />
          已连接官方 MCP，发现 {tools.length} 个允许的查询工具。
          <div className="tool-tags">
            {tools.map((t) => (
              <span key={t.name}>{t.name}</span>
            ))}
          </div>
        </div>
      )}
      <div className="modal-actions">
        <button
          className="text-button"
          disabled={!!working}
          onClick={() => act("clear")}
        >
          清除配置
        </button>
        <button
          className="button secondary"
          disabled={!!working}
          onClick={() => act("check")}
        >
          {working === "check" ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Link2 size={16} />
          )}
          测试 MCP
        </button>
        <button
          className="button primary"
          disabled={!!working}
          onClick={() => act("save")}
        >
          {working === "save" && <LoaderCircle className="spin" size={16} />}
          保存配置
        </button>
      </div>
    </Modal>
  );
}

function EditModal({ member, onSave, onClose }) {
  const [items, setItems] = useState([...member.items]);
  const preview = { ...member, items };
  const errors = violations(preview);
  function choose(kind, id) {
    setItems([
      ...items.filter((i) => itemById(i).kind !== kind),
      ...(id ? [id] : []),
    ]);
  }
  return (
    <Modal
      title={`调整${member.name === "我" ? "我" : ` ${member.name} `}的餐`}
      subtitle="其他搭子的餐品会保持原样。"
      onClose={onClose}
    >
      <div className="edit-food-preview">
        <FoodArt
          type={itemById(items.find((id) => itemById(id).kind === "main"))?.art}
        />
        <div>
          <span className="eyebrow">这一份的演示原价</span>
          <strong>¥{money(memberTotal(preview))}</strong>
          <div className="tags">
            {tagsFor(member.constraints).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="form-stack">
        <label>
          主食
          <select
            aria-label="主食"
            value={items.find((id) => itemById(id).kind === "main") || ""}
            onChange={(e) => choose("main", e.target.value)}
          >
            {CATALOG.filter((i) => i.kind === "main").map((i) => (
              <option value={i.id} key={i.id}>
                {i.name} · ¥{money(i.price)}
              </option>
            ))}
          </select>
        </label>
        <label>
          饮品
          <select
            aria-label="饮品"
            value={items.find((id) => itemById(id).kind === "drink") || ""}
            onChange={(e) => choose("drink", e.target.value)}
          >
            <option value="">不要饮品</option>
            {CATALOG.filter((i) => i.kind === "drink").map((i) => (
              <option value={i.id} key={i.id}>
                {i.name} · ¥{money(i.price)}
              </option>
            ))}
          </select>
        </label>
        <label>加一点小食</label>
        <div className="side-options">
          {CATALOG.filter((i) => i.kind === "side").map((i) => (
            <label className="checkbox-option" key={i.id}>
              <input
                type="checkbox"
                checked={items.includes(i.id)}
                onChange={(e) =>
                  setItems(
                    e.target.checked
                      ? [...items, i.id]
                      : items.filter((id) => id !== i.id),
                  )
                }
              />
              <span>{i.name}</span>
              <span>¥{money(i.price)}</span>
            </label>
          ))}
        </div>
      </div>
      {member.needsReview && (
        <p className="notice">
          有需求超出演示识别范围。保存表示你已逐项核对；过敏、素食等要求请向餐厅另行确认。
        </p>
      )}
      {!!errors.length && (
        <div className="warning-box">
          {errors.join("；")}。可保存草稿，但处理前不能确认餐品。
        </div>
      )}
      <div className="modal-actions">
        <button className="button secondary" onClick={onClose}>
          取消
        </button>
        <button className="button primary" onClick={() => onSave(items)}>
          保存这份餐 <Check size={16} />
        </button>
      </div>
    </Modal>
  );
}

function LiveQuoteModal({ plan, configured, onSettings, onClose }) {
  const [location, setLocation] = useState("");
  const [extra, setExtra] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState("");
  const selected = plan.members
    .map(
      (m) =>
        `${m.name}：${m.items.map((id) => itemById(id).name).join("、")}；要求：${tagsFor(m.constraints).join("、") || "无特别要求"}`,
    )
    .join("\n");
  async function quote() {
    if (!location.trim()) {
      setError("先填写城市、附近地址或具体门店。");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    const request = `到店自取。地点或门店：${location}\n总预算：${money(plan.budget)} 元\n以下是由演示菜单表达的选餐偏好，请映射到真实门店餐品，并说明替换。不要直接使用演示商品作为官方餐品。\n${selected}\n补充信息：${extra || "无"}\n如缺必要信息请询问，禁止下单。`;
    setSubmitted(`${location}\n${extra}`);
    try {
      setResult(await api("/api/live/quote", { request }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const changed = submitted && submitted !== `${location}\n${extra}`;
  return (
    <Modal
      title="查一查，真实门店怎么点"
      subtitle="这次查询独立于演示账单，真实返回结果不会覆盖样例价格。"
      onClose={busy ? () => {} : onClose}
      wide
    >
      {!configured.mcp || !configured.model ? (
        <div className="connect-empty">
          <span className="large-icon">
            <Link2 size={28} />
          </span>
          <h3>先连接你的麦当劳与模型服务</h3>
          <p>
            查询真实菜单、门店优惠和官方计价。
            <br />
            凭据保留在本机，演示模式不需要配置。
          </p>
          <button className="button primary" onClick={onSettings}>
            设置连接 <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <>
          <div className="form-stack">
            <label>
              城市与门店 / 附近地址
              <input
                disabled={busy}
                value={location}
                placeholder="例如：上海市徐汇区，具体门店或附近地址"
                onChange={(e) => setLocation(e.target.value)}
              />
            </label>
            <label>
              补充信息
              <textarea
                disabled={busy}
                value={extra}
                rows={3}
                placeholder="可以补充门店、规格，或回答下面的追问。每次核价都会重新查询。"
                onChange={(e) => setExtra(e.target.value)}
              />
            </label>
          </div>
          <details className="details">
            <summary>本次会提交的选餐偏好</summary>
            <pre>{selected}</pre>
          </details>
          <div className="notice">
            <Info size={17} />
            将使用你配置的模型和麦当劳服务，可能产生模型调用费用。仅查询与计价，不创建订单。
          </div>
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          {busy && (
            <div className="live-progress" role="status">
              <LoaderCircle className="spin" size={21} />
              <div>
                <strong>正在查询门店、菜单与可用方案</strong>
                <p>多个官方查询可能需要一些时间，请保留此窗口。</p>
              </div>
            </div>
          )}
          {result && (
            <section className="live-result">
              <span
                className={`pill ${result.status === "quoted" ? "green-pill" : "amber-pill"}`}
              >
                {result.status === "quoted"
                  ? "已收到官方计价响应"
                  : "需要你补充信息"}
              </span>
              {changed && (
                <p className="warning-box">
                  输入已变更，以下仍为上次查询结果，请重新核价。
                </p>
              )}
              <h3>{result.storeName || "本次查询结果"}</h3>
              <p>{result.message}</p>
              {result.quote && (
                <>
                  <p className="small-text muted">
                    以下为官方工具原始返回，请核对其中的业务状态、金额单位、商品与应付总价。
                  </p>
                  <pre className="quote-json">
                    {JSON.stringify(result.quote.data, null, 2)}
                  </pre>
                  <details className="details">
                    <summary>查看送入官方计价工具的商品参数</summary>
                    <pre>{JSON.stringify(result.quote.arguments, null, 2)}</pre>
                  </details>
                </>
              )}
              <div className="tool-tags">
                {result.trace.map((t) => (
                  <span key={t.id}>
                    {t.isError ? "!" : "✓"} {t.name}
                  </span>
                ))}
              </div>
              <small className="muted">
                查询于 {new Date(result.checkedAt).toLocaleTimeString("zh-CN")}
              </small>
            </section>
          )}
          <div className="modal-actions">
            <button className="button primary" disabled={busy} onClick={quote}>
              {busy ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <Zap size={16} />
              )}
              查询真实方案
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

export default function App() {
  const [initial] = useState(initialState);
  const [chat, setChat] = useState(initial.chat);
  const [budget, setBudget] = useState(initial.budget);
  const [plan, setPlan] = useState(initial.plan);
  const [dirty, setDirty] = useState(false);
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState({ mcp: false, model: false });
  const [events, setEvents] = useState([
    {
      title: "欢迎来到这一餐",
      detail: "已载入样例。先看看小李的跟单，再试试修改一份餐。",
      time: new Date(),
    },
  ]);
  const [previous, setPrevious] = useState(null);
  const [sampleIndex, setSampleIndex] = useState(() =>
    SAMPLES.findIndex((s) => s.text === initial.chat),
  );
  const [pendingSample, setPendingSample] = useState(null);
  const toastTimer = useRef();
  const quote = quoteDemo(plan);
  const state = readiness(plan);
  const lockedCount = plan.members.filter((m) => m.locked).length;
  const unresolved = plan.members.filter(
    (m) => m.ambiguity || m.needsReview || violations(m).length,
  ).length;
  async function refresh() {
    try {
      const r = await fetch("/api/health");
      const data = await r.json();
      setConfigured(data.configured);
    } catch {}
  }
  useEffect(() => {
    refresh();
    return () => clearTimeout(toastTimer.current);
  }, []);
  useEffect(() => {
    if (dirty) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 1,
          chat,
          budget: plan.budget / 100,
          members: plan.members.map((m) => ({
            id: m.id,
            name: m.name,
            items: m.items,
            locked: m.locked,
            reviewed: !m.ambiguity && !m.needsReview,
          })),
        }),
      );
    } catch {}
  }, [plan, dirty, chat]);
  function notify(message) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4500);
  }
  function event(title, detail) {
    setEvents((prev) =>
      [{ title, detail, time: new Date() }, ...prev].slice(0, 30),
    );
  }
  function mutate(fn, title) {
    try {
      const next = fn(plan);
      const nextQuote = quoteDemo(next);
      setPrevious(plan);
      setPlan(next);
      setError("");
      const delta = nextQuote.total - quote.total;
      event(
        title,
        delta === 0
          ? "账单总额不变，其他搭子的餐品已保留。"
          : `演示总额 ${delta > 0 ? "+" : "−"}¥${money(Math.abs(delta))}，现在为 ¥${money(nextQuote.total)}。优惠变化时会重新分摊。`,
      );
      notify(title);
    } catch (e) {
      setError(e.message);
    }
  }
  function generate(sample = null) {
    try {
      const nextChat = sample ? sample.text : chat;
      const nextBudget = sample ? sample.budget : Number(budget);
      const next = buildPlan(nextChat, nextBudget);
      setPlan(next);
      setChat(nextChat);
      setBudget(nextBudget);
      setDirty(false);
      setPrevious(null);
      setError("");
      setModal(null);
      event(
        "已整理大家的需求",
        `共 ${next.members.length} 位搭子。演示模式使用本地规则识别，待确认内容会单独标记。`,
      );
      notify(`已整理 ${next.members.length} 位搭子的餐单`);
    } catch (e) {
      setError(e.message);
      setModal(null);
    }
  }
  function requestGenerate(sample = null) {
    if (lockedCount) {
      setPendingSample(sample);
      setModal("regenerate");
    } else generate(sample);
  }
  function updateBudget(value) {
    setBudget(value);
    const n = Number(value);
    if (value !== "" && Number.isFinite(n) && n > 0 && n <= 10000)
      setPlan((prev) => ({
        ...prev,
        budget: Math.round(n * 100),
        revision: prev.revision + 1,
      }));
  }
  async function copyReceipt() {
    try {
      await navigator.clipboard.writeText(receiptText(plan));
      notify("演示清单已复制，可发给搭子讨论");
    } catch {
      notify("浏览器未允许复制，请使用下载清单");
    }
  }
  function downloadReceipt() {
    const blob = new Blob(["\uFEFF", receiptText(plan)], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "麦搭子-演示点餐清单.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    event("已导出讨论清单", "导出内容带有演示标记，不代表已下单。");
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a href="#" className="brand-home" aria-label="麦搭子首页">
          <BrandMark />
        </a>
        <div className="sidebar-nav">
          <button
            className="nav-button active"
            title="搭餐工作台"
            aria-label="搭餐工作台"
            onClick={() => {
              setModal(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <Utensils size={21} />
            <span>搭餐</span>
          </button>
          <button
            className="nav-button"
            title="本次操作记录"
            aria-label="本次操作记录"
            onClick={() => setModal("history")}
          >
            <History size={21} />
            <span>记录</span>
          </button>
        </div>
        <div className="sidebar-bottom">
          <button
            className="nav-button"
            aria-label="使用指南"
            onClick={() => setModal("guide")}
          >
            <CircleHelp size={21} />
          </button>
          <button
            className="nav-button"
            aria-label="连接设置"
            onClick={() => setModal("settings")}
          >
            <Settings2 size={21} />
          </button>
          <span className="sidebar-avatar">G</span>
        </div>
      </aside>
      <main className="main-shell">
        <header className="topbar">
          <div className="wordmark">
            麦搭子<span>MAIDAZI</span>
          </div>
          <div className="topbar-right">
            <span className="local-status">
              <span className="dot green" />
              本地运行
            </span>
            <button className="mode-pill" onClick={() => setModal("guide")}>
              <span className="dot amber" />
              演示模式
              <ChevronDown size={13} />
            </button>
            <button
              className="button small secondary"
              onClick={() => setModal("settings")}
            >
              <Link2 size={14} />
              连接 MCP
            </button>
          </div>
        </header>
        <div className="page-content">
          <section className="hero">
            <div>
              <div className="eyebrow hero-eyebrow">
                <span />
                好好吃饭，一起安排
              </div>
              <h1>
                大家的「随便」，
                <br className="mobile-break" />
                <span>我来安排。</span>
              </h1>
              <p>把群聊里的七嘴八舌，变成每个人都满意的一餐。</p>
            </div>
            <div className="hero-sticker">
              <div className="sticker-ring">LET’S EAT TOGETHER</div>
              <FoodArt type="beef" size={116} />
              <span className="sticker-star">✦</span>
              <span className="sticker-caption">今天，也要好好吃饭</span>
            </div>
          </section>
          <div className="workspace-topline">
            <div className="workspace-title">
              <span className="round-icon">
                <Users size={17} />
              </span>
              <h2>这一餐，我们一起</h2>
              <span className="count-pill">{plan.members.length} 位搭子</span>
            </div>
            <div className="stepper">
              <span className="step done">
                <b>
                  <Check size={11} />
                </b>
                整理需求
              </span>
              <i />
              <span
                className={`step ${lockedCount === plan.members.length ? "done" : "current"}`}
              >
                <b>2</b>确认餐品
              </span>
              <i />
              <span className={`step ${state.ready ? "current" : ""}`}>
                <b>3</b>核对清单
              </span>
            </div>
          </div>
          {error && (
            <div className="error-box page-error" role="alert">
              {error}
              <button
                className="icon-button"
                aria-label="关闭错误提示"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="workspace">
            <section className="chat-panel panel">
              <div className="panel-heading">
                <div>
                  <MessageCircle size={18} />
                  <h3>大家想吃什么？</h3>
                </div>
                <span className="mini-label">01 / 收集</span>
              </div>
              <p className="panel-description">
                粘贴聊天记录，剩下的交给麦搭子。
              </p>
              <label className="sr-only" htmlFor="chat-input">
                群聊点餐记录
              </label>
              <div className="chat-input-wrap">
                <textarea
                  id="chat-input"
                  spellCheck="false"
                  maxLength={6000}
                  value={chat}
                  onChange={(e) => {
                    setChat(e.target.value);
                    setDirty(true);
                  }}
                  placeholder={
                    "小王：鸡肉汉堡，不吃辣。\n小李：和小王一样，饮料无糖。"
                  }
                />
                <div className="input-foot">
                  <span>
                    <LockKeyhole size={11} />
                    演示内容仅保存在此浏览器
                  </span>
                  <span>{chat.length}/6000</span>
                </div>
              </div>
              <div className="sample-row">
                <Sparkles size={13} />
                <span>试试一个场景</span>
              </div>
              <div className="sample-buttons">
                {SAMPLES.map((sample, index) => (
                  <button
                    key={sample.title}
                    className={sampleIndex === index ? "selected" : ""}
                    onClick={() => {
                      setSampleIndex(index);
                      requestGenerate(sample);
                    }}
                  >
                    {sample.title}
                  </button>
                ))}
              </div>
              <div className="budget-control">
                <label htmlFor="budget">
                  <Wallet size={16} />
                  这次总预算
                </label>
                <div>
                  <span>¥</span>
                  <input
                    id="budget"
                    type="number"
                    min="1"
                    max="10000"
                    step="1"
                    value={budget}
                    onChange={(e) => updateBudget(e.target.value)}
                    onBlur={() => setBudget(plan.budget / 100)}
                  />
                </div>
              </div>
              <button
                className="button primary generate-button"
                onClick={() => requestGenerate()}
              >
                <Sparkles size={17} />
                {dirty ? "重新整理这段聊天" : "整理成餐单"}
                <ArrowRight size={17} />
              </button>
              {dirty && (
                <p className="dirty-note">
                  聊天已修改，重新整理后才会更新餐单。
                </p>
              )}
              <div className="little-note">
                <span>✦</span>
                <div>
                  <strong>“等等，我改一下……”也没关系</strong>
                  <p>已确认的餐品可以锁定。只改这一份，其他人的不用重来。</p>
                </div>
              </div>
            </section>
            <section className="meals-section">
              <div className="meals-heading">
                <div>
                  <h3>每个人，都安排好了</h3>
                  <p>
                    {unresolved
                      ? `${unresolved} 位搭子的需求需要你再看一眼`
                      : "核对餐品后，点一下确认就好"}
                  </p>
                </div>
                <span className="mini-label">02 / 搭餐</span>
              </div>
              {!!plan.warnings.length && (
                <div className="warning-box">
                  {plan.warnings.map((w) => (
                    <p key={w}>{w}</p>
                  ))}
                  请修正左侧聊天后重新整理。
                </div>
              )}
              <div className="meal-grid">
                {plan.members.map((member, index) => {
                  const issues = violations(member);
                  const needs =
                    member.ambiguity || member.needsReview || issues.length;
                  const main = itemById(
                    member.items.find((id) => itemById(id).kind === "main"),
                  );
                  return (
                    <article
                      className={`meal-card ${member.locked ? "locked" : ""} ${needs ? "needs-review" : ""}`}
                      key={member.id}
                    >
                      <header className="meal-card-header">
                        <div className="person">
                          <span className={`avatar avatar-${index % 4}`}>
                            {member.name.slice(-1)}
                          </span>
                          <div>
                            <h4>
                              {member.name}
                              {member.name === "我" && <small>组织者</small>}
                            </h4>
                            <span>
                              {member.locked
                                ? "这份餐，已经确定了"
                                : member.ambiguity
                                  ? "有一个小问题待确认"
                                  : "看看是不是你想吃的"}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`card-status ${member.locked ? "confirmed" : needs ? "review" : ""}`}
                        >
                          {member.locked ? (
                            <LockKeyhole size={12} />
                          ) : needs ? (
                            <Info size={12} />
                          ) : (
                            <Clock3 size={12} />
                          )}
                          <span>
                            {member.locked
                              ? "已锁定"
                              : needs
                                ? "待核对"
                                : "待确认"}
                          </span>
                        </span>
                      </header>
                      <div className={`food-stage food-stage-${index % 4}`}>
                        <span className="food-label">
                          {main?.protein === "beef"
                            ? "BEEF & CHEESE"
                            : main?.protein === "fish"
                              ? "CRISPY FISH"
                              : "CRISPY CHICKEN"}
                        </span>
                        <FoodArt type={main?.art} size={150} />
                        {member.items.some(
                          (id) => itemById(id).kind === "drink",
                        ) && (
                          <span className="drink-art">
                            <FoodArt
                              type={
                                member.items.includes("coffee")
                                  ? "coffee"
                                  : "drink"
                              }
                              size={79}
                            />
                          </span>
                        )}
                        {member.items.includes("fries") && (
                          <span className="side-art">
                            <FoodArt type="fries" size={77} />
                          </span>
                        )}
                        <span className="illustration-note">示意搭配</span>
                      </div>
                      <div className="meal-card-body">
                        <div className="meal-name-row">
                          <h4>{main?.name}</h4>
                          <span className="meal-price">
                            ¥<b>{money(memberTotal(member))}</b>
                          </span>
                        </div>
                        <p className="meal-extras">
                          {member.items
                            .filter((id) => itemById(id).kind !== "main")
                            .map((id) => itemById(id).name)
                            .join(" + ") || "单点主食"}
                        </p>
                        <div className="tags">
                          {tagsFor(member.constraints).length ? (
                            tagsFor(member.constraints).map((tag) => (
                              <span key={tag}>{tag}</span>
                            ))
                          ) : (
                            <span>按当前偏好搭配</span>
                          )}
                        </div>
                        {member.ambiguity && (
                          <div className="ambiguity-box">
                            <strong>
                              <Info size={13} />
                              {member.ambiguity.source}后来改了主意
                            </strong>
                            <p>你说的“一样”，跟哪一版？</p>
                            <div>
                              {member.ambiguity.before && (
                                <button
                                  disabled={dirty}
                                  onClick={() =>
                                    mutate(
                                      (p) =>
                                        resolveAmbiguity(
                                          p,
                                          member.id,
                                          "before",
                                        ),
                                      `${member.name}选择跟原来的餐`,
                                    )
                                  }
                                >
                                  原来的 ·{" "}
                                  {itemById(member.ambiguity.before[0])?.name}
                                </button>
                              )}
                              {member.ambiguity.after && (
                                <button
                                  disabled={dirty}
                                  onClick={() =>
                                    mutate(
                                      (p) =>
                                        resolveAmbiguity(p, member.id, "after"),
                                      `${member.name}选择跟最新的餐`,
                                    )
                                  }
                                >
                                  最新的 ·{" "}
                                  {itemById(member.ambiguity.after[0])?.name}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        {member.needsReview && (
                          <p className="card-warning">
                            有需求超出规则识别范围，请点“调整”核对。
                          </p>
                        )}
                        {issues.map((issue) => (
                          <p className="card-warning" key={issue}>
                            {issue}
                          </p>
                        ))}
                        <div className="card-actions">
                          <button
                            className="adjust-button"
                            disabled={member.locked || dirty}
                            onClick={() => setEditing(member.id)}
                          >
                            <SlidersHorizontal size={14} />
                            调整
                          </button>
                          <button
                            className={`confirm-button ${member.locked ? "is-locked" : ""}`}
                            disabled={dirty || (!member.locked && !!needs)}
                            onClick={() =>
                              mutate(
                                (p) => toggleLock(p, member.id),
                                `${member.name}${member.locked ? "已解锁，可以修改" : "已确认并锁定"}`,
                              )
                            }
                          >
                            {member.locked ? (
                              <UnlockKeyhole size={14} />
                            ) : (
                              <Check size={14} />
                            )}{" "}
                            {member.locked ? "解锁修改" : "确认这份"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="meal-grid-foot">
                <ShieldCheck size={14} />
                <span>锁定后，其他人改主意也不会动到你的餐品。</span>
                {previous && (
                  <button
                    onClick={() => {
                      setPlan(previous);
                      setPrevious(null);
                      event("已撤销上一步", "恢复上一版餐品与确认状态。");
                      notify("已撤销上一步");
                    }}
                  >
                    <RotateCcw size={13} />
                    撤销
                  </button>
                )}
              </div>
            </section>
            <aside className="summary-column">
              <section className="summary-panel panel">
                <div className="panel-heading">
                  <div>
                    <Clipboard size={18} />
                    <h3>这一餐的账单</h3>
                  </div>
                </div>
                <span className="bill-mode">DEMO / 演示计价</span>
                <div className="bill-lines">
                  <div>
                    <span>餐品原价</span>
                    <span>¥{money(quote.subtotal)}</span>
                  </div>
                  <div className="discount-line">
                    <span>
                      <span className="coupon-icon">券</span>演示优惠
                    </span>
                    <span>− ¥{money(quote.discount)}</span>
                  </div>
                </div>
                <div className="bill-total">
                  <span>大家一起付</span>
                  <strong>
                    <small>¥</small>
                    {money(quote.total)}
                  </strong>
                  <span className="per-person">
                    人均约 ¥
                    {money(Math.round(quote.total / plan.members.length))}
                  </span>
                </div>
                <div
                  className={`budget-meter ${quote.overBudget ? "over" : ""}`}
                >
                  <div className="budget-meter-text">
                    <span>
                      {quote.overBudget ? "超出预算" : "预算刚刚好，有余地"}
                    </span>
                    <b>
                      {quote.overBudget ? "+" : "余"} ¥
                      {money(Math.abs(plan.budget - quote.total))}
                    </b>
                  </div>
                  <div className="meter">
                    <span
                      style={{
                        width: `${Math.min(100, (quote.total / plan.budget) * 100)}%`,
                      }}
                    />
                  </div>
                  <small>总预算 ¥{money(plan.budget)}</small>
                </div>
                <div className="shares">
                  <h4>
                    每个人的这一份 <span>优惠按原价比例分摊</span>
                  </h4>
                  {quote.shares.map((share, index) => (
                    <div key={share.id}>
                      <span className={`tiny-avatar avatar-${index % 4}`}>
                        {share.name.slice(-1)}
                      </span>
                      <span>{share.name}</span>
                      <b>¥{money(share.amount)}</b>
                    </div>
                  ))}
                </div>
                <div className="confirmation-progress">
                  <div>
                    <span>
                      <Users size={14} />
                      {lockedCount}/{plan.members.length} 位搭子已确认
                    </span>
                    <span>
                      {Math.round((lockedCount / plan.members.length) * 100)}%
                    </span>
                  </div>
                  <div className="meter">
                    <span
                      style={{
                        width: `${(lockedCount / plan.members.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <button
                  className="button primary review-button"
                  disabled={dirty || !state.ready}
                  onClick={() => setModal("receipt")}
                >
                  核对点餐清单 <ArrowRight size={16} />
                </button>
                {(!state.ready || dirty) && (
                  <p className="summary-hint">
                    {dirty
                      ? "请先重新整理修改后的聊天"
                      : quote.overBudget
                        ? "调整预算或餐品后再继续"
                        : unresolved
                          ? "先处理餐卡上的待核对项"
                          : "等大家确认，就可以核对清单了"}
                  </p>
                )}
                <button
                  className="live-link"
                  disabled={dirty || unresolved > 0 || plan.warnings.length > 0}
                  onClick={() => setModal("live")}
                >
                  <Zap size={14} />
                  去真实门店核价
                  <ChevronRight size={14} />
                </button>
                <p className="bill-disclaimer">
                  样例餐品、价格与优惠仅供演示。
                  <br />
                  {quote.promotion}，非官方活动。
                  <br />
                  确认餐品后如优惠变化，分摊会随之更新。
                </p>
              </section>
              <div className="companion-note">
                <span className="note-sparkle">✳</span>
                <h4>
                  吃什么可以随便，
                  <br />
                  每个人都值得被照顾。
                </h4>
                <div className="avatar-stack">
                  {plan.members.slice(0, 4).map((m, i) => (
                    <span className={`avatar avatar-${i}`} key={m.id}>
                      {m.name.slice(-1)}
                    </span>
                  ))}
                  <span className="small-heart">♡</span>
                </div>
              </div>
            </aside>
          </div>
          <footer className="page-footer">
            <span>
              <BrandMark small />
              麦搭子 · 把大家的想法，整理成一餐
            </span>
            <span>
              独立开发作品 · 非麦当劳官方产品
              <button onClick={() => setModal("guide")}>
                使用说明 <ExternalLink size={11} />
              </button>
            </span>
          </footer>
        </div>
      </main>
      {toast && (
        <div className="toast" role="status">
          <CheckCheck size={17} />
          {toast}
        </div>
      )}
      {editing && (
        <EditModal
          key={editing}
          member={plan.members.find((m) => m.id === editing)}
          onClose={() => setEditing(null)}
          onSave={(items) => {
            const name = plan.members.find((m) => m.id === editing).name;
            mutate(
              (p) => editMember(p, editing, items),
              `已更新${name}的餐，其他餐品已保留`,
            );
            setEditing(null);
          }}
        />
      )}
      {modal === "settings" && (
        <SettingsModal
          configured={configured}
          refresh={refresh}
          notify={notify}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "live" && (
        <LiveQuoteModal
          plan={plan}
          configured={configured}
          onSettings={() => setModal("settings")}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "receipt" && (
        <Modal
          title="这一餐，安排好了"
          subtitle="再核对一次。这里生成讨论清单，不会创建真实订单。"
          onClose={() => setModal(null)}
        >
          <div className="receipt-hero">
            <span className="success-seal">
              <CheckCheck size={32} />
            </span>
            <div>
              <h3>{plan.members.length} 位搭子，全部确认</h3>
              <p>演示合计 ¥{money(quote.total)}</p>
            </div>
          </div>
          <pre className="receipt-text">{receiptText(plan)}</pre>
          <div className="modal-actions">
            <button className="button secondary" onClick={copyReceipt}>
              <Copy size={16} />
              复制清单
            </button>
            <button className="button primary" onClick={downloadReceipt}>
              <ArrowDownToLine size={16} />
              下载清单
            </button>
          </div>
        </Modal>
      )}
      {modal === "history" && (
        <Modal
          title="这一餐的小记"
          subtitle="本次打开应用以来的操作。刷新后记录清空，餐单草稿会保留。"
          onClose={() => setModal(null)}
        >
          <div className="event-list">
            {events.map((e, i) => (
              <div className="event" key={i}>
                <span className="event-dot" />
                <div>
                  <h4>{e.title}</h4>
                  <p>{e.detail}</p>
                  <time>{e.time.toLocaleTimeString("zh-CN")}</time>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {modal === "regenerate" && (
        <Modal
          title="重新整理这一餐？"
          subtitle="重新解析聊天会重置已有餐品调整与确认状态。"
          onClose={() => setModal(null)}
        >
          <p className="muted">
            目前有 {lockedCount}{" "}
            份餐已锁定。只改一位搭子的餐，可以直接使用餐卡上的“解锁修改”。
          </p>
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setModal(null)}>
              保留当前餐单
            </button>
            <button
              className="button primary"
              onClick={() => generate(pendingSample)}
            >
              重新整理
            </button>
          </div>
        </Modal>
      )}
      {modal === "guide" && (
        <Modal
          title="把这一餐，安排明白"
          subtitle="麦搭子 v0.1 · 本地运行的多人点餐工作台"
          onClose={() => setModal(null)}
        >
          <div className="guide-steps">
            <div>
              <b>1</b>
              <section>
                <h3>把聊天粘过来</h3>
                <p>
                  每行使用“名字：需求”。演示规则支持 1—6
                  人、一人一份主食、常见饮品和小食；不明确的消息需要手动核对。
                </p>
              </section>
            </div>
            <div>
              <b>2</b>
              <section>
                <h3>把每个人照顾好</h3>
                <p>
                  先解决跟单歧义，再调整餐品。确认后锁定，想改时先解锁。个人预算按餐品原价保守检查。
                </p>
              </section>
            </div>
            <div>
              <b>3</b>
              <section>
                <h3>算清楚，再做决定</h3>
                <p>
                  所有人确认且预算满足后可导出讨论清单。真实门店查询另需配置 MCP
                  Token 与模型接口，网页暂不下单。
                </p>
              </section>
            </div>
          </div>
          <div className="notice">
            <Info size={17} />
            本页插画、餐品名、价格和优惠为自制演示素材。演示模式使用本地规则，不会调用大模型。真实接口接入代码已提供，需用你的账号验证。
          </div>
          <div className="modal-actions">
            <button
              className="text-button"
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                setEvents([]);
                generate(SAMPLES[0]);
                notify("原有草稿已清除，已恢复默认样例");
              }}
            >
              清除本地草稿并恢复样例
            </button>
            <button className="button primary" onClick={() => setModal(null)}>
              开始搭餐 <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
