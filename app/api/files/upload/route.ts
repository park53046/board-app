import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 브라우저가 파일을 Blob에 직접 올릴 때 쓰는 업로드 토큰 발급 (로그인 + 20MB 제한)
export async function POST(req: NextRequest): Promise<Response> {
  const session = await getSession();
  const body = (await req.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        if (!session) {
          throw new Error("로그인이 필요합니다.");
        }
        return {
          addRandomSuffix: true,
          maximumSizeInBytes: 20 * 1024 * 1024, // 20MB 제한 (서버에서 강제)
        };
      },
      // 참고: onUploadCompleted 는 로컬 개발에선 호출되지 않아,
      // DB 기록은 브라우저에서 업로드 후 /api/files (POST)로 따로 저장합니다.
      onUploadCompleted: async () => {},
    });
    return Response.json(json);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "업로드 실패";
    return Response.json({ error: msg }, { status: 400 });
  }
}
