/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 최근 메시지 조회 (2초마다 폴링)
export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }
  const rows = await (prisma as any).chatMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return Response.json({
    ok: true,
    me: session.studentId,
    messages: rows.reverse(), // 오래된 → 최신 순으로
  });
}

// 메시지 전송
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const text = String(body?.content ?? "").trim();
  if (!text) {
    return Response.json({ ok: false, error: "내용을 입력하세요." }, { status: 400 });
  }
  if (text.length > 500) {
    return Response.json({ ok: false, error: "500자 이하로 입력하세요." }, { status: 400 });
  }
  const message = await (prisma as any).chatMessage.create({
    data: { studentId: session.studentId, name: session.name, content: text },
  });
  return Response.json({ ok: true, message });
}
