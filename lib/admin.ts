/**
 * 관리자(전체 관리) 학번 목록.
 * 기본값은 "admin". 필요하면 .env 에 ADMIN_STUDENT_IDS="admin,teacher01" 처럼 지정.
 */
export const ADMIN_STUDENT_IDS = (process.env.ADMIN_STUDENT_IDS ?? "admin")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function isAdminStudentId(studentId: string): boolean {
  const id = studentId.trim().toLowerCase();
  // 목록에 있거나, "admin" 으로 시작하는 학번(admin, admin36 등)은 관리자
  return ADMIN_STUDENT_IDS.map((s) => s.toLowerCase()).includes(id) || id.startsWith("admin");
}
