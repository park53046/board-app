/**
 * 가계365 서버 로직 — 설정, 거래 내역, 대시보드, 고정 항목, 연간 정산
 * 모든 날짜는 한국 시간(Asia/Seoul) 기준 문자열(YYYY-MM-DD)로 다룹니다.
 */
import { prisma } from "@/lib/db";
import { DEFAULT_CONFIG, TYPES, type GagyeConfig } from "./defaults";

/* ───────────── 테이블 준비 (운영 DB에 마이그레이션을 따로 돌리지 않아도 되게) ───────────── */
const DDL = [
  `CREATE TABLE IF NOT EXISTS "GagyeTx" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "date" TEXT NOT NULL, "year" INTEGER NOT NULL, "month" INTEGER NOT NULL, "type" TEXT NOT NULL, "major" TEXT NOT NULL, "minor" TEXT NOT NULL DEFAULT '', "content" TEXT NOT NULL DEFAULT '', "amount" INTEGER NOT NULL, "payment" TEXT NOT NULL DEFAULT '', "nature" TEXT NOT NULL DEFAULT '', "memo" TEXT NOT NULL DEFAULT '', "receiptId" INTEGER, "recurringId" INTEGER, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS "GagyeReceipt" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "mime" TEXT NOT NULL, "data" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS "GagyeRecurring" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "active" BOOLEAN NOT NULL DEFAULT true, "type" TEXT NOT NULL, "major" TEXT NOT NULL, "minor" TEXT NOT NULL DEFAULT '', "content" TEXT NOT NULL DEFAULT '', "amount" INTEGER NOT NULL, "payment" TEXT NOT NULL DEFAULT '', "nature" TEXT NOT NULL DEFAULT '', "day" INTEGER NOT NULL, "start" TEXT NOT NULL, "end" TEXT NOT NULL DEFAULT '', "last" TEXT NOT NULL DEFAULT '', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS "GagyeSetting" ("key" TEXT NOT NULL PRIMARY KEY, "value" TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS "GagyeTx_year_month_idx" ON "GagyeTx"("year", "month")`,
  `CREATE INDEX IF NOT EXISTS "GagyeTx_date_idx" ON "GagyeTx"("date")`,
];
let ready: Promise<void> | null = null;
export function ensureTables(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      for (const sql of DDL) await prisma.$executeRawUnsafe(sql);
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

/* ───────────── 날짜 (한국 시간) ───────────── */
export function kstNow() {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value);
  const y = get("year"), m = get("month"), d = get("day");
  return { y, m, d, ymd: `${y}-${pad(m)}-${pad(d)}`, ym: `${y}-${pad(m)}` };
}
export const pad = (n: number) => String(n).padStart(2, "0");
export const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
export function parseYmd(s: unknown): { y: number; m: number; d: number; ymd: string } | null {
  const mm = String(s ?? "").match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (!mm) return null;
  const y = +mm[1], m = +mm[2], d = +mm[3];
  if (m < 1 || m > 12 || d < 1 || d > lastDay(y, m)) return null;
  return { y, m, d, ymd: `${y}-${pad(m)}-${pad(d)}` };
}
function nextYm(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
}

/* ───────────── 설정 ───────────── */
async function getSetting<T>(key: string, fallback: T): Promise<T> {
  await ensureTables();
  const row = await prisma.gagyeSetting.findUnique({ where: { key } });
  if (!row) return fallback;
  try { return JSON.parse(row.value) as T; } catch { return fallback; }
}
async function setSetting(key: string, value: unknown) {
  await ensureTables();
  const v = JSON.stringify(value);
  await prisma.gagyeSetting.upsert({ where: { key }, create: { key, value: v }, update: { value: v } });
}
export { getSetting, setSetting };

export async function getConfig(): Promise<GagyeConfig> {
  const c = await getSetting<Partial<GagyeConfig>>("config", {});
  return { ...DEFAULT_CONFIG, ...c };
}

