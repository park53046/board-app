/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { getSubject } from "@/app/subjects/subjects-data";
import { getNoticesForSubject } from "@/lib/notices";
import { getSubjectFiles } from "@/lib/subject-files";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// intro 페이지에서 담당 과목을 누르면 해당 과목 내용을 프레임으로 보여주기 위한 API
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  const subject = getSubject(slug);
  if (!subject) {
    return Response.json({ error: "과목을 찾을 수 없습니다." }, { status: 404 });
  }

  const notices = await getNoticesForSubject(slug);

  // 업로드된 수업자료(FileItem, subjectSlug 일치) — 비공개 Blob이라 다운로드 라우트로 서빙
  let uploaded: { id: number; name: string; url: string }[] = [];
  try {
    const rows = await (prisma as any).fileItem.findMany({
      where: { subjectSlug: slug },
      orderBy: { createdAt: "desc" },
    });
    uploaded = rows.map((r: any) => ({ id: r.id, name: r.name, url: `/api/files/download?id=${r.id}` }));
  } catch {
    uploaded = [];
  }

  const materials = [
    ...subject.materials.map((m) => ({ name: m.title, url: m.url })),
    ...getSubjectFiles(slug),
    ...uploaded,
  ];

  return Response.json({
    name: subject.name,
    notices,
    materials,
    assignmentForms: subject.assignmentForms,
  });
}
