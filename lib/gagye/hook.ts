/**
 * 카드 결제 알림 → 가계부 자동 기록
 * 휴대폰(안드로이드 MacroDroid 등)이 카드 승인 문자/앱 알림 내용을 POST 하면
 * 금액·날짜·가맹점을 읽어서 지출로 기록합니다. 카드번호는 저장하지 않습니다(끝자리 표기만 메모에).
 */
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { ensureTables, getConfig, getSetting, kstNow, lastDay, pad, setSetting } from "./core";
import type { GagyeConfig } from "./defaults";

/* ───────────── 설정 ───────────── */
export type HookConfig = { key: string; payment: string };
export type HookLog = { at: string; text: string; result: string; detail: string };

export async function getHookConfig(rotate = false): Promise<HookConfig> {
  const cur = await getSetting<Partial<HookConfig>>("hook", {});
  let key = cur.key || "";
  if (!key || rotate) key = crypto.randomBytes(18).toString("base64url");
  const cfg: HookConfig = { key, payment: cur.payment || "체크카드" };
  if (cfg.key !== cur.key || cfg.payment !== cur.payment) await setSetting("hook", cfg);
  return cfg;
}

export async function setHookPayment(payment: string) {
  const cfg = await getHookConfig();
  await setSetting("hook", { ...cfg, payment: String(payment || "체크카드") });
}

