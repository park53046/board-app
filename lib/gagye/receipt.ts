/** 영수증 사진/PDF → Gemini로 읽어서 가계부 항목으로 변환 */
import type { GagyeConfig } from "./defaults";

export type ReceiptResult = {
  isReceipt: boolean; date: string; store: string; total: number; payment: string;
  category: string; subcategory: string; nature: string; items: { name: string; amount: number }[]; memo: string;
};

export async function analyzeReceipt(b64: string, mime: string, cfg: GagyeConfig, year: number): Promise<ReceiptResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("서버에 GEMINI_API_KEY가 설정되지 않았어요. Vercel 환경 변수에 추가해 주세요.");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const exp = cfg.categories["지출"] || {};
  const catText = Object.entries(exp).map(([k, v]) => `- ${k}: ${v.join(", ")}`).join("\n");

  const prompt = `당신은 한국 영수증을 가계부 데이터로 바꾸는 도우미입니다. 첨부된 영수증(사진 또는 PDF, 카드 결제 문자 캡처 포함)을 읽고 아래 JSON 하나만 출력하세요.
{
 "isReceipt": true/false,
 "date": "YYYY-MM-DD" (연도가 없으면 ${year}년),
 "store": "가맹점/상호명",
 "total": 최종 결제금액(숫자, 할인 반영 후 실제 결제액, 원 단위),
 "payment": 다음 중 하나 [${cfg.payments.join(", ")}] (카드 결제이면서 '체크' 표기가 있으면 체크카드, 카드 종류가 불분명하면 신용카드, 현금영수증이면 현금),
 "category": 아래 대분류 중 하나,
 "subcategory": 그 대분류에 속한 소분류 중 하나,
 "nature": "고정지출" 또는 "변동지출" (공과금/관리비/보험/통신/구독은 고정지출, 나머지는 변동지출),
 "items": [{"name":"품목","amount":금액}] (최대 10개),
 "memo": "특이사항(할부 개월, 부분취소 등), 없으면 빈 문자열"
}
지출 카테고리:
${catText}
읽을 수 없는 값은 빈 문자열 또는 0으로 두세요.`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: b64 } }] }],
      generationConfig: { temperature: 0.1, responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } },
    }),
  });
  const raw = await res.text();
  if (!res.ok) {
    let msg = raw;
    try { msg = JSON.parse(raw).error.message; } catch {}
    if (res.status === 429) msg = "무료 사용 한도를 초과했어요. 잠시 후 다시 시도하세요.";
    throw new Error(`영수증 인식 실패 [${res.status}] ${msg}`.slice(0, 300));
  }
  const text: string = JSON.parse(raw)?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  if (s < 0 || e < 0) throw new Error("인식 결과를 해석하지 못했어요. 더 밝고 반듯하게 다시 찍어 주세요.");
  const d = JSON.parse(text.slice(s, e + 1));

  // 카테고리/결제수단 보정
  let category = String(d.category || "");
  let sub = String(d.subcategory || "");
  if (!exp[category]) {
    category = Object.keys(exp).find((k) => exp[k].includes(sub)) || (exp["기타지출"] ? "기타지출" : Object.keys(exp)[0] || "");
  }
  if (!(exp[category] || []).includes(sub)) sub = (exp[category] || [""])[0] || "";
  const payment = cfg.payments.includes(d.payment) ? d.payment : cfg.payments.includes("신용카드") ? "신용카드" : cfg.payments[0] || "";
  const nature = cfg.natures.includes(d.nature) ? d.nature : "변동지출";
  return {
    isReceipt: d.isReceipt !== false,
    date: String(d.date || ""),
    store: String(d.store || ""),
    total: Math.round(Number(String(d.total ?? 0).replace(/[^\d.-]/g, "")) || 0),
    payment, category, subcategory: sub, nature,
    items: Array.isArray(d.items) ? d.items.slice(0, 10).map((x: { name?: unknown; amount?: unknown }) => ({ name: String(x?.name ?? ""), amount: Number(x?.amount) || 0 })) : [],
    memo: String(d.memo || ""),
  };
}
