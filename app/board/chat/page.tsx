"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { upload } from "@vercel/blob/client";

type Msg = {
  id: number;
  studentId: string;
  name: string;
  content: string;
  imagePath: string | null;
  createdAt: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [needLogin, setNeedLogin] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null); // 업로드된 이미지 경로
  const [pendingPreview, setPendingPreview] = useState<string | null>(null); // 미리보기용
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
      /* 폴링에서 복구 */
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 이미지 업로드 (버튼 선택 / 붙여넣기 공통)
  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 20 * 1024 * 1024) {
      alert("이미지는 20MB 이하만 올릴 수 있어요.");
      return;
    }
    setUploading(true);
    try {
      const blob = await upload(file.name || "image.png", file, {
        access: "private",
        handleUploadUrl: "/api/files/upload",
      });
      setPendingPath(blob.pathname);
      setPendingPreview(URL.createObjectURL(file));
    } catch {
      alert("이미지 업로드에 실패했어요.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    if (item) {
      const file = item.getAsFile();
      if (file) {
        e.preventDefault();
        uploadImage(file);
      }
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content && !pendingPath) return;
    const imagePath = pendingPath;
    setText("");
    setPendingPath(null);
    setPendingPreview(null);
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, imagePath }),
    });
    load();
  }

  if (needLogin) {
    return (
      <div style={styles.wrap}>
        <div style={styles.loginBox}>
          <p style={{ margin: "0 0 14px", color: "#334155" }}>채팅은 로그인 후 이용할 수 있어요.</p>
          <Link href="/board/login" style={styles.loginBtn}>로그인 하러 가기 →</Link>
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
                <div key={m.id} style={{ ...styles.row, justifyContent: mine ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
                    {!mine && <div style={styles.sender}>{m.name}</div>}
                    {m.imagePath && (
                      <a href={`/api/chat/image?id=${m.id}`} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/chat/image?id=${m.id}`} alt="첨부 이미지" style={styles.msgImg} />
                      </a>
                    )}
                    {m.content && (
                      <div style={{ ...styles.bubble, ...(mine ? styles.bubbleMine : styles.bubbleOther) }}>
                        {m.content}
                      </div>
                    )}
                    <div style={{ ...styles.time, textAlign: mine ? "right" : "left" }}>
                      {new Date(m.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* 첨부 미리보기 */}
        {(pendingPreview || uploading) && (
          <div style={styles.previewBar}>
            {uploading ? (
              <span style={{ fontSize: 13, color: "#64748b" }}>이미지 업로드 중...</span>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pendingPreview!} alt="미리보기" style={styles.previewImg} />
                <span style={{ fontSize: 13, color: "#334155" }}>이미지 첨부됨</span>
                <button
                  type="button"
                  onClick={() => { setPendingPath(null); setPendingPreview(null); }}
                  style={styles.previewX}
                >
                  ✕
                </button>
              </>
            )}
          </div>
        )}

        <form onSubmit={send} style={styles.inputRow}>
          <label style={styles.attachBtn} title="사진 첨부">
            📎
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }}
            />
          </label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={onPaste}
            placeholder="메시지 입력 (사진은 📎 또는 Ctrl+V)"
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
  msgImg: { maxWidth: 240, maxHeight: 240, borderRadius: 12, border: "1px solid #e2e8f0", display: "block", cursor: "pointer", marginBottom: 4 },
  time: { fontSize: 11, color: "#94a3b8", marginTop: 3 },
  previewBar: { display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" },
  previewImg: { height: 40, width: 40, objectFit: "cover", borderRadius: 6, border: "1px solid #d1d5db" },
  previewX: { marginLeft: "auto", background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14 },
  inputRow: { display: "flex", gap: 8, padding: "14px 16px", borderTop: "1px solid #e2e8f0", alignItems: "center" },
  attachBtn: { fontSize: 20, cursor: "pointer", padding: "6px 8px", borderRadius: 8, userSelect: "none" },
  input: { flex: 1, padding: "11px 14px", border: "1px solid #d1d5db", borderRadius: 999, fontSize: 14, outline: "none", color: "#111827", background: "#fff" },
  sendBtn: { padding: "11px 22px", background: "#1a2b4a", color: "#fff", border: "none", borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  loginBox: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 32, textAlign: "center", maxWidth: 360, margin: "40px auto" },
  loginBtn: { display: "inline-block", padding: "10px 20px", background: "#1a2b4a", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 600 },
};
