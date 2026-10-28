/**
 * 가계365 API — /api/gagye/...
 * unlock·lock·cron 을 제외한 모든 요청은 비밀번호 잠금 해제(쿠키)가 필요합니다.
 */
import type { NextRequest } from "next/server";
import {
  createTx, deleteRecurring, deleteTx, getAnnual, getConfig, getDashboard, getReceipt, getYears, kstNow,
  listRecurring, processRecurring, saveConfig, saveRecurring, toggleRecurring, updateTx,
} from "@/lib/gagye/core";
import { changePin, isUnlocked, lock, unlock } from "@/lib/gagye/auth";
import { analyzeReceipt } from "@/lib/gagye/receipt";
import { exportYear, importWorkbook } from "@/lib/gagye/excel";
import { checkHookKey, getHookConfig, getHookLog, handleHook, newCardAlerts, previewHook, setHookPayment } from "@/lib/gagye/hook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ path: string[] }> };

const ok = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const err = (msg: string, status = 400) => ok({ error: msg }, status);
const int = (v: unknown) => Math.round(Number(v) || 0);

async function body(req: NextRequest) {
  return (await req.json().catch(() => ({}))) as Record<string, unknown>;
}

async function handle(req: NextRequest, ctx: Ctx) {
  const path = (await ctx.params).path || [];
  const [a, b, c] = path;
  const method = req.method;
  const url = new URL(req.url);

  /* ── 인증이 필요 없는 경로 ── */
  if (a === "unlock" && method === "POST") {
    const r = await unlock(String((await body(req)).pin ?? ""));
    return ok(r, r.ok ? 200 : 401);
  }
  if (a === "lock" && method === "POST") {
    await lock();
    return ok({ ok: true });
  }
  if (a === "cron" && method === "GET") {
    // Vercel Cron: CRON_SECRET이 있으면 Bearer 토큰 확인, 없으면 Vercel 크론 요청만 허용
    const secret = process.env.CRON_SECRET;
    const authz = req.headers.get("authorization") || "";
    const ua = req.headers.get("user-agent") || "";
    if (secret ? authz !== `Bearer ${secret}` : !ua.includes("vercel-cron")) return err("forbidden", 403);
    return ok({ ok: true, added: await processRecurring() });
  }

  if (a === "hook" && !b && method === "POST") {
    // 휴대폰(MacroDroid 등)에서 카드 승인 알림을 보내는 주소 — 비밀 키(X-Gagye-Key 헤더)로만 허용
    const authz = req.headers.get("authorization") || "";
    const key = req.headers.get("x-gagye-key") || (authz.startsWith("Bearer ") ? authz.slice(7) : "");
    if (!(await checkHookKey(key.trim()))) return err("forbidden", 403);
    const text = await hookText(req);
    if (!text.trim()) return err("내용이 비어 있어요.");
    return ok(await handleHook(text.slice(0, 2000)));
  }

  if (!(await isUnlocked())) return err("AUTH_REQUIRED", 401);

  /* ── 시작 데이터 ── */
  if (a === "bootstrap" && method === "GET") {
    let autoAdded = 0;
    try { autoAdded = await processRecurring(); } catch (e) { console.error("고정 항목 처리 실패", e); }
    const now = kstNow();
    const [config, dash, recurring, years, cardAlerts] = await Promise.all([getConfig(), getDashboard(now.y, now.m), listRecurring(), getYears(), newCardAlerts()]);
    return ok({ config, dash, recurring, years, autoAdded, cardAlerts, now, hasKey: !!process.env.GEMINI_API_KEY });
  }

  if (a === "dashboard" && method === "GET") {
    const now = kstNow();
    return ok(await getDashboard(int(url.searchParams.get("y")) || now.y, int(url.searchParams.get("m")) || now.m));
  }

  /* ── 거래 내역 ── */
  if (a === "tx") {
    if (!b && method === "POST") {
      const p = await body(req);
      const r = await createTx(p.entry as never, {
        force: !!p.force,
        receipt: p.b64 ? { b64: String(p.b64), mime: String(p.mime || "image/jpeg") } : undefined,
      });
      if ("duplicate" in r) return ok({ duplicate: true });
      return ok({ ok: true, year: r.tx.year, month: r.tx.month, dash: await getDashboard(r.tx.year, r.tx.month) });
    }
    if (b && method === "PATCH") {
      const t = await updateTx(int(b), (await body(req)) as never);
      return ok({ ok: true, year: t.year, month: t.month, dash: await getDashboard(t.year, t.month) });
    }
    if (b && method === "DELETE") {
      await deleteTx(int(b));
      return ok({ ok: true });
    }
  }

  /* ── 영수증 ── */
  if (a === "receipt") {
    if (b === "analyze" && method === "POST") {
      const p = await body(req);
      const b64 = String(p.b64 || ""), mime = String(p.mime || "image/jpeg");
      if (!b64) return err("영수증 파일이 없어요.");
      if (b64.length > 4_000_000) return err("파일이 너무 커요. 사진은 자동으로 줄여지니 PDF라면 3MB 이하로 올려 주세요.");
      return ok(await analyzeReceipt(b64, mime, await getConfig(), kstNow().y));
    }
    if (b && method === "GET") {
      const r = await getReceipt(int(b));
      if (!r) return err("not found", 404);
      return new Response(Buffer.from(r.data, "base64"), {
        headers: { "Content-Type": r.mime, "Cache-Control": "private, max-age=3600" },
      });
    }
  }

  /* ── 고정 항목 ── */
  if (a === "recurring") {
    if (!b && method === "GET") return ok({ list: await listRecurring() });
    if (b === "run" && method === "POST") {
      const n = await processRecurring();
      const now = kstNow();
      return ok({ n, list: await listRecurring(), dash: await getDashboard(now.y, now.m) });
    }
    const now = kstNow();
    if (!b && method === "POST") {
      const n = await saveRecurring(null, (await body(req)) as never);
      return ok({ n, list: await listRecurring(), dash: await getDashboard(now.y, now.m) });
    }
    if (b && c === "toggle" && method === "POST") {
      const n = await toggleRecurring(int(b), !!(await body(req)).on);
      return ok({ n, list: await listRecurring(), dash: await getDashboard(now.y, now.m) });
    }
    if (b && method === "PATCH") {
      const n = await saveRecurring(int(b), (await body(req)) as never);
      return ok({ n, list: await listRecurring(), dash: await getDashboard(now.y, now.m) });
    }
    if (b && method === "DELETE") {
      await deleteRecurring(int(b));
      return ok({ list: await listRecurring() });
    }
  }

  /* ── 연간 정산 / 엑셀 ── */
  if (a === "annual" && method === "GET") {
    return ok(await getAnnual(int(url.searchParams.get("y")) || kstNow().y));
  }
  if (a === "export" && method === "GET") {
    const y = int(url.searchParams.get("y")) || kstNow().y;
    const buf = await exportYear(y);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`가계365_${y}년.xlsx`)}`,
        "Cache-Control": "no-store",
      },
    });
  }
  if (a === "import" && method === "POST") {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return err("엑셀 파일을 골라 주세요.");
    if (file.size > 4 * 1024 * 1024) return err("파일이 너무 커요 (4MB 이하).");
    return ok({ ok: true, result: await importWorkbook(await file.arrayBuffer()), config: await getConfig() });
  }

  /* ── 카드 알림 자동 기록 설정 ── */
  if (a === "hook") {
    if (b === "config" && method === "GET") return ok({ ...(await getHookConfig()), log: await getHookLog() });
    if (b === "rotate" && method === "POST") return ok({ ...(await getHookConfig(true)), log: await getHookLog() });
    if (b === "payment" && method === "POST") { await setHookPayment(String((await body(req)).payment || "")); return ok({ ok: true }); }
    if (b === "test" && method === "POST") return ok(await previewHook(String((await body(req)).text || "").slice(0, 2000)));
  }

  /* ── 설정 ── */
  if (a === "settings") {
    if (method === "GET") return ok(await getConfig());
    if (method === "PUT") return ok(await saveConfig((await body(req)) as never));
  }
  if (a === "pin" && method === "POST") {
    const p = await body(req);
    await changePin(String(p.current ?? ""), String(p.next ?? ""));
    return ok({ ok: true });
  }

  return err("not found", 404);
}

/** 휴대폰 자동화 앱이 보내는 본문(JSON·폼·일반 텍스트 모두 허용)에서 알림 글자를 꺼냄 */
async function hookText(req: NextRequest): Promise<string> {
  const raw = await req.text();
  const ct = req.headers.get("content-type") || "";
  try {
    if (ct.includes("json") || raw.trim().startsWith("{")) {
      const j = JSON.parse(raw) as Record<string, unknown>;
      return ["title", "text", "message", "body", "notification", "sms"].map((k) => j[k]).filter((v) => typeof v === "string" && v).join("\n");
    }
    if (ct.includes("x-www-form-urlencoded")) {
      const f = new URLSearchParams(raw);
      return ["title", "text", "message", "body"].map((k) => f.get(k)).filter(Boolean).join("\n");
    }
  } catch { /* 일반 텍스트로 처리 */ }
  return raw;
}

async function safe(req: NextRequest, ctx: Ctx) {
  try {
    return await handle(req, ctx);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[gagye]", msg);
    return err(msg || "서버 오류", 500);
  }
}

export { safe as GET, safe as POST, safe as PATCH, safe as PUT, safe as DELETE };
