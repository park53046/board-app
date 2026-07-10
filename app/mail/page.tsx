"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// 선생님 기본 받는사람 메일 (여기만 바꾸면 기본값이 바뀝니다)
const TEACHER_EMAIL = "park53046@gmail.com";

type Sent = {
  id: number;
  senderName: string | null;
  toEmail: string;
  subject: string;
  method: string;
  createdAt: string;
};

export default function MailPage() {
  const [to, setTo] = useState(TEACHER_EMAIL);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sent, setSent] = useState<Sent[]>([]);
  const [loggedIn, setLoggedIn] = useState(true);

  const canSend = to.trim() && subject.trim();

  async function loadSent() {
    try {
      const r = await fetch("/api/mail", { cache: "no-store" });
      const data = await r.json();
      if (data.ok) {
        setSent(data.items);
        setLoggedIn(data.loggedIn);
      }
    } catch {
      /* 무시 */
    }
  }

  useEffect(() => {
    loadSent();
    const t = setInterval(loadSent, 5000); // 5초마다 갱신 (다른 사람 기록도 반영)
    return () => clearInterval(t);
  }, []);

  function gmailUrl() {
    return (
      `https://mail.google.com/mail/?view=cm&fs=1` +
      `&to=${encodeURIComponent(to.trim())}` +
      `&su=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`
    );
  }

  function outlookUrl() {
    return (
      `https://outlook.office.com/mail/deeplink/compose` +
      `?to=${encodeURIComponent(to.trim())}` +
      `&subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`
    );
  }

  function send(method: "gmail" | "outlook") {
    if (!canSend) return;
    // 1) 작성창 먼저 열기 (사용자 클릭 순간에 열어야 팝업 차단 안 됨)
    window.open(method === "gmail" ? gmailUrl() : outlookUrl(), "_blank", "noopener,noreferrer");
    // 2) 기록 저장 후 목록 갱신
    fetch("/api/mail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toEmail: to.trim(), subject: subject.trim(), method }),
    }).then(() => loadSent());
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>✉️ 메일 보내기</h1>
          <Link href="/" style={styles.back}>← 홈</Link>
        </div>

        <p style={styles.notice}>
          내용을 작성하고 버튼을 누르면 <strong>본인 메일 작성창</strong>이 열려요.
          거기서 확인 후 보내면 됩니다. (비밀번호는 입력하지 않아요.)
        </p>

        <label style={styles.label}>받는 사람</label>
        <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="받는사람 이메일" style={styles.input} />

        <label style={styles.label}>제목</label>
        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="메일 제목" style={styles.input} />

        <label style={styles.label}>내용</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="메일 내용을 작성하세요" rows={9} style={styles.textarea} />

        <div style={styles.actions}>
          <button type="button" onClick={() => send("gmail")} disabled={!canSend} style={{ ...styles.btn, ...styles.gmailBtn, ...(canSend ? {} : styles.btnDisabled) }}>
            Gmail로 보내기
          </button>
          <button type="button" onClick={() => send("outlook")} disabled={!canSend} style={{ ...styles.btn, ...styles.outlookBtn, ...(canSend ? {} : styles.btnDisabled) }}>
            Outlook으로 보내기
          </button>
        </div>
        {!canSend && <p style={styles.hint}>받는 사람과 제목을 입력하면 버튼이 활성화돼요.</p>}
      </div>

      {/* 보낸 기록 */}
      <div style={styles.card}>
        <h2 style={styles.listTitle}>📋 내가 보낸 기록 <span style={styles.count}>({sent.length})</span></h2>
        {!loggedIn ? (
          <p style={styles.empty}>
            로그인하면 내가 보낸 기록이 여기에 표시돼요.{" "}
            <Link href="/board/login" style={{ color: "#1a2b4a", fontWeight: 600 }}>로그인 →</Link>
          </p>
        ) : sent.length === 0 ? (
          <p style={styles.empty}>아직 보낸 기록이 없어요.</p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>보낸 사람</th>
                  <th style={styles.th}>받는 사람</th>
                  <th style={styles.th}>제목</th>
                  <th style={styles.th}>방식</th>
                  <th style={styles.th}>시각</th>
                </tr>
              </thead>
              <tbody>
                {sent.map((s) => (
                  <tr key={s.id} style={styles.tr}>
                    <td style={styles.td}>{s.senderName ?? "익명"}</td>
                    <td style={styles.td}>{s.toEmail}</td>
                    <td style={styles.td}>{s.subject}</td>
                    <td style={styles.td}>{s.method === "outlook" ? "Outlook" : "Gmail"}</td>
                    <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                      {new Date(s.createdAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={styles.footnote}>
          ※ 이 기록은 &quot;보내기 버튼을 누른 기록&quot;이에요. 실제 발송은 각자 메일 작성창에서 &quot;보내기&quot;를 눌러야 완료됩니다.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 700, margin: "40px auto", padding: "0 16px", display: "flex", flexDirection: "column", gap: 20, colorScheme: "light" },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "28px", boxShadow: "0 4px 24px rgba(0,0,0,.08)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { margin: 0, fontSize: 22, fontWeight: 700, color: "#1a2b4a" },
  back: { fontSize: 13, color: "#64748b", textDecoration: "none" },
  notice: { fontSize: 13, color: "#475569", background: "#f1f5f9", padding: "12px 14px", borderRadius: 8, margin: "0 0 18px", lineHeight: 1.6 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", margin: "14px 0 6px" },
  input: { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", color: "#111827", background: "#fff" },
  textarea: { width: "100%", boxSizing: "border-box", padding: "12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", color: "#111827", background: "#fff", resize: "vertical", fontFamily: "inherit" },
  actions: { display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" },
  btn: { flex: 1, minWidth: 160, padding: "12px", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer" },
  gmailBtn: { background: "#16794a", color: "#fff" },
  outlookBtn: { background: "#0f6cbd", color: "#fff" },
  btnDisabled: { opacity: 0.45, cursor: "not-allowed" },
  hint: { fontSize: 12, color: "#94a3b8", margin: "12px 0 0", textAlign: "center" },
  listTitle: { margin: "0 0 14px", fontSize: 17, fontWeight: 700, color: "#1a2b4a" },
  count: { fontSize: 13, color: "#64748b", fontWeight: 600 },
  empty: { textAlign: "center", color: "#94a3b8", padding: "24px 0", fontSize: 14 },
  tableWrap: { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "10px 12px", background: "#f1f5f9", color: "#334155", fontWeight: 700, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid #f1f5f9" },
  td: { padding: "10px 12px", color: "#1e293b" },
  footnote: { fontSize: 12, color: "#94a3b8", margin: "12px 0 0", lineHeight: 1.6 },
};
