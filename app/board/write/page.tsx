"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createPostAction } from "../actions";

const SUBJECTS = ["인공지능", "프로그래밍", "컴퓨터그래픽", "데이터과학"];

export default function WritePage() {
  const [state, formAction, isPending] = useActionState(createPostAction, null);

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h1 style={styles.title}>소감 작성</h1>
          <Link href="/board" style={styles.back}>← 목록으로</Link>
        </div>

        <form action={formAction} style={styles.form}>
          <label style={styles.label}>과목</label>
          <select name="subject" defaultValue="" required style={styles.select}>
            <option value="" disabled>과목을 선택하세요</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <label style={styles.label}>제목</label>
          <input name="title" type="text" placeholder="제목을 입력하세요" style={styles.input} required />

          <label style={styles.label}>내용 <span style={styles.hint}>(수업 후 느낀 점, 배운 점을 자유롭게 기록하세요)</span></label>
          <textarea
            name="content"
            rows={10}
            placeholder="학습 활동 소감을 작성해주세요..."
            style={styles.textarea}
            required
          />

          {state?.ok === false && <p style={styles.error}>{state.error}</p>}

          <div style={styles.actions}>
            <Link href="/board" style={styles.cancelBtn}>취소</Link>
            <button type="submit" disabled={isPending} style={styles.submitBtn}>
              {isPending ? "등록 중..." : "소감 등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 680, margin: "0 auto", padding: "24px 16px" },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "32px", boxShadow: "0 2px 12px rgba(0,0,0,.05)" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  title: { margin: 0, fontSize: 22, fontWeight: 700, color: "#1a2b4a" },
  back: { fontSize: 13, color: "#64748b", textDecoration: "none" },
  form: { display: "flex", flexDirection: "column", gap: 14 },
  label: { fontSize: 13, fontWeight: 600, color: "#374151" },
  hint: { fontWeight: 400, color: "#94a3b8" },
  select: { padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, background: "#fff", outline: "none" },
  input: { padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none" },
  textarea: { padding: "12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, resize: "vertical", fontFamily: "inherit", outline: "none" },
  error: { color: "#dc2626", fontSize: 13 },
  actions: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 },
  cancelBtn: { padding: "10px 20px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, color: "#64748b", textDecoration: "none" },
  submitBtn: { padding: "10px 24px", background: "#1a2b4a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
};
