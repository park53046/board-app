/**
 * 비밀번호 해시 / 검증 — Node.js 내장 crypto(scrypt) 사용.
 * 별도 패키지 없이 동작합니다.
 */
import crypto from "crypto";

/** 비밀번호를 salt:hash 형식으로 해시합니다. */
export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** 입력된 비밀번호가 저장된 해시와 일치하는지 확인합니다. */
export function verifyPassword(plain: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const candidate = crypto.scryptSync(plain, salt, 64);
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), candidate);
  } catch {
    return false;
  }
}