export async function checkHookKey(given: string): Promise<boolean> {
  const cur = await getSetting<Partial<HookConfig>>("hook", {});
  if (!cur.key || !given) return false;
  const a = Buffer.from(given), b = Buffer.from(cur.key);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function getHookLog(): Promise<HookLog[]> {
  return getSetting<HookLog[]>("hookLog", []);
}
async function addLog(text: string, result: string, detail: string) {
  const log = await getHookLog();
  log.unshift({ at: new Date().toISOString(), text: text.slice(0, 240), result, detail: detail.slice(0, 200) });
  await setSetting("hookLog", log.slice(0, 30));
}

/* ───────────── 문자/알림 해석 ───────────── */
export type Parsed = {
  kind: "approve" | "cancel" | "ignore";
  reason?: string;
  amount: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  merchant: string;
  card: string; // 예: 농협체크(1234)
  credit: boolean | null; // 신용이면 true, 체크면 false, 모르면 null
  installment: string; // 예: 3개월
};

export function parseCardText(raw: string): Parsed {
  const now = kstNow();
  const text = String(raw || "").replace(/\r/g, "").replace(/\[Web발신\]/gi, "").trim();
  const flat = text.replace(/\s+/g, " ");
  const base: Parsed = { kind: "ignore", amount: 0, date: now.ymd, time: "", merchant: "", card: "", credit: null, installment: "" };

  if (/\(광고\)|무료수신거부/.test(flat) || (!/승인|취소/.test(flat) && /이벤트|혜택|안내|당첨|프로모션/.test(flat))) return { ...base, reason: "광고·안내 문자예요" };
  const hasDateTime = /\d{1,2}[/.-]\d{1,2}\s*(?:\([^)]*\))?\s*\d{1,2}:\d{2}/.test(flat);
  const isCancel = /취소|승인거절|거절/.test(flat);
  const isApprove = /승인/.test(flat) || (/결제|사용/.test(flat) && hasDateTime);
  if (!isCancel && !isApprove) return { ...base, reason: "승인/취소 알림이 아니에요" };
  if (/거절/.test(flat)) return { ...base, reason: "승인 거절 알림이에요" };
  if (/(USD|US\$|EUR|JPY|해외)/i.test(flat) && !/원/.test(flat)) return { ...base, reason: "해외 결제(외화)는 직접 입력해 주세요" };

  // 금액: '누적', '잔액', '한도' 바로 뒤의 금액은 제외
  let amount = 0;
  const amtRe = /([\d,]{1,12})\s*원/g;
  let m: RegExpExecArray | null;
  while ((m = amtRe.exec(flat))) {
    const before = flat.slice(Math.max(0, m.index - 6), m.index);
    if (/(누적|잔액|한도|잔여|포인트)\s*$/.test(before)) continue;
    const v = Number(m[1].replace(/,/g, ""));
    if (v > 0) { amount = v; break; }
  }
  if (!amount) return { ...base, reason: "금액을 찾지 못했어요" };

  // 날짜/시간: 10/28 12:31 형태 (연도는 오늘 기준, 미래 달이면 작년)
  let date = now.ymd, time = "";
  const dm = flat.match(/(\d{1,2})[/.-](\d{1,2})\s*(?:\([^)]*\))?\s*(\d{1,2}):(\d{2})/) || flat.match(/(\d{1,2})[/.-](\d{1,2})(?!\d)/);
  if (dm) {
    const mo = Number(dm[1]), d = Number(dm[2]);
    if (mo >= 1 && mo <= 12) {
      const y = mo > now.m + 1 ? now.y - 1 : now.y;
      if (d >= 1 && d <= lastDay(y, mo)) date = `${y}-${pad(mo)}-${pad(d)}`;
    }
    if (dm[3]) time = `${pad(Number(dm[3]))}:${dm[4]}`;
  }

  // 카드 표기 (끝자리만) / 신용·체크 / 할부
  const cm = flat.match(/(NH|농협|BC|비씨)\D{0,6}?([\d*]{3,8})/i);
  const card = cm ? `${cm[1]}${/체크/.test(flat) ? "체크" : ""}(${cm[2].replace(/[^\d*]/g, "").slice(-4)})` : /체크/.test(flat) ? "체크카드" : "";
  const credit = /신용/.test(flat) ? true : /체크/.test(flat) ? false : null;
  const inst = flat.match(/(\d{1,2})\s*개월/);
  const installment = inst && Number(inst[1]) > 1 ? `${Number(inst[1])}개월` : "";

  // 가맹점: 알려진 조각을 지우고 남은 글자
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const timeIdx = lines.findIndex((l) => /\d{1,2}[/.-]\d{1,2}/.test(l));
  const strip = (s: string) =>
    s
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/(총)?(누적|잔액|한도|잔여)\s*:?\s*[\d,]+\s*원?/g, " ")
      .replace(/[\d,]+\s*원/g, " ")
      .replace(/\d{1,2}[/.-]\d{1,2}\s*(\([^)]*\))?\s*(\d{1,2}:\d{2})?/g, " ")
      .replace(/(일시불|체크|신용|\d{1,2}\s*개월|할부|승인|취소|결제|사용|완료)/g, " ")
      .replace(/(NH|농협|BC|비씨)\S*/gi, " ")
      .replace(/\S*카드\S*/g, " ")
      .replace(/[가-힣]\*[가-힣*]*\s*님?/g, " ")
      .replace(/\(\s*[\d*]+\s*\)/g, " ")
      .replace(/NH\s*pay|NHpay/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  let merchant = "";
  if (lines.length > 1) {
    // 날짜 줄의 나머지 → 다음 줄 순서로 찾기
    const cand = [timeIdx >= 0 ? lines[timeIdx] : "", ...(timeIdx >= 0 ? lines.slice(timeIdx + 1) : []), ...lines];
    for (const c of cand) { const s = strip(c); if (s.length >= 2) { merchant = s; break; } }
  } else merchant = strip(flat);
  merchant = merchant.replace(/^[\s,.:·\-]+|[\s,.:·\-]+$/g, "").slice(0, 60);

  return { kind: isCancel ? "cancel" : "approve", amount, date, time, merchant, card, credit, installment };
}

