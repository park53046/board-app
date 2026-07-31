import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 현재 로그인/관리자 여부 확인 (클라이언트 컴포넌트에서 사용)
export async function GET() {
  const s = await getSession();
  return Response.json({ isAdmin: !!s?.isAdmin, name: s?.name ?? null });
}
