/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 보낸 기록 목록 — 로그인한 본인 것만 (로그아웃 시 빈 목록)
export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ ok: true, loggedIn: false, items: [] });
  }
  const rows = await (prisma as any).sentMail.findMany({
    where: { studentId: session.studentId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return Response.json({ ok: true, loggedIn: true, items: rows });
}

// 보내기 버튼 클릭 시 기록 저장
export async function POST(req: NextRequest) {
  const session = await getSession();
  const body = await req.json().catch(() => ({}));
  const toEmail = String(body?.toEmail ?? "").trim();
  const subject = String(body?.subject ?? "").trim();
  const method = body?.method === "outlook" ? "outlook" : "gmail";

  if (!toEmail || !subject) {
    return Response.json({ ok: false, error: "받는사람/제목 누락" }, { status: 400 });
  }

  const item = await (prisma as any).sentMail.create({
    data: {
      studentId: session?.studentId ?? null,
      senderName: session?.name ?? null,
      toEmail,
      subject,
      method,
    },
  });
  return Response.json({ ok: true, item });
}
