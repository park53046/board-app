"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "../actions";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerAction, null);

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.title}>회원가입</h1>
        <p style={styles.sub}>학습 소감 게시판</p>

        {state?.ok === true ? (
          <div>
            <p style={styles.success}>✓ {state.message}</p>
            <Link href="/board/login" style={styles.goLogin}>로그인 하러 가기 →</Link>
          </div>
        ) : (
          <form action={formAction} style={styles.form}>
            <label style={styles.label}>소속 <span style={styles.hint}>(예: 3학년 2반)</span></label>
            <input name="affil" type="text" placeholder="소속 학년/반" style={styles.input} required />

            <label style={styles.label}>학번</label>
            <input name="studentId" type="text" placeholder="학번을 입력하세요" style={styles.input} required />

            <label style={styles.label}>성명</label>
            <input name="name" type="text" placeholder="이름" style={styles.input} required />

            <label style={styles.label}>비밀번호 <span style={styles.hint}>(4자 이상)</span></label>
            <input name="password" type="password" placeholder="비밀번호" style={styles.input} required />

            <label style={styles.label}>비밀번호 확인</label>
            <input name="confirm" type="password" placeholder="비밀번호 재입력" style={styles.input} required />

            {state?.ok === false && <p style={styles.error}>{state.error}</p>}

            <button type="submit" disabled={isPending} style={styles.btn}>
              {isPending ? "가입 중..." : "가입하기"}
            </button>
          </form>
        )}

        <p style={styles.footer}>
          이미 계정이 있나요?{" "}
          <Link href="/board/login" style={styles.link}>로그인</Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" },
  card: { width: "100%", maxWidth: 420, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "36px 32px", boxShadow: "0 4px 24px rgba(0,0,0,.07)" },
  title: { margin: "0 0 4px", fontSize: 24, fontWeight: 700, color: "#1a2b4a" },
  sub: { margin: "0 0 28px", fontSize: 14, color: "#64748b" },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  label: { fontSize: 13, fontWeight: 600, color: "#374151" },
  hint: { fontWeight: 400, color: "#94a3b8" },
  input: { padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", color: "#111827", background: "#fff" },
  error: { color: "#dc2626", fontSize: 13, margin: "4px 0 0" },
  success: { color: "#16a34a", fontSize: 15, fontWeight: 600, marginBottom: 16 },
  goLogin: { display: "inline-block", padding: "10px 20px", background: "#1a2b4a", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 600 },
  btn: { marginTop: 8, padding: "11px", background: "#1a2b4a", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer" },
  footer: { marginTop: 20, textAlign: "center", fontSize: 13, color: "#64748b" },
  link: { color: "#1a2b4a", fontWeight: 600, textDecoration: "underline" },
};
