import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { addNotice } from "@/lib/notices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_SLUGS = ["ai", "programming", "graphics", "data-science"];

// 과목 공지사항 등록 (관리자 전용)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return Response.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let body: { slug?: string; title?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const slug = String(body.slug ?? "");
  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();

  if (!VALID_SLUGS.includes(slug)) {
    return Response.json({ error: "올바른 과목을 선택해주세요." }, { status: 400 });
  }
  if (!title || !content) {
    return Response.json({ error: "제목과 내용을 입력해주세요." }, { status: 400 });
  }

  await addNotice(slug, title, content);
  return Response.json({ ok: true });
}
