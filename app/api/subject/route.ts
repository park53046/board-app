import { NextRequest } from "next/server";
import { getSubject } from "@/app/subjects/subjects-data";
import { getNoticesForSubject } from "@/lib/notices";
import { getSubjectFiles } from "@/lib/subject-files";

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
  const materials = [
    ...subject.materials.map((m) => ({ name: m.title, url: m.url })),
    ...getSubjectFiles(slug),
  ];

  return Response.json({
    name: subject.name,
    notices,
    materials,
    assignmentForms: subject.assignmentForms,
  });
}
