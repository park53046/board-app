/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { get } from "@vercel/blob";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 채팅 첨부 이미지 보기 — 로그인한 사람만
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("로그인이 필요합니다.", { status: 401 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return new Response("id 없음", { status: 400 });

  const msg = await (prisma as any).chatMessage.findUnique({ where: { id } });
  if (!msg || !msg.imagePath) return new Response("이미지 없음", { status: 404 });

  const result = await get(msg.imagePath, { access: "private" });
  if (!result) return new Response("이미지를 찾을 수 없습니다.", { status: 404 });

  const headers = new Headers();
  const ct = result.headers.get("content-type");
  if (ct) headers.set("Content-Type", ct);
  headers.set("Cache-Control", "private, max-age=3600");

  return new Response(result.stream as any, { headers });
}
