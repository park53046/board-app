"use client";
/* 가계365 — 비밀번호 잠금 + 대시보드 + 입력 + 고정 항목 + 연간 정산 + 설정 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./gagye.css";

/* ───────────── 타입 ───────────── */
type TxType = "수입" | "지출" | "저축";
type Categories = Record<string, Record<string, string[]>>;
type Config = {
  categories: Categories; payments: string[]; natures: string[];
  budgets: Record<string, number>; startCarry: number; salarySubs: string[];
};
type Tx = {
  id: number; date: string; type: TxType; major: string; minor: string; content: string; amount: number;
  payment: string; nature: string; memo: string; receiptId: number | null; auto: boolean;
};
type Dash = {
  year: number; month: number; carry: number; income: number; expense: number; saving: number; balance: number; rate: number;
  days: number; daily: number[]; cats: { name: string; amount: number; budget: number }[]; totalBudget: number;
  trend: { m: number; income: number; expense: number; saving: number }[]; isCurrent: boolean; today: number; txs: Tx[];
};
type Rec = {
  id: number; active: boolean; type: TxType; major: string; minor: string; content: string; amount: number; payment: string;
  nature: string; day: number; start: string; end: string; last: string; target: number; inRange: boolean; done: boolean; dleft: number;
};
type Annual = {
  year: number; carry: number; income: number; expense: number; saving: number; net: number[]; netTotal: number; endBalance: number; rate: number;
  sections: { type: TxType; lines: { major: string; months: number[]; total: number; avg: number }[]; months: number[]; total: number }[];
  tax: { label: string; value: number; note: string }[];
};
type Now = { y: number; m: number; d: number; ymd: string; ym: string };
type Boot = { config: Config; dash: Dash; recurring: Rec[]; years: number[]; autoAdded: number; cardAlerts: number; now: Now; hasKey: boolean };
type View = "home" | "list" | "add" | "fixed" | "annual" | "settings";
type ReceiptRes = {
  isReceipt: boolean; date: string; store: string; total: number; payment: string; category: string; subcategory: string;
  nature: string; items: { name: string; amount: number }[]; memo: string;
};

/* ───────────── 공통 ───────────── */
const TYPES: TxType[] = ["지출", "수입", "저축"];
const COLORS = ["#6366f1", "#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#14b8a6", "#8b5cf6", "#f97316", "#64748b", "#84cc16", "#0ea5e9"];
const ICON: Record<string, string> = {
  식비: "🍚", 주거통신: "🏠", 생활용품: "🧺", 의복미용: "👕", 건강문화: "🎬", 교육육아: "📚", 교통차량: "🚗",
  경조회비: "🎁", 금융: "💳", 기타지출: "📦", 주수입: "💼", 부수입: "💰", 저축투자: "🐷",
};
const PAY_ICON: Record<string, string> = { 현금: "💵", 체크카드: "💳", 신용카드: "💳", 계좌이체: "🏦", 간편결제: "📱" };
const AMT_LABEL: Record<TxType, string> = { 지출: "얼마를 썼나요?", 수입: "얼마가 들어왔나요?", 저축: "얼마를 모았나요?" };
const RELOCK_MS = 3 * 60 * 1000;

const icon = (k: string) => ICON[k] || "🏷️";
const won = (n: number) => Math.round(Number(n) || 0).toLocaleString("ko-KR");
const man = (n: number) => {
  n = Number(n) || 0;
  const a = Math.abs(n);
  if (a >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, "") + "억";
  if (a >= 1e4) return (n / 1e4).toFixed(a >= 1e6 ? 0 : 1).replace(/\.0$/, "") + "만";
  return won(n);
};
const digits = (s: string) => s.replace(/[^\d]/g, "");
const cls = (t: string) => (t === "수입" ? "inc" : t === "저축" ? "sav" : "exp");
const pad = (n: number) => String(n).padStart(2, "0");
function shiftDate(ymd: string, days: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}
const mdLabel = (ymd: string) => `${Number(ymd.slice(5, 7))}.${ymd.slice(8, 10)}`;

class AuthError extends Error {}
async function api<T>(path: string, init: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const hasBody = init.body !== undefined;
  const res = await fetch(`/api/gagye/${path}`, {
    method: init.method || (hasBody || init.form ? "POST" : "GET"),
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: init.form ?? (hasBody ? JSON.stringify(init.body) : undefined),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && data?.error === "AUTH_REQUIRED") throw new AuthError("AUTH");
  if (!res.ok) throw new Error(data?.error || `서버 오류 (${res.status})`);
  return data as T;
}

/** 사진을 1280px JPEG로 줄여서 base64로 */
function compress(file: File): Promise<{ b64: string; mime: string; preview: string | null }> {
  return new Promise((ok, no) => {
    if (file.type === "application/pdf") {
      if (file.size > 3 * 1024 * 1024) return no(new Error("PDF가 너무 커요 (3MB 이하)."));
      const fr = new FileReader();
      fr.onload = () => ok({ b64: String(fr.result).split(",")[1], mime: "application/pdf", preview: null });
      fr.onerror = () => no(new Error("파일을 읽지 못했어요."));
      fr.readAsDataURL(file);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const d = c.toDataURL("image/jpeg", 0.82);
      URL.revokeObjectURL(url);
      ok({ b64: d.split(",")[1], mime: "image/jpeg", preview: d });
    };
    img.onerror = () => no(new Error("이미지를 열 수 없어요. HEIC라면 JPG로 저장해서 가져와 주세요."));
    img.src = url;
  });
}

function useCountUp(value: number) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 700);
      el.textContent = won(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return ref;
}

/* ───────────── 아이콘 ───────────── */
const I = {
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></svg>,
  list: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>,
  repeat: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></svg>,
  chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
  gear: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>,
  lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>,
  cam: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M3 8h3l2-3h8l2 3h3v11H3z" /><circle cx="12" cy="13" r="3.5" /></svg>,
  photo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 16l5-5 4 4 3-3 6 6" /><circle cx="16" cy="9" r="1.5" /></svg>,
  undo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>,
  store: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 21h18M5 21V8l7-5 7 5v13" /><path d="M9 21v-6h6v6" /></svg>,
  pen: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 20h4L19 9l-4-4L4 16z" /></svg>,
  cal: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>,
};

