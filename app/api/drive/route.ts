/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 링크 목록 — 로그인한 사람만
export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ ok: false, loggedIn: false, items: [] }, { status: 401 });
  }
  const items = await (prisma as any).driveLink.findMany({
    orderBy: { createdAt: "desc" },
  });
  return Response.json({
    ok: true,
    loggedIn: true,
    isAdmin: !!session.isAdmin,
    me: session.studentId,
    items,
  });
}

// 링크 등록
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const title = String(body?.title ?? "").trim();
  let url = String(body?.url ?? "").trim();
  const note = String(body?.note ?? "").trim();

  if (!title) return Response.json({ ok: false, error: "제목을 입력하세요." }, { status: 400 });
  if (!url) return Response.json({ ok: false, error: "링크를 입력하세요." }, { status: 400 });
  // http/https 로 시작하지 않으면 붙여줌
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  const item = await (prisma as any).driveLink.create({
    data: {
      title,
      url,
      note: note || null,
      uploaderStudentId: session.studentId,
      uploaderName: session.name,
    },
  });
  return Response.json({ ok: true, item });
}

// 삭제 — 본인 또는 관리자
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return Response.json({ ok: false, error: "id 없음" }, { status: 400 });

  const item = await (prisma as any).driveLink.findUnique({ where: { id } });
  if (!item) return Response.json({ ok: false, error: "없음" }, { status: 404 });
  if (item.uploaderStudentId !== session.studentId && !session.isAdmin) {
    return Response.json({ ok: false, error: "삭제 권한이 없습니다." }, { status: 403 });
  }
  await (prisma as any).driveLink.delete({ where: { id } });
  return Response.json({ ok: true });
}
