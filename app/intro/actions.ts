"use server";

import { revalidatePath } from "next/cache";
import { addNotice } from "@/lib/notices";

// 폼에서 선택 가능한 과목 목록 (intro 페이지의 담당 과목과 동일하게 유지)
const VALID_SLUGS = ["ai", "programming", "graphics", "data-science"];

export type AddNoticeState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

export async function addNoticeAction(
  _prevState: AddNoticeState,
  formData: FormData
): Promise<AddNoticeState> {
  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!VALID_SLUGS.includes(slug)) {
    return { ok: false, error: "올바른 과목을 선택해주세요." };
  }
  if (!title) {
    return { ok: false, error: "제목을 입력해주세요." };
  }
  if (!content) {
    return { ok: false, error: "내용을 입력해주세요." };
  }

  addNotice(slug, title, content);

  // 해당 과목 페이지를 다시 생성해서 새 공지사항이 바로 보이도록 함
  revalidatePath(`/subjects/${slug}`);

  return { ok: true };
}
