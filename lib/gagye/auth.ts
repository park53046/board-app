/**
 * 가계365 잠금 — 4자리 비밀번호는 서버에서만 확인하고(해시 저장),
 * 통과하면 서명된 httpOnly 쿠키(6시간, 사용할 때마다 연장)를 발급합니다.
 */
import crypto from "crypto";
import { cookies } from "next/headers";
import { getSetting, setSetting } from "./core";

const SECRET = (process.env.SESSION_SECRET ?? "dh36-board-secret-key-2026-school") + "::gagye365";
const COOKIE = "gagye-session";
const TTL_SEC = 6 * 60 * 60;
const MAX_FAIL = 5;
const LOCK_MS = 5 * 60 * 1000;

const hashPin = (pin: string) => crypto.createHash("sha256").update("gagye365::" + pin).digest("base64");
const sign = (p: string) => crypto.createHmac("sha256", SECRET).update(p).digest("base64url");

async function savedHash() {
  return (await getSetting<string | null>("pinHash", null)) ?? hashPin(process.env.GAGYE_PIN || "3366");
}

export async function isUnlocked(): Promise<boolean> {
  const store = await cookies();
  const v = store.get(COOKIE)?.value;
  if (!v) return false;
  const dot = v.lastIndexOf(".");
  if (dot < 0) return false;
  const payload = v.slice(0, dot), sig = v.slice(dot + 1), exp = sign(payload);
  if (sig.length !== exp.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as { exp: number };
    if (!(data.exp > Date.now())) return false;
  } catch {
    return false;
  }
  await issue(); // 사용할 때마다 유효시간 연장
  return true;
}

async function issue() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TTL_SEC * 1000 })).toString("base64url");
  const store = await cookies();
  store.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: TTL_SEC,
  });
}

export async function lock() {
  const store = await cookies();
  store.delete(COOKIE);
}

export type UnlockResult = { ok: true } | { ok: false; left?: number; lockedSec?: number };

export async function unlock(pin: string): Promise<UnlockResult> {
  const fail = await getSetting<{ count: number; until: number }>("pinFail", { count: 0, until: 0 });
  if (fail.until > Date.now()) return { ok: false, lockedSec: Math.ceil((fail.until - Date.now()) / 1000) };
  await new Promise((r) => setTimeout(r, 300)); // 무작위 대입 속도 늦추기
  const a = Buffer.from(hashPin(String(pin || "").trim())), b = Buffer.from(await savedHash());
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    const count = (fail.until && fail.until <= Date.now() ? 0 : fail.count) + 1;
    if (count >= MAX_FAIL) {
      await setSetting("pinFail", { count: 0, until: Date.now() + LOCK_MS });
      return { ok: false, lockedSec: LOCK_MS / 1000 };
    }
    await setSetting("pinFail", { count, until: 0 });
    return { ok: false, left: MAX_FAIL - count };
  }
  await setSetting("pinFail", { count: 0, until: 0 });
  await issue();
  return { ok: true };
}

export async function changePin(current: string, next: string) {
  const a = Buffer.from(hashPin(String(current || ""))), b = Buffer.from(await savedHash());
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error("현재 비밀번호가 맞지 않아요.");
  if (!/^\d{4}$/.test(String(next))) throw new Error("새 비밀번호는 숫자 4자리로 입력하세요.");
  await setSetting("pinHash", hashPin(String(next)));
}
