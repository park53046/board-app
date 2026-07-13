/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { get } from "@vercel/blob";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const { stream, headers } = await get(item.pathname, { access: "private" });

  const outHeaders = new Headers(headers as any);
  outHeaders.set(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(item.name)}`
  );
  return new Response(stream as any, { headers: outHeaders });
}