export async function saveConfig(input: Partial<GagyeConfig>): Promise<GagyeConfig> {
  const cur = await getConfig();
  const next: GagyeConfig = { ...cur };
  if (input.categories && typeof input.categories === "object") {
    const cats: GagyeConfig["categories"] = {};
    for (const t of TYPES) {
      cats[t] = {};
      const src: Record<string, unknown> = (input.categories as Record<string, Record<string, unknown>>)[t] || {};
      for (const [major, subs] of Object.entries(src) as [string, unknown][]) {
        const name = String(major).trim();
        if (!name) continue;
        cats[t][name] = Array.from(new Set((Array.isArray(subs) ? subs : []).map((s) => String(s).trim()).filter(Boolean)));
      }
    }
    next.categories = cats;
  }
  if (Array.isArray(input.payments)) next.payments = input.payments.map(String).map((s) => s.trim()).filter(Boolean);
  if (Array.isArray(input.natures)) next.natures = input.natures.map(String).map((s) => s.trim()).filter(Boolean);
  if (input.budgets && typeof input.budgets === "object") {
    next.budgets = {};
    for (const [k, v] of Object.entries(input.budgets)) {
      const n = Math.round(Number(v) || 0);
      if (n > 0) next.budgets[k] = n;
    }
  }
  if (input.startCarry !== undefined) next.startCarry = Math.round(Number(input.startCarry) || 0);
  if (Array.isArray(input.salarySubs)) next.salarySubs = input.salarySubs.map(String).filter(Boolean);
  await setSetting("config", next);
  return next;
}

/* ───────────── 거래 내역 ───────────── */
export type TxInput = {
  type: string; date: string; amount: number | string; content?: string; major: string; minor?: string;
  payment?: string; nature?: string; memo?: string;
};

function normalizeTx(e: TxInput) {
  const d = parseYmd(e.date);
  if (!d) throw new Error("날짜 형식이 올바르지 않습니다.");
  if (!(TYPES as readonly string[]).includes(e.type)) throw new Error("구분이 올바르지 않습니다.");
  const amount = Math.round(Number(String(e.amount).replace(/[^\d.-]/g, "")) || 0);
  if (amount <= 0) throw new Error("금액을 입력하세요.");
  if (!String(e.major || "").trim()) throw new Error("대분류를 고르세요.");
  return {
    date: d.ymd, year: d.y, month: d.m, type: e.type, amount,
    major: String(e.major).trim(), minor: String(e.minor || "").trim(), content: String(e.content || "").trim().slice(0, 200),
    payment: e.type === "수입" ? "" : String(e.payment || "").trim(),
    nature: e.type === "지출" ? String(e.nature || "").trim() : "",
    memo: String(e.memo || "").trim().slice(0, 300),
  };
}

export async function createTx(e: TxInput, opts: { force?: boolean; receipt?: { b64: string; mime: string } } = {}) {
  await ensureTables();
  const t = normalizeTx(e);
  if (!opts.force) {
    const dup = await prisma.gagyeTx.findFirst({ where: { date: t.date, type: t.type, amount: t.amount, content: t.content } });
    if (dup) return { duplicate: true as const };
  }
  let receiptId: number | null = null;
  if (opts.receipt?.b64) {
    if (opts.receipt.b64.length > 4_000_000) throw new Error("영수증 파일이 너무 큽니다.");
    const mime = /^(image\/(jpeg|png|webp)|application\/pdf)$/.test(opts.receipt.mime) ? opts.receipt.mime : "image/jpeg";
    const r = await prisma.gagyeReceipt.create({ data: { mime, data: opts.receipt.b64 } });
    receiptId = r.id;
  }
  const row = await prisma.gagyeTx.create({ data: { ...t, receiptId } });
  return { ok: true as const, tx: row };
}

export async function updateTx(id: number, e: TxInput) {
  await ensureTables();
  const t = normalizeTx(e);
  const row = await prisma.gagyeTx.update({ where: { id }, data: t });
  return row;
}

export async function deleteTx(id: number) {
  await ensureTables();
  const row = await prisma.gagyeTx.findUnique({ where: { id } });
  if (!row) return;
  await prisma.gagyeTx.delete({ where: { id } });
  if (row.receiptId) {
    const still = await prisma.gagyeTx.count({ where: { receiptId: row.receiptId } });
    if (!still) await prisma.gagyeReceipt.delete({ where: { id: row.receiptId } }).catch(() => {});
  }
}