/* ───────────── 카테고리 추측 ───────────── */
const RULES: [RegExp, string, string][] = [
  [/배달의민족|배민|우아한형제|요기요|쿠팡이츠|땡겨요/, "식비", "배달"],
  [/스타벅스|커피|카페|이디야|투썸|메가|빽다방|컴포즈|할리스|폴바셋|베이커리|파리바게|뚜레쥬르|배스킨|던킨|설빙/, "식비", "카페/간식"],
  [/하이마트|전자랜드|삼성스토어|LG베스트샵|가전|가구|이케아/, "생활용품", "가구/가전"],
  [/하나로|이마트(?!24)|홈플러스|롯데마트|(?<!하이)마트|식자재|정육|슈퍼|코스트코|트레이더스|농협유통|청과|수산/, "식비", "식자재"],
  [/식당|김밥|치킨|피자|국밥|분식|버거|맥도날드|롯데리아|맘스터치|반점|중화|짜장|횟집|회센터|고기|갈비|냉면|칼국수|돈까스|돈가스|초밥|스시|한식|양식|뷔페|순대|족발|보쌈|곱창|막국수|해장|식당/, "식비", "외식"],
  [/GS25|CU|씨유|세븐일레븐|이마트24|미니스톱|편의점|다이소|쿠팡(?!이츠)|생활/, "생활용품", "생필품"],
  [/주유|SK에너지|GS칼텍스|S-?OIL|에쓰오일|오일뱅크|현대오일|알뜰주유|충전소|LPG/i, "교통차량", "주유"],
  [/택시|카카오T|카카오모빌리티|우티|UT/, "교통차량", "택시"],
  [/버스|지하철|코레일|철도|티머니|캐시비|SRT|KTX|고속|시외/, "교통차량", "대중교통"],
  [/주차|하이패스|도로공사|통행/, "교통차량", "주차/통행료"],
  [/카센터|정비|세차|타이어|오토/, "교통차량", "정비/세차"],
  [/약국|병원|의원|치과|한의원|안과|피부과|내과|소아과|정형외과|이비인후과|의료/, "건강문화", "병원/약"],
  [/CGV|메가박스|롯데시네마|영화|공연|티켓/i, "건강문화", "문화생활"],
  [/교보|영풍|예스24|알라딘|서점|문고/, "건강문화", "도서"],
  [/넷플릭스|NETFLIX|유튜브|YOUTUBE|멜론|지니|디즈니|티빙|웨이브|쿠팡와우|구독/i, "건강문화", "구독서비스"],
  [/헬스|피트니스|필라테스|요가|수영|체육|골프/, "건강문화", "운동"],
  [/호텔|모텔|펜션|숙박|야놀자|여기어때|에어비앤비|항공|여행/, "건강문화", "여행/숙박"],
  [/올리브영|화장품|아리따움|이니스프리/, "의복미용", "화장품"],
  [/미용실|헤어|네일|이발/, "의복미용", "미용실"],
  [/유니클로|무신사|탑텐|스파오|자라|ZARA|H&M|의류|신발|아울렛/i, "의복미용", "의류/잡화"],
  [/세탁|수선/, "의복미용", "세탁/수선"],
  [/SKT|SK텔레콤|(?<![A-Z])KT(?![A-Z])|케이티|LG유플러스|U\+|알뜰폰/, "주거통신", "휴대폰"],
  [/학원|교습|과외/, "교육육아", "학원비"],
];

type Guess = { major: string; minor: string; nature: string; how: string };

async function guessCategory(merchant: string, cfg: GagyeConfig): Promise<Guess> {
  const exp = cfg.categories["지출"] || {};
  const has = (mj: string, mn: string) => !!exp[mj] && (exp[mj].includes(mn) || !mn);
  const nat = cfg.natures.includes("변동지출") ? "변동지출" : cfg.natures[0] || "";

  // 1) 같은 가맹점을 예전에 어떻게 분류했는지 (직접 고친 분류를 배움)
  if (merchant) {
    const prev = await prisma.gagyeTx.findFirst({
      where: { type: "지출", content: merchant },
      orderBy: { id: "desc" },
    });
    if (prev && exp[prev.major]) return { major: prev.major, minor: prev.minor, nature: prev.nature || nat, how: "이전 기록" };
  }
  // 2) 가맹점 이름 규칙
  for (const [re, mj, mn] of RULES) if (re.test(merchant) && has(mj, mn)) return { major: mj, minor: mn, nature: nat, how: "규칙" };
  // 3) Gemini (키가 있을 때)
  const key = process.env.GEMINI_API_KEY;
  if (key && merchant) {
    try {
      const catText = Object.entries(exp).map(([k, v]) => `- ${k}: ${v.join(", ")}`).join("\n");
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-2.5-flash"}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `한국 카드 결제 가맹점 "${merchant}"의 가계부 지출 분류를 아래 목록에서 골라 JSON {"category":"대분류","subcategory":"소분류"} 하나만 출력하세요.\n${catText}` }] }],
          generationConfig: { temperature: 0, responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } },
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const t: string = (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const d = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
        if (exp[d.category]) {
          const mn = exp[d.category].includes(d.subcategory) ? d.subcategory : exp[d.category][0] || "";
          return { major: d.category, minor: mn, nature: nat, how: "AI" };
        }
      }
    } catch { /* 분류 실패 시 기타로 */ }
  }
  // 4) 기타
  const mj = exp["기타지출"] ? "기타지출" : Object.keys(exp)[0] || "기타지출";
  return { major: mj, minor: (exp[mj] || [])[0] || "", nature: nat, how: "기타" };
}

