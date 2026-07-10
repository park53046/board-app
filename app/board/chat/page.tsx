"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Msg = {
  id: number;
  studentId: string;
  name: string;
  content: string;
  createdAt: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [needLogin, setNeedLogin] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const r = await fetch("/api/chat", { cache: "no-store" });
      if (r.status === 401) {
        setNeedLogin(true);
        return;
      }
      const data = await r.json();
      if (data.ok) {
        setNeedLogin(false);
        setMe(data.me);
        setMessages(data.messages);
      }
    } catch {
      /* 네트워크 일시 오류는 무시 (다음 폴링에서 복구) */
    }
  }

  // 2초마다 새 메시지 폴링
  useEffect(() => {
    load();
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, []);

  // 새 메시지 오면 맨 아래로 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText("");
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    load(); // 보내자마자 즉시 갱신
  }

  if (needLogin) {
    return (
      <div style={styles.wrap}>
        <div style={styles.loginBox}>
          <p style={{ margin: "0 0 14px", color: "#334155" }}>
            채팅은 로그인 후 이용할 수 있어요.
          </p>
          <Link href="/board/login" style={styles.loginBtn}>
            로그인 하러 가기 →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>💬 실시간 채팅</h1>
          <Link href="/board" style={styles.back}>← 게시판</Link>
        </div>

        <div style={styles.messages}>
          {messages.length === 0 ? (
            <p style={styles.empty}>아직 메시지가 없어요. 첫 메시지를 남겨보세요!</p>
          ) : (
            messages.map((m) => {
              const mine = m.studentId === me;
              return (
                <div
                  key={m.id}
                  style={{ ...styles.row, justifyContent: mine ? "flex-end" : "flex-start" }}
                >
                  <div style={{ maxWidth: "75%" }}>
                    {!mine && <div style={styles.sender}>{m.name}</div>}
                    <div style={{ ...styles.bubble, ...(mine ? styles.bubbleMine : styles.bubbleOther) }}>
                      {m.content}
                    </div>
                    <div style={{ ...styles.time, textAlign: mine ? "right" : "left" }}>
                      {new Date(m.createdAt).toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} style={styles.inputRow}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="메시지를 입력하세요"
            maxLength={500}
            style={styles.input}
          />
          <button type="submit" style={styles.sendBtn}>전송</button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 720, margin: "48px auto", padding: "0 16px", colorScheme: "light" },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,.08)", display: "flex", flexDirection: "column", height: "70vh" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e2e8f0" },
  title: { margin: 0, fontSize: 18, fontWeight: 700, color: "#1a2b4a" },
  back: { fontSize: 13, color: "#64748b", textDecoration: "none" },
  messages: { flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10, background: "#f8fafc" },
  empty: { textAlign: "center", color: "#94a3b8", marginTop: 40, fontSize: 14 },
  row: { display: "flex" },
  sender: { fontSize: 12, color: "#64748b", margin: "0 0 3px 4px", fontWeight: 600 },
  bubble: { padding: "9px 13px", borderRadius: 14, fontSize: 14, lineHeight: 1.5, wordBreak: "break-word", whiteSpace: "pre-wrap" },
  bubbleMine: { background: "#1a2b4a", color: "#fff", borderBottomRightRadius: 4 },
  bubbleOther: { background: "#fff", color: "#1e293b", border: "1px solid #e2e8f0", borderBottomLeftRadius: 4 },
  time: { fontSize: 11, color: "#94a3b8", marginTop: 3 },
  inputRow: { display: "flex", gap: 8, padding: "14px 16px", borderTop: "1px solid #e2e8f0" },
  input: { flex: 1, padding: "11px 14px", border: "1px solid #d1d5db", borderRadius: 999, fontSize: 14, outline: "none", color: "#111827", background: "#fff" },
  sendBtn: { padding: "11px 22px", background: "#1a2b4a", color: "#fff", border: "none", borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  loginBox: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 32, textAlign: "center", maxWidth: 360, margin: "40px auto" },
  loginBtn: { display: "inline-block", padding: "10px 20px", background: "#1a2b4a", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 600 },
};