export async function getReceipt(id: number) {
  await ensureTables();
  return prisma.gagyeReceipt.findUnique({ where: { id } });
}

/* ───────────── 대시보드 ───────────── */
const signed = (type: string, amount: number) => (type === "수입" ? amount : -amount);

async function carryBefore(ymd: string, startCarry: number) {
  const rows = await prisma.gagyeTx.groupBy({ by: ["type"], where: { date: { lt: ymd } }, _sum: { amount: true } });
  return rows.reduce((a, r) => a + signed(r.type, r._sum.amount || 0), startCarry);
}

export async function getDashboard(y: number, m: number) {
  await ensureTables();
  const cfg = await getConfig();
  const now = kstNow();
  const days = lastDay(y, m);
  const [txs, carry, yearRows] = await Promise.all([
    prisma.gagyeTx.findMany({ where: { year: y, month: m }, orderBy: [{ date: "desc" }, { id: "desc" }] }),
    carryBefore(`${y}-${pad(m)}-01`, cfg.startCarry),
    prisma.gagyeTx.groupBy({ by: ["month", "type"], where: { year: y }, _sum: { amount: true } }),
  ]);

  let income = 0, expense = 0, saving = 0;
  const daily = new Array(days).fill(0);
  const byMajor: Record<string, number> = {};
  const byPay: Record<string, number> = {};
  for (const t of txs) {
    if (t.type === "수입") income += t.amount;
    else if (t.type === "저축") saving += t.amount;
    else {
      expense += t.amount;
      const dd = Number(t.date.slice(8, 10));
      if (dd >= 1 && dd <= days) daily[dd - 1] += t.amount;
      byMajor[t.major] = (byMajor[t.major] || 0) + t.amount;
      const p = t.payment || "기타";
      byPay[p] = (byPay[p] || 0) + t.amount;
    }
  }
  const majors = Object.keys(cfg.categories["지출"] || {});
  for (const k of Object.keys(byMajor)) if (!majors.includes(k)) majors.push(k);

  const trend = Array.from({ length: 12 }, (_, i) => ({ m: i + 1, income: 0, expense: 0, saving: 0 }));
  for (const r of yearRows) {
    const t = trend[r.month - 1];
    if (!t) continue;
    const v = r._sum.amount || 0;
    if (r.type === "수입") t.income += v; else if (r.type === "저축") t.saving += v; else t.expense += v;
  }

  return {
    year: y, month: m, carry, income, expense, saving,
    balance: carry + income - expense - saving,
    rate: income ? saving / income : 0,
    days, daily,
    cats: majors.map((k) => ({ name: k, amount: byMajor[k] || 0, budget: cfg.budgets[k] || 0 })),
    totalBudget: Object.keys(cfg.categories["지출"] || {}).reduce((a, k) => a + (cfg.budgets[k] || 0), 0),
    byPay: Object.entries(byPay).map(([name, amount]) => ({ name, amount })),
    trend,
    isCurrent: y === now.y && m === now.m,
    today: now.d,
    txs: txs.map((t) => ({
      id: t.id, date: t.date, type: t.type, major: t.major, minor: t.minor, content: t.content, amount: t.amount,
      payment: t.payment, nature: t.nature, memo: t.memo, receiptId: t.receiptId, auto: !!t.recurringId,
    })),
  };
}

export async function getYears() {
  await ensureTables();
  const rows = await prisma.gagyeTx.groupBy({ by: ["year"] });
  const ys = new Set(rows.map((r) => r.year));
  ys.add(kstNow().y);
  return Array.from(ys).sort((a, b) => a - b);
}

/* ───────────── 고정 항목 ───────────── */
export type RecurringInput = {
  active?: boolean; type: string; major: string; minor?: string; content?: string; amount: number | string;
  payment?: string; nature?: string; day: number | string; start?: string; end?: string; applyNow?: boolean;
};

const YM = /^\d{4}-\d{2}$/;

