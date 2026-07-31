/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { del } from "@vercel/blob";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_SLUGS = ["ai", "programming", "graphics", "data-science"];

// 과목 수업자료 등록 (관리자 전용) — 파일은 이미 Blob에 업로드됨, 여기선 정보 저장
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return Response.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const slug = String(body?.slug ?? "");
  const name = String(body?.name ?? "").trim();
  const url = String(body?.url ?? "").trim();
  const pathname = String(body?.pathname ?? "").trim();
  const size = Number(body?.size ?? 0);

  if (!VALID_SLUGS.includes(slug)) {
    return Response.json({ error: "올바른 과목을 선택해주세요." }, { status: 400 });
  }
  if (!name || !url || !pathname) {
    return Response.json({ error: "파일 정보 누락" }, { status: 400 });
  }
  if (size > 10 * 1024 * 1024) {
    return Response.json({ error: "10MB를 초과했습니다." }, { status: 400 });
  }

  const item = await (prisma as any).fileItem.create({
    data: {
      name,
      url,
      pathname,
      size,
      uploaderStudentId: session.studentId,
      uploaderName: session.name,
      subjectSlug: slug,
    },
  });
  return Response.json({ ok: true, item });
}

// 수업자료 삭제 (관리자 전용)
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return Response.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return Response.json({ error: "id 없음" }, { status: 400 });

  const item = await (prisma as any).fileItem.findUnique({ where: { id } });
  if (!item) return Response.json({ error: "파일 없음" }, { status: 404 });

  try {
    await del(item.url);
  } catch {
    /* 이미 없어도 진행 */
  }
  await (prisma as any).fileItem.delete({ where: { id } });
  return Response.json({ ok: true });
}
