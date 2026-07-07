/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { getSession, setSession, clearSession } from "@/lib/session";
import { isAdminStudentId } from "@/lib/admin";

export type ActionState =
  | { ok: true; message?: string }
  | { ok: false; error: string }
  | null;

const SUBJECTS = ["인공지능", "프로그래밍", "컴퓨터그래픽", "데이터과학"];

// 회원가입
export async function registerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const affil = String(formData.get("affil") ?? "").trim();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const confirm = String(formData.get("confirm") ?? "").trim();

  if (!affil) return { ok: false, error: "소속을 입력해주세요." };
  if (!studentId) return { ok: false, error: "학번을 입력해주세요." };
  if (!name) return { ok: false, error: "성명을 입력해주세요." };
  if (password.length < 4) return { ok: false, error: "비밀번호는 4자 이상이어야 합니다." };
  if (password !== confirm) return { ok: false, error: "비밀번호가 일치하지 않습니다." };

  const existing = await (prisma as any).user.findUnique({ where: { studentId } });
  if (existing) return { ok: false, error: "이미 가입된 학번입니다." };

  await (prisma as any).user.create({
    data: { affil, studentId, name, password: hashPassword(password) },
  });

  return { ok: true, message: "가입 완료! 로그인해주세요." };
}

// 로그인
export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const studentId = String(formData.get("studentId") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!studentId || !password) return { ok: false, error: "학번과 비밀번호를 입력해주세요." };

  const user = await (prisma as any).user.findUnique({ where: { studentId } });
  if (!user || !verifyPassword(password, user.password as string)) {
    return { ok: false, error: "학번 또는 비밀번호가 올바르지 않습니다." };
  }

  await setSession({
    userId: user.id,
    studentId: user.studentId,
    name: user.name,
    affil: user.affil,
    isAdmin: isAdminStudentId(user.studentId),
  });
  redirect("/board");
}

// 로그아웃
export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/board/login");
}

// 게시글 작성
export async function createPostAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { ok: false, error: "로그인이 필요합니다." };

  const subject = String(formData.get("subject") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!SUBJECTS.includes(subject)) return { ok: false, error: "올바른 과목을 선택해주세요." };
  if (!title) return { ok: false, error: "제목을 입력해주세요." };
  if (!content) return { ok: false, error: "내용을 입력해주세요." };

  await (prisma as any).boardPost.create({
    data: { subject, title, content, userId: session.userId },
  });

  revalidatePath("/board");
  redirect("/board");
}

// 게시글 삭제
export async function deletePostAction(postId: number): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/board/login");

  // 본인 글인지 확인 후 삭제
  await (prisma as any).boardPost.deleteMany({
    where: { id: postId, userId: session.userId },
  });

  revalidatePath("/board");
  redirect("/board");
}
