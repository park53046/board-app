/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { del } from "@vercel/blob";
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
    isAdmin: !!session.isAdmin,
    messages: rows.reverse(), // 오래된 → 최신 순으로
  });
}

// 선택 삭제 — 본인 메시지(관리자는 전체)
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const ids: number[] = Array.isArray(body?.ids) ? body.ids.map(Number).filter(Boolean) : [];
  if (ids.length === 0) {
    return Response.json({ ok: false, error: "선택된 항목이 없습니다." }, { status: 400 });
  }

  const rows = await (prisma as any).chatMessage.findMany({ where: { id: { in: ids } } });
  const deletable = rows.filter(
    (m: any) => m.studentId === session.studentId || session.isAdmin
  );

  // 첨부 이미지가 있으면 Blob에서도 삭제
  for (const m of deletable) {
    if (m.imagePath) {
      try { await del(m.imagePath); } catch { /* 이미 없어도 진행 */ }
    }
  }

  const delIds = deletable.map((m: any) => m.id);
  if (delIds.length > 0) {
    await (prisma as any).chatMessage.deleteMany({ where: { id: { in: delIds } } });
  }
  return Response.json({ ok: true, deleted: delIds.length });
}

// 메시지 전송
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const text = String(body?.content ?? "").trim();
  const imagePath = body?.imagePath ? String(body.imagePath) : null;

  // 글도 이미지도 없으면 거부
  if (!text && !imagePath) {
    return Response.json({ ok: false, error: "내용을 입력하세요." }, { status: 400 });
  }
  if (text.length > 500) {
    return Response.json({ ok: false, error: "500자 이하로 입력하세요." }, { status: 400 });
  }
  const message = await (prisma as any).chatMessage.create({
    data: { studentId: session.studentId, name: session.name, content: text, imagePath },
  });
  return Response.json({ ok: true, message });
}
