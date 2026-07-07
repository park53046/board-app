/**
 * 서버 사이드 세션 — Node.js 내장 crypto(HMAC-SHA256)로 서명된 쿠키를 사용합니다.
 * 별도 패키지 없이 동작합니다.
 */
import crypto from "crypto";
import { cookies } from "next/headers";

const SECRET = process.env.SESSION_SECRET ?? "dh36-board-secret-key-2026-school";
const COOKIE_NAME = "dh36-board-session";

export type SessionData = {
  userId: number;
  studentId: string;
  name: string;
  affil: string;
  isAdmin?: boolean;
};

// ── 내부 유틸 ──────────────────────────────────────────────
function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function encodeSession(data: SessionData): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string): SessionData | null {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    // 타이밍 공격 방지
    const expectedSig = sign(payload);
    if (
      sig.length !== expectedSig.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))
    )
      return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as SessionData;
  } catch {
    return null;
  }
}

// ── 공개 API ───────────────────────────────────────────────

/** 서버 컴포넌트와 서버 액션 모두에서 호출 가능 (읽기 전용) */
export async function getSession(): Promise<SessionData | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return token ? decodeSession(token) : null;
}

/** 서버 액션 전용 — 로그인 성공 후 쿠키 저장 */
export async function setSession(data: SessionData): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, encodeSession(data), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7일
  });
}

/** 서버 액션 전용 — 로그아웃 시 쿠키 삭제 */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