/* ───────────── 처리 ───────────── */
export const CARD_TAG = "[카드알림]";

export async function previewHook(text: string) {
  await ensureTables();
  const p = parseCardText(text);
  const cfg = await getConfig();
  const g = p.kind === "approve" ? await guessCategory(p.merchant, cfg) : null;
  return { parsed: p, guess: g };
}

export async function handleHook(text: string) {
  await ensureTables();
  const p = parseCardText(text);
  if (p.kind === "ignore") {
    await addLog(text, "무시", p.reason || "");
    return { result: "ignored", reason: p.reason };
  }
  const content = p.merchant || "카드 결제";
  const timeTag = p.time ? ` ${p.time}` : "";

  if (p.kind === "cancel") {
    // 최근 30일 안의 같은 금액 자동 기록을 찾아 지움
    const cands = await prisma.gagyeTx.findMany({
      where: { type: "지출", amount: p.amount, memo: { startsWith: CARD_TAG } },
      orderBy: { id: "desc" },
      take: 20,
    });
    const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const hit = cands.find((t) => t.date >= since && (!p.merchant || t.content === p.merchant)) || cands.find((t) => t.date >= since);
    if (!hit) {
      await addLog(text, "취소-못찾음", `${p.amount.toLocaleString()}원 ${content}`);
      return { result: "cancel-unmatched" };
    }
    await prisma.gagyeTx.delete({ where: { id: hit.id } });
    await addLog(text, "취소 반영", `${hit.date} ${hit.content} ${hit.amount.toLocaleString()}원 삭제`);
    return { result: "canceled", id: hit.id };
  }

  // 같은 알림이 두 번 오면(문자+앱 푸시) 한 번만 기록
  const dup = await prisma.gagyeTx.findFirst({
    where: { date: p.date, type: "지출", amount: p.amount, content, memo: { startsWith: `${CARD_TAG}${timeTag}` } },
  });
  if (dup) {
    await addLog(text, "중복", `${p.date}${timeTag} ${content}`);
    return { result: "duplicate", id: dup.id };
  }

  const [cfg, hook] = await Promise.all([getConfig(), getHookConfig()]);
  const g = await guessCategory(p.merchant, cfg);
  const payment =
    p.credit === true && cfg.payments.includes("신용카드") ? "신용카드" :
    p.credit === false && cfg.payments.includes("체크카드") ? "체크카드" :
    cfg.payments.includes(hook.payment) ? hook.payment : cfg.payments[0] || "";
  const memo = [`${CARD_TAG}${timeTag}`, p.card, p.installment].filter(Boolean).join(" · ");
  const [y, m] = p.date.split("-").map(Number);
  const row = await prisma.gagyeTx.create({
    data: { date: p.date, year: y, month: m, type: "지출", major: g.major, minor: g.minor, content, amount: p.amount, payment, nature: g.nature, memo },
  });
  await addLog(text, "기록", `${p.date}${timeTag} ${content} ${p.amount.toLocaleString()}원 → ${g.major}/${g.minor} (${g.how})`);
  return { result: "added", id: row.id, date: p.date, amount: p.amount, content, major: g.major, minor: g.minor };
}

/** 앱을 연 뒤로 새로 자동 기록된 카드 결제 건수 (확인 표시용) */
export async function newCardAlerts(): Promise<number> {
  await ensureTables();
  const seen = await getSetting<string>("hookSeen", "");
  const n = await prisma.gagyeTx.count({
    where: { memo: { startsWith: CARD_TAG }, ...(seen ? { createdAt: { gt: new Date(seen) } } : {}) },
  });
  await setSetting("hookSeen", new Date().toISOString());
  return n;
}

export { kstNow };
