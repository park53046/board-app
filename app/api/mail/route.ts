/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 보낸 기록 목록 (최근 50건)
export async function GET() {
  const rows = await (prisma as any).sentMail.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return Response.json({ ok: true, items: rows });
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
      senderName: session?.name ?? null,
      toEmail,
      subject,
      method,
    },
  });
  return Response.json({ ok: true, item });
}
