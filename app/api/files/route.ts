/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { del } from "@vercel/blob";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 파일 목록 — 로그인한 사람만
export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ ok: false, loggedIn: false, items: [] }, { status: 401 });
  }
  const items = await (prisma as any).fileItem.findMany({
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ ok: true, loggedIn: true, isAdmin: !!session.isAdmin, me: session.studentId, items });
}

// 업로드 완료 후 파일 정보 저장
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const url = String(body?.url ?? "").trim();
  const pathname = String(body?.pathname ?? "").trim();
  const size = Number(body?.size ?? 0);

  if (!name || !url || !pathname) {
    return Response.json({ ok: false, error: "파일 정보 누락" }, { status: 400 });
  }
  if (size > 20 * 1024 * 1024) {
    return Response.json({ ok: false, error: "20MB를 초과했습니다." }, { status: 400 });
  }

  const item = await (prisma as any).fileItem.create({
    data: {
      name,
      url,
      pathname,
      size,
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
  if (!id) {
    return Response.json({ ok: false, error: "id 없음" }, { status: 400 });
  }
  const item = await (prisma as any).fileItem.findUnique({ where: { id } });
  if (!item) {
    return Response.json({ ok: false, error: "파일 없음" }, { status: 404 });
  }
  if (item.uploaderStudentId !== session.studentId && !session.isAdmin) {
    return Response.json({ ok: false, error: "삭제 권한이 없습니다." }, { status: 403 });
  }

  try {
    await del(item.url); // Blob에서 실제 파일 삭제
  } catch {
    /* 이미 없어도 진행 */
  }
  await (prisma as any).fileItem.delete({ where: { id } });
  return Response.json({ ok: true });
}