export async function listRecurring() {
  await ensureTables();
  const now = kstNow();
  const ld = lastDay(now.y, now.m);
  const rows = await prisma.gagyeRecurring.findMany({ orderBy: [{ day: "asc" }, { id: "asc" }] });
  return rows.map((r) => {
    const target = Math.min(r.day, ld);
    const inRange = (!r.start || now.ym >= r.start) && (!r.end || now.ym <= r.end);
    return {
      id: r.id, active: r.active, type: r.type, major: r.major, minor: r.minor, content: r.content, amount: r.amount,
      payment: r.payment, nature: r.nature, day: r.day, start: r.start, end: r.end, last: r.last,
      target, inRange, done: r.last >= now.ym, dleft: target - now.d,
    };
  });
}

export async function saveRecurring(id: number | null, it: RecurringInput) {
  await ensureTables();
  if (!(TYPES as readonly string[]).includes(it.type)) throw new Error("구분이 올바르지 않습니다.");
  const amount = Math.round(Number(String(it.amount).replace(/[^\d.-]/g, "")) || 0);
  if (amount <= 0) throw new Error("금액을 입력하세요.");
  const day = Math.min(31, Math.max(1, Math.round(Number(it.day) || 1)));
  const now = kstNow();
  const start = YM.test(String(it.start || "")) ? String(it.start) : now.ym;
  const end = YM.test(String(it.end || "")) ? String(it.end) : "";
  const data = {
    active: it.active !== false, type: it.type, major: String(it.major || "").trim(), minor: String(it.minor || "").trim(),
    content: String(it.content || "").trim(), amount, day, start, end,
    payment: it.type === "수입" ? "" : String(it.payment || "").trim(),
    nature: it.type === "지출" ? String(it.nature || "고정지출") : "",
  };
  if (!data.major) throw new Error("대분류를 고르세요.");
  if (id) {
    await prisma.gagyeRecurring.update({ where: { id }, data });
  } else {
    // 새 항목: 이번 달 날짜가 이미 지났고 '바로 기록'이 아니면 다음 달부터
    // (시작 월을 지난달 이전으로 고르면 그 달부터 빠진 달을 채워 기록)
    let last = "";
    if (!it.applyNow && start === now.ym && now.d >= Math.min(day, lastDay(now.y, now.m))) last = now.ym;
    await prisma.gagyeRecurring.create({ data: { ...data, last } });
  }
  return processRecurring();
}

export async function deleteRecurring(id: number) {
  await ensureTables();
  await prisma.gagyeRecurring.delete({ where: { id } }).catch(() => {});
}

export async function toggleRecurring(id: number, on: boolean) {
  await ensureTables();
  await prisma.gagyeRecurring.update({ where: { id }, data: { active: on } });
  return on ? processRecurring() : 0;
}

/** 기록할 차례가 된 고정 항목을 기록 (빠진 달도 따라잡음). 기록한 건수 반환 */
export async function processRecurring(): Promise<number> {
  await ensureTables();
  const now = kstNow();
  const items = await prisma.gagyeRecurring.findMany({ where: { active: true } });
  let n = 0;
  for (const it of items) {
    let ym = it.last && it.last >= it.start ? nextYm(it.last) : it.start;
    let guard = 0;
    while (ym <= now.ym && guard++ < 36) {
      if (it.end && ym > it.end) break;
      const [y, m] = ym.split("-").map(Number);
      const target = Math.min(it.day, lastDay(y, m));
      if (ym === now.ym && now.d < target) break;
      // 먼저 '최근 처리 월'을 선점해서 동시에 두 번 기록되는 것을 막음
      const claim = await prisma.gagyeRecurring.updateMany({ where: { id: it.id, last: it.last }, data: { last: ym } });
      if (claim.count !== 1) break;
      it.last = ym;
      await prisma.gagyeTx.create({
        data: {
          date: `${ym}-${pad(target)}`, year: y, month: m, type: it.type, major: it.major, minor: it.minor,
          content: it.content, amount: it.amount, payment: it.payment,
          nature: it.type === "지출" ? it.nature || "고정지출" : "", memo: "[자동] 고정항목", recurringId: it.id,
        },
      });
      n++;
      ym = nextYm(ym);
    }
  }
  return n;
}

