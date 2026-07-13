/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { get } from "@vercel/blob";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 큰 파일 스트리밍 대비 (Hobby 최대 60초)

// 로그인한 사람만 다운로드 — 비공개 Blob을 서버에서 받아 스트리밍
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new Response("로그인이 필요합니다.", { status: 401 });
  }

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return new Response("id 없음", { status: 400 });

  const item = await (prisma as any).fileItem.findUnique({ where: { id } });
  if (!item) return new Response("파일 없음", { status: 404 });

  const result = await get(item.pathname, { access: "private" });
  if (!result) {
    return new Response("파일을 찾을 수 없습니다.", { status: 404 });
  }

  // 필요한 헤더만 직접 복사 (undici Headers를 그대로 넘기면 타입 충돌)
  const headers = new Headers();
  const contentType = result.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const contentLength = result.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);
  headers.set(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(item.name)}`
  );

  return new Response(result.stream as any, { headers });
}