/* ═════════════════════════════ 메인 ═════════════════════════════ */
export default function GagyeApp() {
  const [locked, setLocked] = useState(true);
  const [lockMsg, setLockMsg] = useState("비밀번호를 입력하세요");
  const [boot, setBoot] = useState<Boot | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [view, setView] = useState<View>("home");
  const [cur, setCur] = useState<{ y: number; m: number } | null>(null);
  const [dash, setDash] = useState<Dash | null>(null);
  const [dashKey, setDashKey] = useState(0);
  const [rec, setRec] = useState<Rec[]>([]);
  const [editTx, setEditTx] = useState<Tx | null>(null);
  const [addType, setAddType] = useState<TxType>("지출");
  const [toastMsg, setToastMsg] = useState("");
  const [banner, setBanner] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hiddenAt = useRef(0);

  const toast = useCallback((m: string) => {
    setToastMsg(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 2300);
  }, []);

  const relock = useCallback((msg: string) => {
    api("lock", { method: "POST" }).catch(() => {});
    setLockMsg(msg);
    setLocked(true);
  }, []);

  /** API 호출 + 공통 오류 처리 (잠김이면 잠금 화면, 아니면 토스트) */
  const call = useCallback(async <T,>(p: Promise<T>): Promise<T | undefined> => {
    try {
      return await p;
    } catch (e) {
      if (e instanceof AuthError) relock("보안을 위해 다시 잠겼어요");
      else toast("오류: " + (e instanceof Error ? e.message : String(e)));
      return undefined;
    }
  }, [relock, toast]);

  const applyDash = useCallback((d: Dash) => {
    setDash(d);
    setCur({ y: d.year, m: d.month });
    setDashKey((k) => k + 1);
  }, []);

  // 앱을 열 때마다 잠금 (이전 세션 쿠키 제거)
  useEffect(() => {
    api("lock", { method: "POST" }).catch(() => {});
  }, []);

  // 3분 이상 다른 화면에 있다가 돌아오면 다시 잠금
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) hiddenAt.current = Date.now();
      else if (!locked && hiddenAt.current && Date.now() - hiddenAt.current > RELOCK_MS) relock("오랫동안 자리를 비워서 잠겼어요");
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [locked, relock]);

  const onUnlocked = useCallback(async () => {
    setLocked(false);
    const b = await call(api<Boot>("bootstrap"));
    if (!b) return;
    setBoot(b);
    setConfig(b.config);
    setRec(b.recurring);
    if (cur && (cur.y !== b.now.y || cur.m !== b.now.m)) {
      const d = await call(api<Dash>(`dashboard?y=${cur.y}&m=${cur.m}`));
      if (d) applyDash(d);
    } else applyDash(b.dash);
    const msgs = [
      b.cardAlerts ? `카드 결제 알림으로 ${b.cardAlerts}건이 자동 기록됐어요 (🔔 표시). 카테고리가 맞는지 한번 확인해 보세요.` : "",
      b.autoAdded ? `고정 항목 ${b.autoAdded}건이 자동으로 기록되었어요.` : "",
    ].filter(Boolean);
    if (msgs.length) {
      setBanner(msgs.join(" "));
      setTimeout(() => setBanner(""), 9000);
    }
  }, [applyDash, call, cur]);

  const loadMonth = useCallback(async (y: number, m: number) => {
    setCur({ y, m });
    setDash(null);
    const d = await call(api<Dash>(`dashboard?y=${y}&m=${m}`));
    if (d) applyDash(d);
  }, [applyDash, call]);

  const shiftMonth = (k: number) => {
    if (!cur) return;
    let y = cur.y, m = cur.m + k;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    loadMonth(y, m);
  };

  const go = (v: View) => {
    if (v === "add") { setEditTx(null); }
    setView(v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openEdit = (t: Tx) => {
    setEditTx(t);
    setView("add");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const rootType = view === "add" ? addType : undefined;

  return (
    <div className={`gg${view === "add" ? " adding" : ""}`} data-t={rootType}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" precedence="default" />
      {locked && <LockScreen msg={lockMsg} onUnlocked={onUnlocked} />}

      <div className="top">
        <div className="brand">
          <b>가계365</b>
          <button className="icon-btn" aria-label="잠그기" title="잠그기" onClick={() => relock("잠겼어요")}>{I.lock}</button>
          <button className="icon-btn" aria-label="설정" title="설정" onClick={() => go("settings")}>{I.gear}</button>
        </div>
        {(view === "home" || view === "list") && cur && (
          <div className="mpick">
            <button aria-label="이전 달" onClick={() => shiftMonth(-1)}>&#8249;</button>
            <b>{cur.y}년 {cur.m}월</b>
            <button aria-label="다음 달" onClick={() => shiftMonth(1)}>&#8250;</button>
          </div>
        )}
      </div>

      <Tabs view={view} go={go} />

      {banner && <div className="banner info">{banner}</div>}
      {boot && !boot.hasKey && view === "add" && (
        <div className="banner">영수증 자동 인식은 Vercel 환경 변수에 GEMINI_API_KEY를 넣은 뒤에 쓸 수 있어요. 직접 입력은 지금도 됩니다.</div>
      )}

      {!locked && config && (
        <>
          {view === "home" && <Home dash={dash} dashKey={dashKey} rec={rec} go={go} openEdit={openEdit} />}
          {view === "list" && <ListView dash={dash} openEdit={openEdit} />}
          {view === "add" && (
            <AddView
              key={editTx ? `e${editTx.id}` : "new"}
              config={config} edit={editTx} hasKey={!!boot?.hasKey} today={boot?.now.ymd || ""}
              recentNames={dash ? Array.from(new Set(dash.txs.map((t) => t.content).filter(Boolean))).slice(0, 40) : []}
              onType={setAddType} call={call} toast={toast}
              onSaved={(d, back) => { applyDash(d); go(back ? "list" : "home"); }}
              onDeleted={() => { if (cur) loadMonth(cur.y, cur.m); go("list"); }}
            />
          )}
          {view === "fixed" && <FixedView config={config} rec={rec} setRec={setRec} call={call} toast={toast} onDash={(d) => { if (cur && d.year === cur.y && d.month === cur.m) applyDash(d); }} />}
          {view === "annual" && <AnnualView years={boot?.years || []} initial={cur?.y || boot?.now.y || 2026} call={call} />}
          {view === "settings" && <SettingsView config={config} setConfig={setConfig} call={call} toast={toast} years={boot?.years || []} afterImport={() => onUnlocked()} />}
        </>
      )}

      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  );
}

/* ───────────── 탭 ───────────── */
function Tabs({ view, go }: { view: View; go: (v: View) => void }) {
  const b = (v: View, label: string, ic: React.ReactNode) => (
    <button className={view === v ? "on" : ""} onClick={() => go(v)}>{ic}<span>{label}</span></button>
  );
  return (
    <nav className="tabs">
      <div className="in-tabs">
        {b("home", "홈", I.home)}
        {b("list", "내역", I.list)}
        <button className="add-tab" aria-label="기록하기" onClick={() => go("add")}>
          <span className="fab">{I.plus}<span className="tlabel">기록하기</span></span>
        </button>
        {b("fixed", "고정", I.repeat)}
        {b("annual", "정산", I.chart)}
      </div>
    </nav>
  );
}

/* ───────────── 잠금 화면 ───────────── */
function LockScreen({ msg, onUnlocked }: { msg: string; onUnlocked: () => void }) {
  const [pin, setPin] = useState("");
  const [text, setText] = useState(msg);
  const [state, setState] = useState<"" | "wait" | "err">("");
  const [disabled, setDisabled] = useState(false);
  const busy = useRef(false);

  const submit = useCallback(async (p: string) => {
    busy.current = true;
    setState("wait");
    setText("확인 중...");
    try {
      const res = await fetch("/api/gagye/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: p }) });
      const r = await res.json().catch(() => ({}));
      if (r.ok) { setState(""); setPin(""); busy.current = false; onUnlocked(); return; }
      setState("err");
      if (navigator.vibrate) try { navigator.vibrate(180); } catch {}
      if (r.lockedSec) {
        setText(`여러 번 틀려서 ${Math.ceil(r.lockedSec / 60)}분 동안 잠겼어요.`);
        setDisabled(true);
        setTimeout(() => setDisabled(false), Math.min(r.lockedSec, 300) * 1000);
      } else if (r.left !== undefined) setText(`비밀번호가 틀렸어요 (남은 횟수 ${r.left})`);
      else setText(r.error || "연결 오류: 잠시 후 다시 시도하세요");
    } catch {
      setState("err");
      setText("연결 오류: 잠시 후 다시 시도하세요");
    }
    setTimeout(() => { setPin(""); setState(""); busy.current = false; }, 650);
  }, [onUnlocked]);

  const key = useCallback((k: string) => {
    if (busy.current || disabled) return;
    setPin((p) => {
      const next = k === "b" ? p.slice(0, -1) : k === "c" ? "" : p.length < 4 ? p + k : p;
      if (next.length === 4 && p.length === 3) setTimeout(() => submit(next), 120);
      return next;
    });
  }, [disabled, submit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) key(e.key);
      else if (e.key === "Backspace") key("b");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key]);

  return (
    <div className="lock">
      <div className="lock-in">
        <div className="logo"><svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15.5" r="1.4" fill="#fff" /></svg></div>
        <h1>가계365</h1>
        <p>{text}</p>
        <div className={`dots ${state} ${state === "err" ? "shake" : ""}`}>
          {[0, 1, 2, 3].map((i) => <i key={i} className={i < pin.length ? "on" : ""} />)}
        </div>
        <div className="pad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => <button key={k} disabled={disabled} onClick={() => key(k)}>{k}</button>)}
          <button className="ghost" disabled={disabled} onClick={() => key("c")}>지우기</button>
          <button disabled={disabled} onClick={() => key("0")}>0</button>
          <button className="ghost" aria-label="한 칸 지우기" disabled={disabled} onClick={() => key("b")}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z" /><path d="M17 9l-5 6M12 9l5 6" /></svg>
          </button>
        </div>
        <small className="hint">비밀번호는 가계부 [설정]에서 바꿀 수 있어요</small>
      </div>
    </div>
  );
}

/* ───────────── 홈 ───────────── */
function TxRow({ t, onClick }: { t: Tx; onClick?: () => void }) {
  const c = cls(t.type);
  return (
    <button className="tx" onClick={onClick}>
      <div className={`ico ${c}`}>{icon(t.major)}</div>
      <div className="mid">
        <b>{t.content || t.minor || t.major}{t.receiptId ? " 🧾" : ""}{t.auto ? " 🔁" : ""}{t.memo.startsWith("[카드알림]") ? " 🔔" : ""}</b>
        <small>{mdLabel(t.date)} · {t.minor || t.major}{t.payment ? ` · ${t.payment}` : ""}</small>
      </div>
      <div className={`amt ${c}`}>{t.type === "수입" ? "+" : "-"}{won(t.amount)}</div>
    </button>
  );
}

function Badge({ it }: { it: Rec }) {
  if (!it.active) return <span className="badge off">꺼짐</span>;
  if (!it.inRange) return <span className="badge wait">기간 외</span>;
  if (it.done) return <span className="badge done">기록됨</span>;
  if (it.dleft <= 0) return <span className="badge soon">오늘 처리</span>;
  return <span className={`badge ${it.dleft <= 3 ? "soon" : "wait"}`}>D-{it.dleft}</span>;
}

function Home({ dash, dashKey, rec, go, openEdit }: { dash: Dash | null; dashKey: number; rec: Rec[]; go: (v: View) => void; openEdit: (t: Tx) => void }) {
  const [selDay, setSelDay] = useState<number | null>(null);
  const [selM, setSelM] = useState<number | null>(null);
  const balRef = useCountUp(dash?.balance || 0);
  if (!dash) return <div className="view"><div className="skel" /><div className="skel" style={{ height: 120 }} /></div>;
  const d = dash;

  const prev = d.month > 1 ? d.trend[d.month - 2] : null;
  let insight = `이월 ${won(d.carry)}원 포함`;
  if (prev && prev.expense > 0 && d.expense > 0) {
    const pct = Math.round(((d.expense - prev.expense) / prev.expense) * 100);
    insight = pct === 0 ? "지난달과 지출이 비슷해요" : pct < 0 ? `지난달보다 ${-pct}% 덜 썼어요` : `지난달보다 ${pct}% 더 썼어요`;
  }
  const rate = Math.max(0, Math.min(1, d.income ? d.saving / d.income : 0));

  const cats = d.cats.filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount);
  const tot = cats.reduce((a, c) => a + c.amount, 0);
  const C = 2 * Math.PI * 54;
  const segs = cats.reduce<{ name: string; len: number; off: number }[]>((acc, c) => {
    const prev = acc[acc.length - 1];
    acc.push({ name: c.name, len: (c.amount / tot) * C, off: prev ? prev.off + prev.len : 0 });
    return acc;
  }, []);

  const bud = d.totalBudget > 0 ? d.expense / d.totalBudget : 0;
  const remain = d.totalBudget - d.expense;
  const leftDays = d.days - d.today + 1;

  const mx = Math.max(1, ...d.daily);
  const tm = Math.max(1, ...d.trend.map((t) => Math.max(t.income, t.expense, t.saving)));
  const showM = selM ?? d.month;
  const tSel = d.trend[showM - 1];

  const actRec = rec.filter((x) => x.active && x.inRange);
  const doneRec = actRec.filter((x) => x.done).length;

  return (
    <div className="view home-grid" key={dashKey}>
      <div className="col">
        <div className="hero">
          <div className="hero-row">
            <div>
              <div className="lbl">{d.isCurrent ? "이번 달 남은 돈" : `${d.month}월 잔액`}</div>
              <div className="bal"><span ref={balRef}>0</span><small>원</small></div>
              <div className="insight">{insight}</div>
            </div>
            <div className="savering">
              <svg width="78" height="78" viewBox="0 0 78 78">
                <circle cx="39" cy="39" r="32" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="8" />
                <circle className="arc" cx="39" cy="39" r="32" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${rate * 201} 201`} />
              </svg>
              <div><span>{Math.round(rate * 100)}%</span><small>저축률</small></div>
            </div>
          </div>
          <div className="chips">
            <div className="chip"><small>수입</small><b>{man(d.income)}</b></div>
            <div className="chip"><small>지출</small><b>{man(d.expense)}</b></div>
            <div className="chip"><small>저축</small><b>{man(d.saving)}</b></div>
          </div>
        </div>

        {d.totalBudget > 0 && (
          <div className="card">
            <h3>{d.isCurrent ? "이번 달 예산" : `${d.month}월 예산`} <small>예산 {won(d.totalBudget)}원</small></h3>
            <div className="bud-top"><b>{Math.round(bud * 100)}%</b><span className="muted">{won(d.expense)}원 사용</span></div>
            <div className="bar"><i className={bud > 1 ? "over" : bud > 0.8 ? "mid" : ""} style={{ width: `${Math.min(100, bud * 100)}%` }} /></div>
            <div className="tip">
              {remain < 0 ? <>예산을 <b style={{ color: "var(--exp)" }}>{won(-remain)}원</b> 넘었어요. 남은 기간은 꼭 필요한 곳에만!</>
                : d.isCurrent ? <>남은 예산 <b>{won(remain)}원</b> · 남은 {leftDays}일 동안 <b style={{ color: "var(--pri)" }}>하루 {won(Math.floor(remain / leftDays))}원</b>씩 쓸 수 있어요</>
                : <>예산 대비 <b>{won(remain)}원</b>을 남겼어요</>}
            </div>
          </div>
        )}

        <div className="card">
          <h3>어디에 썼을까? <small>총 {won(tot)}원</small></h3>
          {!tot ? <div className="empty">아직 지출이 없어요</div> : (
            <>
              <div className="donut-wrap">
                <div className="donut">
                  <svg width="140" height="140" viewBox="0 0 140 140">
                    <circle cx="70" cy="70" r="54" fill="none" stroke="#f1f2f8" strokeWidth="20" />
                    {segs.map((g, i) => (
                      <circle key={g.name} className="seg" cx="70" cy="70" r="54" fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="20" strokeDasharray={`${Math.max(0, g.len - 1.5)} ${C}`} strokeDashoffset={-g.off} />
                    ))}
                  </svg>
                  <div className="ctr"><small>지출</small><b>{man(tot)}</b></div>
                </div>
                <div className="legend">
                  {cats.slice(0, 5).map((c, i) => <div key={c.name}><i style={{ background: COLORS[i % COLORS.length] }} /><span>{c.name}</span><em>{Math.round((c.amount / tot) * 100)}%</em></div>)}
                  {cats.length > 5 && <div className="muted">외 {cats.length - 5}개</div>}
                </div>
              </div>
              <div className="catlist">
                {cats.map((c, i) => {
                  const col = COLORS[i % COLORS.length];
                  const w = c.budget ? Math.min(100, (c.amount / c.budget) * 100) : (c.amount / cats[0].amount) * 100;
                  const over = c.budget > 0 && c.amount > c.budget;
                  return (
                    <div className="cat" key={c.name}>
                      <div className="row1"><span>{icon(c.name)} {c.name}{c.budget ? <em>/ {man(c.budget)}</em> : null}</span><b style={over ? { color: "var(--exp)" } : undefined}>{won(c.amount)}원</b></div>
                      <div className="bar"><i style={{ width: `${w}%`, background: over ? "var(--exp)" : col }} /></div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="col">
        <div className="card">
          <h3>일별 지출 <small>최고 {man(mx)}원</small></h3>
          <div className="bars">
            {d.daily.map((v, i) => {
              const today = d.isCurrent && i + 1 === d.today, future = d.isCurrent && i + 1 > d.today;
              const h = v ? Math.max(4, (v / mx) * 100) : future ? 0 : 2;
              return (
                <button key={i} className={`b${today ? " today" : ""}${future ? " future" : ""}${selDay === i ? " sel" : ""}`} aria-label={`${i + 1}일`} onClick={() => setSelDay(i)}>
                  <i style={{ height: `${h}%`, animationDelay: `${i * 12}ms` }} />
                </button>
              );
            })}
          </div>
          <div className="xlab"><span>1일</span><span>{Math.ceil(d.days / 2)}일</span><span>{d.days}일</span></div>
          <div className="dayinfo">{selDay === null ? "막대를 누르면 금액이 보여요" : <><b>{d.month}월 {selDay + 1}일</b> 지출 {won(d.daily[selDay])}원</>}</div>
        </div>

        <div className="card">
          <h3>월별 흐름 <span className="keys"><span className="ki">수입</span><span className="ke">지출</span><span className="ks">저축</span></span></h3>
          <div className="trend">
            {d.trend.map((t) => (
              <button key={t.m} className={`m${t.m === d.month ? " cur" : ""}`} onClick={() => setSelM(t.m)}>
                <div className="pair">
                  <i className="a" style={{ height: `${(t.income / tm) * 100}%` }} />
                  <i className="b" style={{ height: `${(t.expense / tm) * 100}%` }} />
                  <i className="c" style={{ height: `${(t.saving / tm) * 100}%` }} />
                </div>
                <small>{t.m}</small>
              </button>
            ))}
          </div>
          <div className="dayinfo"><b>{showM}월</b> 수입 {man(tSel.income)} · 지출 {man(tSel.expense)} · 저축 {man(tSel.saving)}</div>
        </div>

        <div className="card">
          <h3>이번 달 고정 항목 <button className="link" onClick={() => go("fixed")}>관리</button></h3>
          {!actRec.length ? <div className="empty" style={{ padding: "12px 0" }}>등록된 고정 항목이 없어요</div> : (
            <>
              <div className="bar" style={{ height: 8, marginBottom: 6 }}><i style={{ width: `${(doneRec / actRec.length) * 100}%`, background: "var(--grad)" }} /></div>
              <div className="muted" style={{ marginBottom: 6 }}>{actRec.length}개 중 {doneRec}개 기록됨</div>
              {actRec.slice(0, 6).map((it) => (
                <div className="fx" key={it.id} style={{ padding: "9px 0" }}>
                  <div className="mid"><b style={{ fontSize: 14 }}>{icon(it.major)} {it.content || it.minor}<Badge it={it} /></b><small>매월 {it.day === 31 ? "말일" : `${it.day}일`} · {it.type}</small></div>
                  <div className={`amt ${cls(it.type)}`}>{won(it.amount)}</div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="card">
          <h3>최근 내역 <button className="link" onClick={() => go("list")}>전체 보기</button></h3>
          {d.txs.length ? d.txs.slice(0, 6).map((t) => <TxRow key={t.id} t={t} onClick={() => openEdit(t)} />) : <div className="empty">아직 내역이 없어요</div>}
        </div>
      </div>
    </div>
  );
}

/* ───────────── 내역 ───────────── */
function ListView({ dash, openEdit }: { dash: Dash | null; openEdit: (t: Tx) => void }) {
  const [f, setF] = useState<"" | TxType>("");
  const [q, setQ] = useState("");
  if (!dash) return <div className="view"><div className="skel" /></div>;
  const ql = q.trim().toLowerCase();
  const rows = dash.txs.filter((t) => (!f || t.type === f) && (!ql || `${t.content} ${t.major} ${t.minor} ${t.memo} ${t.payment}`.toLowerCase().includes(ql)));
  const groups = new Map<string, Tx[]>();
  rows.forEach((t) => groups.set(t.date, [...(groups.get(t.date) || []), t]));
  const sum = (t: TxType) => rows.filter((x) => x.type === t).reduce((a, x) => a + x.amount, 0);
  return (
    <div className="view">
      <div className="filters">
        {(["", "지출", "수입", "저축"] as const).map((k) => <button key={k || "all"} className={f === k ? "on" : ""} onClick={() => setF(k)}>{k || "전체"}</button>)}
        <input className="search" placeholder="검색 (사용처, 메모...)" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="sumline">
        <span>{rows.length}건</span><span>수입 <b>{won(sum("수입"))}</b></span><span>지출 <b>{won(sum("지출"))}</b></span><span>저축 <b>{won(sum("저축"))}</b></span>
      </div>
      {!rows.length ? <div className="card empty" style={{ marginTop: 12 }}>{dash.month}월 내역이 없어요</div> : (
        [...groups.entries()].map(([date, g]) => {
          const out = g.filter((t) => t.type !== "수입").reduce((a, t) => a + t.amount, 0);
          return (
            <div key={date}>
              <div className="dayhead"><span>{Number(date.slice(5, 7))}월 {Number(date.slice(8, 10))}일</span><span>{out ? `-${won(out)}` : ""}</span></div>
              <div className="card" style={{ padding: "4px 16px", marginBottom: 6 }}>{g.map((t) => <TxRow key={t.id} t={t} onClick={() => openEdit(t)} />)}</div>
            </div>
          );
        })
      )}
      <p className="muted" style={{ textAlign: "center", marginTop: 12 }}>항목을 누르면 고치거나 지울 수 있어요</p>
    </div>
  );
}

/* ───────────── 입력 / 수정 ───────────── */
type CallFn = <T>(p: Promise<T>) => Promise<T | undefined>;

function AddView({ config, edit, hasKey, today, recentNames, onType, call, toast, onSaved, onDeleted }: {
  config: Config; edit: Tx | null; hasKey: boolean; today: string; recentNames: string[];
  onType: (t: TxType) => void; call: CallFn; toast: (m: string) => void;
  onSaved: (d: Dash, back: boolean) => void; onDeleted: () => void;
}) {
  const firstMajor = (t: TxType) => Object.keys(config.categories[t] || {})[0] || "";
  const firstMinor = (t: TxType, mj: string) => (config.categories[t]?.[mj] || [])[0] || "";
  const defPay = config.payments.includes("체크카드") ? "체크카드" : config.payments[0] || "";
  const defNat = config.natures.includes("변동지출") ? "변동지출" : config.natures[0] || "";

  const [type, setTypeState] = useState<TxType>(edit?.type || "지출");
  const [amount, setAmount] = useState(edit ? won(edit.amount) : "");
  const [date, setDate] = useState(edit?.date || today);
  const [major, setMajor] = useState(edit?.major || firstMajor("지출"));
  const [minor, setMinor] = useState(edit ? edit.minor : firstMinor("지출", firstMajor("지출")));
  const [payment, setPayment] = useState(edit?.payment || defPay);
  const [nature, setNature] = useState(edit?.nature || defNat);
  const [content, setContent] = useState(edit?.content || "");
  const [memo, setMemo] = useState(edit?.memo || "");
  const [img, setImg] = useState<{ b64: string; mime: string; preview: string | null } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<{ text: string; ok?: boolean } | null>(null);
  const [items, setItems] = useState<{ name: string; amount: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ title: string; sub: string } | null>(null);
  const mirror = useRef<HTMLSpanElement>(null);
  const amtRef = useRef<HTMLInputElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);

  useEffect(() => { onType(type); }, [type, onType]);
  // 금액 글자 폭에 맞춰 입력칸 너비 조절
  useEffect(() => {
    if (mirror.current && amtRef.current) amtRef.current.style.width = `${mirror.current.offsetWidth + 6}px`;
  }, [amount]);

  const setType = (t: TxType, keep?: { major?: string; minor?: string }) => {
    setTypeState(t);
    const majors = Object.keys(config.categories[t] || {});
    const mj = keep?.major && majors.includes(keep.major) ? keep.major : majors[0] || "";
    setMajor(mj);
    setMinor(keep?.minor && (config.categories[t]?.[mj] || []).includes(keep.minor) ? keep.minor : firstMinor(t, mj));
    if (t === "저축" && config.payments.includes("계좌이체")) setPayment("계좌이체");
  };

  const amt = Number(digits(amount)) || 0;
  const majors = Object.keys(config.categories[type] || {});
  const subs = config.categories[type]?.[major] || [];
  const quick = [1000, 5000, 10000, 50000, 100000];
  const typeIdx = TYPES.indexOf(type);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setStatus({ text: "사진 준비 중..." });
      const c = await compress(file);
      setImg(c);
      setTimeout(() => scanRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      if (!hasKey) { setStatus({ text: "자동 인식은 꺼져 있어요. 직접 입력 후 저장하면 사진도 함께 저장돼요." }); return; }
      setScanning(true);
      setStatus({ text: "영수증을 읽는 중... (5~10초)" });
      const r = await call(api<ReceiptRes>("receipt/analyze", { body: { b64: c.b64, mime: c.mime } }));
      setScanning(false);
      if (!r) { setStatus({ text: "인식하지 못했어요. 직접 입력해 주세요." }); return; }
      if (!r.isReceipt) { setStatus({ text: "영수증으로 보이지 않아요. 직접 입력해 주세요." }); return; }
      setType("지출", { major: r.category, minor: r.subcategory });
      if (r.date && /^\d{4}-\d{2}-\d{2}$/.test(r.date)) setDate(r.date);
      if (r.total) setAmount(won(r.total));
      if (r.payment) setPayment(r.payment);
      if (r.nature) setNature(r.nature);
      setContent(r.store || "");
      setMemo(r.memo || "");
      setItems(r.items.filter((x) => x.name));
      setStatus({ text: "인식 완료! 내용을 확인하고 저장하세요.", ok: true });
    } catch (err) {
      setScanning(false);
      setStatus({ text: err instanceof Error ? err.message : String(err) });
    }
  };

  const reset = () => {
    setAmount(""); setContent(""); setMemo(""); setImg(null); setItems([]); setStatus(null); setDate(today);
  };

  const save = async (force = false) => {
    if (!amt) { toast("금액을 입력하세요"); amtRef.current?.focus(); return; }
    if (!date) { toast("날짜를 고르세요"); return; }
    const entry = { type, date, amount: amt, content, major, minor, payment, nature, memo };
    setSaving(true);
    if (edit) {
      const r = await call(api<{ dash: Dash }>(`tx/${edit.id}`, { method: "PATCH", body: entry }));
      setSaving(false);
      if (r) { toast("고쳤어요"); onSaved(r.dash, true); }
      return;
    }
    const r = await call(api<{ duplicate?: boolean; dash: Dash; month: number }>("tx", { body: { entry, force, ...(img ? { b64: img.b64, mime: img.mime } : {}) } }));
    setSaving(false);
    if (!r) return;
    if (r.duplicate) {
      if (confirm("같은 날짜, 금액, 사용처의 내역이 이미 있어요.\n그래도 저장할까요?")) save(true);
      return;
    }
    setDone({ title: `${won(amt)}원 ${type}`, sub: `${r.month}월 가계부에 저장했어요` });
    setTimeout(() => { setDone(null); onSaved(r.dash, false); }, 1200);
  };

  const remove = async () => {
    if (!edit || !confirm(`"${edit.content || edit.minor || edit.major}" ${won(edit.amount)}원 내역을 지울까요?`)) return;
    const r = await call(api(`tx/${edit.id}`, { method: "DELETE" }));
    if (r) { toast("지웠어요"); onDeleted(); }
  };

  const dateChips = [0, 1, 2].map((k) => ({ k, v: shiftDate(today, -k), label: ["오늘", "어제", "그제"][k] }));
  const customDate = !dateChips.some((c) => c.v === date);

  return (
    <>
      <div className="view add-grid">
        <div className="col">
          {edit && <div className="banner info">내역 고치기 · {mdLabel(edit.date)} {edit.content || edit.major}</div>}
          <div className="add-hero">
            <div className="tseg">
              <div className="knob" style={{ transform: `translateX(${typeIdx * 100}%)` }} />
              {TYPES.map((t) => <button key={t} className={type === t ? "on" : ""} onClick={() => setType(t)}>{t}</button>)}
            </div>
            <div className="amt-wrap">
              <small>{AMT_LABEL[type]}</small>
              <div className="amt-line">
                <span className="mirror" ref={mirror}>{amount || "0"}</span>
                <input ref={amtRef} inputMode="numeric" placeholder="0" autoComplete="off" value={amount}
                  onChange={(e) => { const v = digits(e.target.value); setAmount(v ? Number(v).toLocaleString("ko-KR") : ""); }} />
                <span>원</span>
              </div>
            </div>
            <div className="quick">
              {quick.map((q) => <button key={q} onClick={() => setAmount(won(amt + q))}>+{q >= 10000 ? `${q / 10000}만` : `${q / 1000}천`}</button>)}
            </div>
            {!edit && (
              <div className="scanrow">
                <label className="scanbtn">{I.cam}영수증 촬영<input type="file" accept="image/*" capture="environment" onChange={onFile} /></label>
                <label className="scanbtn alt">{I.photo}사진·PDF<input type="file" accept="image/*,application/pdf" onChange={onFile} /></label>
              </div>
            )}
          </div>

          {(img || status || edit?.receiptId) && (
            <div className="card" ref={scanRef} style={{ padding: 12 }}>
              {img ? (
                <div className={`scan-img${scanning ? " scanning" : ""}${img.preview ? "" : " scan-pdf"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {img.preview ? <img src={img.preview} alt="영수증 미리보기" /> : "📄"}
                  {scanning && <div className="laser" />}
                </div>
              ) : edit?.receiptId ? (
                <a href={`/api/gagye/receipt/${edit.receiptId}`} target="_blank" rel="noreferrer" className="scan-img" style={{ display: "block" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/gagye/receipt/${edit.receiptId}`} alt="저장된 영수증" onError={(e) => { (e.target as HTMLImageElement).replaceWith(document.createTextNode("📄 저장된 영수증(PDF) 열기")); }} />
                </a>
              ) : null}
              {status && <div className={`status${status.ok ? " ok" : ""}`}>{scanning && <span className="spin" />}{status.text}</div>}
            </div>
          )}
        </div>

        <div className="col">
          <div className="card">
            <div className="sec"><span>카테고리</span><b>{icon(major)} {major}{minor ? ` / ${minor}` : ""}</b></div>
            <div className="tiles">
              {majors.map((k, i) => (
                <button key={k} className={`tile${k === major ? " on" : ""}`} onClick={() => { setMajor(k); setMinor(firstMinor(type, k)); }}>
                  <div className="em" style={{ background: `${COLORS[i % COLORS.length]}1f` }}>{icon(k)}</div><span>{k}</span>
                </button>
              ))}
            </div>
            {subs.length > 0 && (
              <div className="subs" key={`${type}-${major}`}>
                {subs.map((s, i) => <button key={s} className={`pill${s === minor ? " on" : ""}`} style={{ animationDelay: `${i * 30}ms` }} onClick={() => setMinor(s)}>{s}</button>)}
              </div>
            )}
          </div>

          <div className="card">
            <div className="sec"><span>언제</span></div>
            <div className="pills">
              {dateChips.map((c) => <button key={c.k} className={`pill${date === c.v ? " on" : ""}`} onClick={() => setDate(c.v)}>{c.label}</button>)}
              <label className={`datechip${customDate ? " on" : ""}`}>{I.cal}<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            </div>
            {type !== "수입" && (
              <>
                <div className="gap" />
                <div className="sec"><span>어떻게</span></div>
                <div className="pills">
                  {config.payments.map((p) => <button key={p} className={`pill${p === payment ? " on" : ""}`} onClick={() => setPayment(p)}>{PAY_ICON[p] || "💠"} {p}</button>)}
                </div>
              </>
            )}
            {type === "지출" && (
              <>
                <div className="gap" />
                <div className="sec"><span>지출 성격</span></div>
                <div className="pills nat">
                  {config.natures.map((n) => <button key={n} data-v={n} className={`pill${n === nature ? " on" : ""}`} onClick={() => setNature(n)}>{n}</button>)}
                </div>
              </>
            )}
          </div>

          <div className="card">
            <div className="sec"><span>내용</span></div>
            <div className="field">{I.store}<input placeholder="어디에서? 예: 홈플러스" list="gg-recent" autoComplete="off" value={content} onChange={(e) => setContent(e.target.value)} /></div>
            <datalist id="gg-recent">{recentNames.map((n) => <option key={n} value={n} />)}</datalist>
            <div style={{ height: 8 }} />
            <div className="field">{I.pen}<input placeholder="메모 (선택)" autoComplete="off" value={memo} onChange={(e) => setMemo(e.target.value)} /></div>
            {items.length > 0 && <div className="items">{items.map((x, i) => <div key={i}><span>{x.name}</span><span>{won(x.amount)}</span></div>)}</div>}
          </div>

          <div className="savebar">
            <div className="inner">
              {edit
                ? <button className="clr del" aria-label="지우기" onClick={remove}>{I.trash}</button>
                : <button className="clr" aria-label="입력 지우기" onClick={() => { reset(); toast("입력을 지웠어요"); }}>{I.undo}</button>}
              <button className={`save${amt ? "" : " dim"}`} disabled={saving} onClick={() => save(false)}>
                {saving ? <><span className="spin" />저장 중...</> : amt ? `${won(amt)}원 ${type} ${edit ? "고치기" : "저장"}` : "금액을 입력하세요"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {done && (
        <div className="saved-ov">
          <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="#10b981" strokeWidth="6" /><path d="M30 52l13 13 27-29" fill="none" stroke="#10b981" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <b>{done.title}</b><small>{done.sub}</small>
        </div>
      )}
    </>
  );
}

/* ───────────── 고정 항목 ───────────── */
function FixedView({ config, rec, setRec, call, toast, onDash }: {
  config: Config; rec: Rec[]; setRec: (r: Rec[]) => void; call: CallFn; toast: (m: string) => void; onDash: (d: Dash) => void;
}) {
  const [sheet, setSheet] = useState<Rec | "new" | null>(null);
  const [running, setRunning] = useState(false);
  const sum = (t: TxType) => rec.filter((x) => x.active && x.type === t).reduce((a, x) => a + x.amount, 0);

  const after = (r?: { list: Rec[]; dash?: Dash; n?: number }) => {
    if (!r) return;
    setRec(r.list);
    if (r.dash) onDash(r.dash);
  };
  const run = async () => {
    setRunning(true);
    const r = await call(api<{ n: number; list: Rec[]; dash: Dash }>("recurring/run", { method: "POST" }));
    setRunning(false);
    after(r);
    if (r) toast(r.n ? `${r.n}건 기록했어요` : "지금 기록할 항목이 없어요");
  };
  const toggle = async (it: Rec, on: boolean) => {
    const r = await call(api<{ n: number; list: Rec[]; dash: Dash }>(`recurring/${it.id}/toggle`, { body: { on } }));
    after(r);
    if (r) toast(on ? (r.n ? `켜졌어요 · ${r.n}건 기록` : "켜졌어요") : "꺼졌어요");
  };

  return (
    <div className="view grid-2">
      <div className="col">
        <div className="card">
          <h3>매달 고정으로 나가고 들어오는 돈</h3>
          <div className="fx-sum">
            <div><small>고정 지출</small><b className="amt exp">{man(sum("지출"))}</b></div>
            <div><small>고정 저축</small><b className="amt sav">{man(sum("저축"))}</b></div>
            <div><small>고정 수입</small><b className="amt inc">{man(sum("수입"))}</b></div>
          </div>
          <p className="muted" style={{ marginTop: 12 }}>정해진 날짜가 되면 그 달 가계부에 자동으로 기록돼요. 매일 아침 6시에 서버가 확인하고, 앱을 열 때도 한 번 더 확인해요. 빠진 달이 있으면 따라잡아 기록합니다.</p>
        </div>
        <div className="btn-row">
          <button className="btn pri" onClick={() => setSheet("new")}>+ 고정 항목 추가</button>
          <button className="btn ghost" disabled={running} onClick={run}>{running ? <><span className="spin" />처리 중</> : "지금 처리"}</button>
        </div>
      </div>
      <div className="col">
        <div className="card">
          {!rec.length ? (
            <div className="empty">아직 고정 항목이 없어요.<br />관리비, 통신비, 적금, 청약, 월급처럼<br />매달 같은 날 생기는 돈을 등록해 보세요.</div>
          ) : rec.map((it) => (
            <div className="fx" key={it.id} style={it.active ? undefined : { opacity: 0.55 }}>
              <div className="date"><small>매월</small><b>{it.day === 31 ? "말" : it.day}</b></div>
              <button className="mid" onClick={() => setSheet(it)}>
                <b>{icon(it.major)} {it.content || it.minor || it.major}<Badge it={it} /></b>
                <small>{it.type} · {it.minor || it.major}{it.end ? ` · ~${it.end}` : ""}</small>
              </button>
              <div style={{ textAlign: "right" }}>
                <div className={`amt ${cls(it.type)}`} style={{ marginBottom: 6 }}>{won(it.amount)}</div>
                <label className="sw"><input type="checkbox" checked={it.active} onChange={(e) => toggle(it, e.target.checked)} /><span /></label>
              </div>
            </div>
          ))}
        </div>
      </div>
      {sheet && <FixedSheet config={config} item={sheet === "new" ? null : sheet} close={() => setSheet(null)} call={call} toast={toast} after={after} />}
    </div>
  );
}

function FixedSheet({ config, item, close, call, toast, after }: {
  config: Config; item: Rec | null; close: () => void; call: CallFn; toast: (m: string) => void; after: (r?: { list: Rec[]; dash?: Dash }) => void;
}) {
  const nowYm = useMemo(() => {
    const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).formatToParts(new Date());
    return `${p.find((x) => x.type === "year")?.value}-${p.find((x) => x.type === "month")?.value}`;
  }, []);
  const [type, setType] = useState<TxType>(item?.type || "저축");
  const majorsOf = (t: TxType) => Object.keys(config.categories[t] || {});
  const [major, setMajor] = useState(item?.major || majorsOf("저축")[0] || "");
  const [minor, setMinor] = useState(item?.minor || (config.categories["저축"]?.[majorsOf("저축")[0]] || [])[0] || "");
  const [content, setContent] = useState(item?.content || "");
  const [amount, setAmount] = useState(item ? won(item.amount) : "");
  const [day, setDay] = useState(item?.day || 25);
  const [payment, setPayment] = useState(item?.payment || (config.payments.includes("계좌이체") ? "계좌이체" : config.payments[0] || ""));
  const [start, setStart] = useState(item?.start || nowYm);
  const [end, setEnd] = useState(item?.end || "");
  const [applyNow, setApplyNow] = useState(false);
  const [busy, setBusy] = useState(false);

  const changeType = (t: TxType) => {
    setType(t);
    const mj = majorsOf(t)[0] || "";
    setMajor(mj);
    setMinor((config.categories[t]?.[mj] || [])[0] || "");
  };
  const save = async () => {
    if (!Number(digits(amount))) return toast("금액을 입력하세요");
    if (!content.trim()) return toast("내용을 입력하세요");
    setBusy(true);
    const data = { active: item ? item.active : true, type, major, minor, content, amount: digits(amount), payment, nature: "고정지출", day, start, end, applyNow };
    const r = await call(api<{ list: Rec[]; dash: Dash; n: number }>(item ? `recurring/${item.id}` : "recurring", { method: item ? "PATCH" : "POST", body: data }));
    setBusy(false);
    if (r) { after(r); toast(r.n ? `저장했어요 · ${r.n}건 기록` : "저장했어요"); close(); }
  };
  const del = async () => {
    if (!item || !confirm(`"${item.content || item.minor}" 고정 항목을 삭제할까요?\n이미 기록된 내역은 남아 있어요.`)) return;
    const r = await call(api<{ list: Rec[] }>(`recurring/${item.id}`, { method: "DELETE" }));
    if (r) { after(r); toast("삭제했어요"); close(); }
  };

  return (
    <>
      <div className="sheet-bg" onClick={close} />
      <div className="sheet" role="dialog" aria-label="고정 항목">
        <div className="grab" />
        <h2>{item ? "고정 항목 수정" : "고정 항목 추가"}</h2>
        <div className="seg">{(["지출", "수입", "저축"] as TxType[]).map((t) => <button key={t} data-t={t} className={type === t ? "on" : ""} onClick={() => changeType(t)}>{t}</button>)}</div>
        <label className="flabel">내용</label>
        <input className="in" placeholder="예: 주택청약, 아파트 관리비, 월급" value={content} onChange={(e) => setContent(e.target.value)} />
        <label className="flabel">금액</label>
        <input className="in amount-in" inputMode="numeric" placeholder="0원" value={amount} onChange={(e) => { const v = digits(e.target.value); setAmount(v ? Number(v).toLocaleString("ko-KR") : ""); }} />
        <div className="grid2">
          <div><label className="flabel">대분류</label>
            <select className="in" value={major} onChange={(e) => { setMajor(e.target.value); setMinor((config.categories[type]?.[e.target.value] || [])[0] || ""); }}>
              {majorsOf(type).map((k) => <option key={k}>{k}</option>)}
            </select></div>
          <div><label className="flabel">소분류</label>
            <select className="in" value={minor} onChange={(e) => setMinor(e.target.value)}>
              {(config.categories[type]?.[major] || []).map((k) => <option key={k}>{k}</option>)}
            </select></div>
        </div>
        <div className="grid2">
          <div><label className="flabel">매월 날짜</label>
            <select className="in" value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d === 31 ? "말일" : `${d}일`}</option>)}
            </select></div>
          <div style={{ visibility: type === "수입" ? "hidden" : "visible" }}><label className="flabel">결제수단</label>
            <select className="in" value={payment} onChange={(e) => setPayment(e.target.value)}>
              {config.payments.map((p) => <option key={p}>{p}</option>)}
            </select></div>
        </div>
        <div className="grid2">
          <div><label className="flabel">시작 월</label><input className="in" type="month" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div><label className="flabel">종료 월 (선택)</label><input className="in" type="month" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
        </div>
        {!item && <label className="check"><input type="checkbox" checked={applyNow} onChange={(e) => setApplyNow(e.target.checked)} /> 이번 달 날짜가 지났어도 이번 달 것부터 기록</label>}
        <button className="btn pri" style={{ width: "100%", marginTop: 18 }} disabled={busy} onClick={save}>{busy ? <><span className="spin" />저장 중</> : "저장"}</button>
        {item && <button className="btn danger" style={{ width: "100%", marginTop: 10 }} onClick={del}>삭제</button>}
      </div>
    </>
  );
}

/* ───────────── 연간 정산 ───────────── */
function AnnualView({ years, initial, call }: { years: number[]; initial: number; call: CallFn }) {
  const [y, setY] = useState(initial);
  const [data, setData] = useState<Annual | null>(null);
  useEffect(() => {
    let alive = true;
    call(api<Annual>(`annual?y=${y}`)).then((d) => { if (alive && d) setData(d); });
    return () => { alive = false; };
  }, [y, call]);
  const ys = Array.from(new Set([...years, y, y - 1])).sort((a, b) => b - a);
  const d = data && data.year === y ? data : null;
  const tm = d ? Math.max(1, ...d.sections.flatMap((s) => s.months)) : 1;
  const sec = (t: TxType) => d?.sections.find((s) => s.type === t);

  return (
    <div className="view">
      <div className="filters" style={{ alignItems: "center" }}>
        {ys.map((v) => <button key={v} className={v === y ? "on" : ""} onClick={() => setY(v)}>{v}년</button>)}
        <a className="btn ghost sm" style={{ marginLeft: "auto" }} href={`/api/gagye/export?y=${y}`}>엑셀로 내려받기</a>
      </div>
      {!d ? <div className="skel" style={{ marginTop: 12 }} /> : (
        <>
          <div className="stat4" style={{ marginTop: 10 }}>
            <div className="stat"><small>연 수입</small><b className="amt inc">{won(d.income)}</b></div>
            <div className="stat"><small>연 지출</small><b className="amt exp">{won(d.expense)}</b></div>
            <div className="stat"><small>연 저축</small><b className="amt sav">{won(d.saving)}</b></div>
            <div className="stat"><small>연말 잔액 · 저축률 {Math.round(d.rate * 100)}%</small><b>{won(d.endBalance)}</b></div>
          </div>

          <div className="card">
            <h3>{y}년 월별 수입·지출·저축 <span className="keys"><span className="ki">수입</span><span className="ke">지출</span><span className="ks">저축</span></span></h3>
            <div className="trend" style={{ height: 160 }}>
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="m cur">
                  <div className="pair">
                    <i className="a" style={{ height: `${((sec("수입")?.months[i] || 0) / tm) * 100}%` }} />
                    <i className="b" style={{ height: `${((sec("지출")?.months[i] || 0) / tm) * 100}%` }} />
                    <i className="c" style={{ height: `${((sec("저축")?.months[i] || 0) / tm) * 100}%` }} />
                  </div>
                  <small>{i + 1}월</small>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>대분류별 월 합계 <small>연초 이월 {won(d.carry)}원</small></h3>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>대분류</th>{Array.from({ length: 12 }, (_, i) => <th key={i}>{i + 1}월</th>)}<th>합계</th><th>월평균</th></tr></thead>
                <tbody>
                  {d.sections.map((s) => (
                    <SectionRows key={s.type} s={s} />
                  ))}
                  <tr className="net"><td>순수지</td>{d.net.map((v, i) => <td key={i} className={v ? "" : "zero"}>{won(v)}</td>)}<td>{won(d.netTotal)}</td><td /></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3>연말정산 참고 집계 <small>1~12월 합계</small></h3>
            {d.tax.map((t) => (
              <div className="taxrow" key={t.label}><div>{t.label}{t.note && <small>{t.note}</small>}</div><b>{won(t.value)}원</b></div>
            ))}
            <p className="muted" style={{ marginTop: 10 }}>공제율·한도·요건은 해마다 바뀌어요. 홈택스 연말정산 간소화 자료와 대조해서 최종 확인하세요.</p>
          </div>
        </>
      )}
    </div>
  );
}

function SectionRows({ s }: { s: Annual["sections"][number] }) {
  return (
    <>
      {s.lines.map((l) => (
        <tr key={s.type + l.major}>
          <td>{icon(l.major)} {l.major}</td>
          {l.months.map((v, i) => <td key={i} className={v ? "" : "zero"}>{v ? won(v) : "-"}</td>)}
          <td><b>{won(l.total)}</b></td><td>{won(l.avg)}</td>
        </tr>
      ))}
      <tr className={`sub t-${s.type}`}><td>{s.type} 합계</td>{s.months.map((v, i) => <td key={i}>{won(v)}</td>)}<td>{won(s.total)}</td><td /></tr>
    </>
  );
}

/* ───────────── 설정 ───────────── */
function SettingsView({ config, setConfig, call, toast, years, afterImport }: {
  config: Config; setConfig: (c: Config) => void; call: CallFn; toast: (m: string) => void; years: number[]; afterImport: () => void;
}) {
  const [draft, setDraft] = useState<Config>(() => JSON.parse(JSON.stringify(config)));
  const [ctype, setCtype] = useState<TxType>("지출");
  const [newMajor, setNewMajor] = useState("");
  const [newSub, setNewSub] = useState<Record<string, string>>({});
  const [newPay, setNewPay] = useState("");
  const [pin, setPin] = useState({ current: "", next: "" });
  const [busy, setBusy] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const cats = draft.categories[ctype] || {};
  const upd = (fn: (c: Config) => void) => setDraft((d) => { const n: Config = JSON.parse(JSON.stringify(d)); fn(n); return n; });
  const budgetMajors = [...Object.keys(draft.categories["지출"] || {}), ...Object.keys(draft.categories["저축"] || {})];

  const save = async () => {
    setBusy(true);
    const r = await call(api<Config>("settings", { method: "PUT", body: draft }));
    setBusy(false);
    if (r) { setConfig(r); setDraft(JSON.parse(JSON.stringify(r))); toast("설정을 저장했어요"); }
  };
  const changePin = async () => {
    if (!/^\d{4}$/.test(pin.next)) return toast("새 비밀번호는 숫자 4자리");
    const r = await call(api("pin", { body: pin }));
    if (r) { setPin({ current: "", next: "" }); toast("비밀번호를 바꿨어요"); }
  };
  const doImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const form = new FormData();
    form.append("file", f);
    setImportMsg("가져오는 중...");
    const r = await call(api<{ result: { added: number; skipped: number; recurring: number; settings: boolean; sheets: string[] }; config: Config }>("import", { form }));
    if (!r) { setImportMsg(""); return; }
    const x = r.result;
    setImportMsg(`내역 ${x.added}건 추가${x.skipped ? `, 중복·빈 행 ${x.skipped}건 건너뜀` : ""}${x.recurring ? `, 고정 항목 ${x.recurring}개` : ""}${x.settings ? ", 카테고리·예산·이월금 반영" : ""}. ${x.sheets.join(" / ")}`);
    setConfig(r.config);
    setDraft(JSON.parse(JSON.stringify(r.config)));
    afterImport();
  };

  return (
    <div className="view grid-2">
      <div className="col">
        <div className="card">
          <h3>시작 잔액 · 월예산</h3>
          <div className="set-row"><span>가계부 시작 시점 잔액 (이월금)</span>
            <input className="in" inputMode="numeric" value={won(draft.startCarry)} onChange={(e) => upd((c) => { c.startCarry = Number(digits(e.target.value)) || 0; })} /></div>
          <p className="muted" style={{ margin: "6px 0 10px" }}>매달 잔액 = 시작 잔액 + 그동안의 (수입 − 지출 − 저축). 해가 바뀌어도 자동으로 이어져요.</p>
          {budgetMajors.map((k) => (
            <div className="set-row" key={k}><span>{icon(k)} {k}</span>
              <input className="in" inputMode="numeric" placeholder="예산 없음" value={draft.budgets[k] ? won(draft.budgets[k]) : ""}
                onChange={(e) => upd((c) => { const v = Number(digits(e.target.value)) || 0; if (v) c.budgets[k] = v; else delete c.budgets[k]; })} /></div>
          ))}
        </div>

        <div className="card">
          <h3>결제수단</h3>
          <div>{draft.payments.map((p) => <span className="tag" key={p}>{PAY_ICON[p] || "💠"} {p}<button aria-label={`${p} 삭제`} onClick={() => upd((c) => { c.payments = c.payments.filter((x) => x !== p); })}>×</button></span>)}</div>
          <div className="addline"><input className="in" placeholder="새 결제수단" value={newPay} onChange={(e) => setNewPay(e.target.value)} />
            <button className="btn ghost sm" onClick={() => { const v = newPay.trim(); if (v && !draft.payments.includes(v)) upd((c) => { c.payments.push(v); }); setNewPay(""); }}>추가</button></div>
        </div>

        <button className="btn pri" style={{ width: "100%", marginBottom: 14 }} disabled={busy} onClick={save}>{busy ? <><span className="spin" />저장 중</> : "설정 저장"}</button>

        <div className="card">
          <h3>비밀번호 변경</h3>
          <div className="grid2">
            <input className="in" type="password" inputMode="numeric" maxLength={4} placeholder="현재 비밀번호" value={pin.current} onChange={(e) => setPin({ ...pin, current: digits(e.target.value) })} />
            <input className="in" type="password" inputMode="numeric" maxLength={4} placeholder="새 비밀번호 4자리" value={pin.next} onChange={(e) => setPin({ ...pin, next: digits(e.target.value) })} />
          </div>
          <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={changePin}>바꾸기</button>
        </div>

        <div className="card">
          <h3>데이터 가져오기 · 내보내기</h3>
          <p className="muted">구글 시트 가계부(가계365)를 <b>파일 &gt; 다운로드 &gt; Microsoft Excel(.xlsx)</b>로 받아서 올리면 월별 내역, 고정 항목, 카테고리·예산·이월금을 가져와요. 이미 있는 내역은 건너뜁니다.</p>
          <div className="btn-row" style={{ marginTop: 12, marginBottom: 0 }}>
            <button className="btn ghost sm" onClick={() => fileRef.current?.click()}>엑셀 가져오기</button>
            <input ref={fileRef} type="file" accept=".xlsx" style={{ display: "none" }} onChange={doImport} />
            <a className="btn ghost sm" href={`/api/gagye/export?y=${years[years.length - 1] || ""}`}>올해 엑셀 내려받기</a>
          </div>
          {importMsg && <p className="muted" style={{ marginTop: 10 }}>{importMsg}</p>}
        </div>
      </div>

      <div className="col">
        <CardHookCard config={config} call={call} toast={toast} />
        <div className="card">
          <h3>카테고리 편집</h3>
          <div className="seg">{(["지출", "수입", "저축"] as TxType[]).map((t) => <button key={t} data-t={t} className={ctype === t ? "on" : ""} onClick={() => setCtype(t)}>{t}</button>)}</div>
          <div style={{ marginTop: 10 }}>
            {Object.entries(cats).map(([mj, subs]) => (
              <div className="catedit" key={mj}>
                <header><span>{icon(mj)} {mj}</span>
                  <button className="link" style={{ color: "var(--exp)" }} onClick={() => { if (confirm(`'${mj}' 대분류를 지울까요? (기존 내역은 그대로 남아요)`)) upd((c) => { delete c.categories[ctype][mj]; }); }}>대분류 삭제</button></header>
                <div>{subs.map((s) => <span className="tag" key={s}>{s}<button aria-label={`${s} 삭제`} onClick={() => upd((c) => { c.categories[ctype][mj] = c.categories[ctype][mj].filter((x) => x !== s); })}>×</button></span>)}</div>
                <div className="addline">
                  <input className="in" placeholder="소분류 추가" value={newSub[mj] || ""} onChange={(e) => setNewSub({ ...newSub, [mj]: e.target.value })} />
                  <button className="btn ghost sm" onClick={() => { const v = (newSub[mj] || "").trim(); if (v) upd((c) => { if (!c.categories[ctype][mj].includes(v)) c.categories[ctype][mj].push(v); }); setNewSub({ ...newSub, [mj]: "" }); }}>추가</button>
                </div>
              </div>
            ))}
            <div className="addline">
              <input className="in" placeholder={`새 ${ctype} 대분류`} value={newMajor} onChange={(e) => setNewMajor(e.target.value)} />
              <button className="btn ghost sm" onClick={() => { const v = newMajor.trim(); if (v) upd((c) => { c.categories[ctype] = c.categories[ctype] || {}; if (!c.categories[ctype][v]) c.categories[ctype][v] = []; }); setNewMajor(""); }}>대분류 추가</button>
            </div>
          </div>
          <p className="muted" style={{ marginTop: 10 }}>바꾼 뒤 왼쪽의 [설정 저장]을 눌러야 반영돼요.</p>
        </div>
      </div>
    </div>
  );
}

/* ───────────── 카드 결제 자동 기록 (안드로이드) ───────────── */
type HookInfo = { key: string; payment: string; log: { at: string; text: string; result: string; detail: string }[] };
type HookPreview = {
  parsed: { kind: string; reason?: string; amount: number; date: string; time: string; merchant: string; card: string; installment: string };
  guess: { major: string; minor: string; how: string } | null;
};

function CardHookCard({ config, call, toast }: { config: Config; call: CallFn; toast: (m: string) => void }) {
  const [info, setInfo] = useState<HookInfo | null>(null);
  const [show, setShow] = useState(false);
  const [guide, setGuide] = useState(false);
  const [sample, setSample] = useState("");
  const [preview, setPreview] = useState<HookPreview | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/api/gagye/hook`;

  useEffect(() => {
    let alive = true;
    call(api<HookInfo>("hook/config")).then((r) => { if (alive && r) setInfo(r); });
    return () => { alive = false; };
  }, [call]);

  const copy = async (v: string, what: string) => {
    try { await navigator.clipboard.writeText(v); toast(`${what}를 복사했어요`); } catch { toast("복사하지 못했어요. 길게 눌러 복사해 주세요"); }
  };
  const rotate = async () => {
    if (!confirm("새 키를 만들면 휴대폰에 넣어 둔 예전 키는 더 이상 작동하지 않아요. 바꿀까요?")) return;
    const r = await call(api<HookInfo>("hook/rotate", { method: "POST" }));
    if (r) { setInfo(r); setShow(true); toast("새 키를 만들었어요"); }
  };
  const setPay = async (p: string) => {
    if (!info) return;
    setInfo({ ...info, payment: p });
    await call(api("hook/payment", { body: { payment: p } }));
  };
  const test = async () => {
    if (!sample.trim()) return toast("알림 내용을 붙여 넣어 주세요");
    const r = await call(api<HookPreview>("hook/test", { body: { text: sample } }));
    if (r) setPreview(r);
  };
  const refreshLog = async () => {
    const r = await call(api<HookInfo>("hook/config"));
    if (r) setInfo(r);
  };

  const masked = info ? (show ? info.key : `${info.key.slice(0, 4)}${"•".repeat(14)}`) : "...";
  const p = preview?.parsed;

  return (
    <div className="card">
      <h3>💳 카드 결제 자동 기록 <small>안드로이드</small></h3>
      <p className="muted">농협카드 앱(NH pay) 알림이나 결제 문자를 휴대폰이 아래 주소로 보내면, 금액·날짜·가맹점을 읽어 지출로 바로 기록해요. 카드번호는 저장하지 않아요.</p>

      <label className="flabel">받는 주소 (URL)</label>
      <div className="addline"><input className="in" readOnly value={url} onFocus={(e) => e.target.select()} /><button className="btn ghost sm" onClick={() => copy(url, "주소")}>복사</button></div>
      <label className="flabel">헤더 이름 <b style={{ color: "var(--ink)" }}>X-Gagye-Key</b> 에 넣을 비밀 키</label>
      <div className="addline">
        <input className="in" readOnly value={masked} style={{ fontFamily: "monospace" }} />
        <button className="btn ghost sm" onClick={() => setShow(!show)}>{show ? "숨기기" : "보기"}</button>
        <button className="btn ghost sm" disabled={!info} onClick={() => info && copy(info.key, "키")}>복사</button>
      </div>
      <button className="link" style={{ marginTop: 6, color: "var(--exp)" }} onClick={rotate}>키 새로 만들기 (휴대폰을 잃어버렸을 때)</button>

      <label className="flabel">카드 종류를 알 수 없을 때 결제수단</label>
      <div className="pills">
        {config.payments.map((x) => <button key={x} className={`pill${info?.payment === x ? " on" : ""}`} onClick={() => setPay(x)}>{PAY_ICON[x] || "💠"} {x}</button>)}
      </div>

      <div className="gap" />
      <button className="btn ghost sm" onClick={() => setGuide(!guide)}>{guide ? "설정 방법 닫기" : "휴대폰 설정 방법 (MacroDroid)"}</button>
      {guide && (
        <ol className="muted" style={{ paddingLeft: 18, lineHeight: 1.7, marginTop: 10 }}>
          <li>Play 스토어에서 <b>MacroDroid</b> 설치 → 알림 접근·SMS 권한 허용</li>
          <li>매크로 추가 → <b>트리거</b>: 알림 수신 → 앱 <b>NH pay(농협카드)</b> → 텍스트에 <b>승인</b> 포함<br />(문자 서비스를 쓰면: SMS 수신 → 내용에 <b>농협</b> 포함)</li>
          <li><b>동작</b>: HTTP 요청 → 방식 <b>POST</b> → URL에 위 주소</li>
          <li>헤더 추가: 이름 <b>X-Gagye-Key</b>, 값은 위 비밀 키</li>
          <li>본문(Body): 콘텐츠 유형 <b>text/plain</b> → 오른쪽 ··· 에서 <b>알림 제목</b>과 <b>알림 텍스트</b>(SMS면 <b>SMS 메시지</b>) 넣기</li>
          <li>저장 후 휴대폰 설정 → 배터리 → MacroDroid를 <b>절전 예외(제한 없음)</b>로</li>
          <li>카드를 한 번 쓰고 아래 <b>최근 받은 알림</b>에 &lsquo;기록&rsquo;이 뜨면 완료</li>
        </ol>
      )}

      <div className="gap" />
      <label className="flabel">알림 읽기 테스트 (실제 문자를 붙여 넣어 보세요 — 저장되지 않아요)</label>
      <textarea className="in" rows={4} style={{ resize: "vertical", fontSize: 14 }} placeholder={"예)\nNH카드1*2*승인\n박*정\n15,000원 체크\n10/28 12:31\n김밥천국 동해점"} value={sample} onChange={(e) => setSample(e.target.value)} />
      <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={test}>읽어 보기</button>
      {p && (
        <div className="items" style={{ display: "block" }}>
          {p.kind === "ignore" ? <div><span>기록 안 함</span><span>{p.reason}</span></div> : (
            <>
              <div><span>처리</span><b>{p.kind === "cancel" ? "승인 취소 → 해당 지출 삭제" : "지출로 기록"}</b></div>
              <div><span>금액</span><b>{won(p.amount)}원</b></div>
              <div><span>날짜</span><span>{p.date} {p.time}</span></div>
              <div><span>가맹점</span><span>{p.merchant || "(못 찾음)"}</span></div>
              {p.card && <div><span>카드</span><span>{p.card}{p.installment ? ` · ${p.installment}` : ""}</span></div>}
              {preview?.guess && <div><span>분류</span><span>{icon(preview.guess.major)} {preview.guess.major} / {preview.guess.minor} ({preview.guess.how})</span></div>}
            </>
          )}
        </div>
      )}

      <div className="gap" />
      <div className="sec"><span>최근 받은 알림</span><button className="link" onClick={refreshLog}>새로고침</button></div>
      {!info?.log.length ? <p className="muted">아직 받은 알림이 없어요.</p> : (
        <div>
          {info.log.slice(0, 8).map((l, i) => (
            <div key={i} className="taxrow" style={{ fontSize: 13 }}>
              <div style={{ minWidth: 0 }}>
                {l.detail || l.text}
                <small>{new Date(l.at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small>
              </div>
              <b style={{ color: l.result === "기록" || l.result === "취소 반영" ? "var(--sav)" : "var(--sub)" }}>{l.result}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