/* ───────────── 연간 정산 ───────────── */
export async function getAnnual(y: number) {
  await ensureTables();
  const cfg = await getConfig();
  const [rows, txs, carry] = await Promise.all([
    prisma.gagyeTx.groupBy({ by: ["type", "major", "month"], where: { year: y }, _sum: { amount: true } }),
    prisma.gagyeTx.findMany({ where: { year: y }, select: { type: true, minor: true, payment: true, amount: true } }),
    carryBefore(`${y}-01-01`, cfg.startCarry),
  ]);

  const sections = TYPES.map((t) => {
    const majors = Object.keys(cfg.categories[t] || {});
    for (const r of rows) if (r.type === t && !majors.includes(r.major)) majors.push(r.major);
    const lines = majors.map((major) => {
      const months = new Array(12).fill(0);
      for (const r of rows) if (r.type === t && r.major === major) months[r.month - 1] += r._sum.amount || 0;
      const total = months.reduce((a, b) => a + b, 0);
      const active = months.filter((v) => v > 0).length;
      return { major, months, total, avg: active ? Math.round(total / active) : 0 };
    });
    const months = new Array(12).fill(0);
    lines.forEach((l) => l.months.forEach((v, i) => (months[i] += v)));
    const total = months.reduce((a, b) => a + b, 0);
    return { type: t, lines: lines.filter((l) => l.total > 0 || (cfg.categories[t] || {})[l.major]), months, total };
  });
  const sec = (t: string) => sections.find((s) => s.type === t)!;
  const net = sec("수입").months.map((v, i) => v - sec("지출").months[i] - sec("저축").months[i]);

  const sum = (f: (x: (typeof txs)[number]) => boolean) => txs.filter(f).reduce((a, x) => a + x.amount, 0);
  const exp = (x: (typeof txs)[number]) => x.type === "지출";
  const salary = sum((x) => x.type === "수입" && cfg.salarySubs.includes(x.minor));
  const card = (p: string) => sum((x) => exp(x) && x.payment === p);
  const usedCards = card("신용카드") + card("체크카드") + card("현금") + card("간편결제");
  const tax = [
    { label: "급여 수입 합계 (총급여 추정)", value: salary, note: "급여·상여·수당 소분류 기준" },
    { label: "카드 공제 문턱 (총급여의 25%)", value: Math.round(salary * 0.25), note: "이 금액을 넘는 사용분부터 소득공제" },
    { label: "신용카드 사용액", value: card("신용카드"), note: "" },
    { label: "체크카드 사용액", value: card("체크카드"), note: "신용카드보다 공제율 높음" },
    { label: "현금 사용액", value: card("현금"), note: "현금영수증 발급분만 공제" },
    { label: "간편결제 사용액", value: card("간편결제"), note: "연결 수단에 따라 구분" },
    { label: "카드 등 사용액 − 문턱", value: usedCards - Math.round(salary * 0.25), note: "양수면 공제 구간 진입" },
    { label: "대중교통", value: sum((x) => exp(x) && x.minor === "대중교통"), note: "높은 공제율 항목" },
    { label: "의료비", value: sum((x) => exp(x) && x.minor === "병원/약"), note: "총급여 3% 초과분 세액공제" },
    { label: "교육비", value: sum((x) => exp(x) && (x.minor === "교육비" || x.minor === "학원비")), note: "대상 여부 확인 필요" },
    { label: "보험료", value: sum((x) => exp(x) && (x.minor === "보험" || x.minor === "자동차보험")), note: "보장성 보험" },
    { label: "기부금", value: sum((x) => exp(x) && x.minor === "기부"), note: "영수증 보관" },
    { label: "월세", value: sum((x) => exp(x) && x.minor === "월세"), note: "요건 충족 시 세액공제" },
    { label: "주택청약 납입", value: sum((x) => x.type === "저축" && x.minor === "주택청약"), note: "무주택 세대주 요건" },
    { label: "연금저축 납입", value: sum((x) => x.type === "저축" && x.minor === "연금"), note: "세액공제" },
  ];
  const income = sec("수입").total, expense = sec("지출").total, saving = sec("저축").total;
  return {
    year: y, carry, income, expense, saving, net, netTotal: income - expense - saving,
    endBalance: carry + income - expense - saving, rate: income ? saving / income : 0,
    sections, tax,
  };
}
