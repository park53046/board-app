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
  const [isAdmin, setIsAdmin] = useState(false);
  const [text, setText] = useState("");
  const [needLogin, setNeedLogin] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // 선택 삭제 모드
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const r = await fetch("/api/chat", { cache: "no-store" });
      if (r.status === 401) { setNeedLogin(true); return; }
      const data = await r.json();
      if (data.ok) {
        setNeedLogin(false);
        setMe(data.me);
        setIsAdmin(data.isAdmin);
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
    if (!selectMode) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectMode]);

  const canDelete = (m: Msg) => isAdmin || m.studentId === me;

  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 20 * 1024 * 1024) { alert("이미지는 20MB 이하만 올릴 수 있어요."); return; }
    setUploading(true);
    try {
      const blob = await upload(file.name || "image.png", file, { access: "private", handleUploadUrl: "/api/files/upload" });
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
    if (item) { const file = item.getAsFile(); if (file) { e.preventDefault(); uploadImage(file); } }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content && !pendingPath) return;
    const imagePath = pendingPath;
    setText(""); setPendingPath(null); setPendingPreview(null);
    await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content, imagePath }) });
    load();
  }

  // 우클릭 → 선택 삭제 모드 진입 + 그 메시지 선택
  function onContextMenu(e: React.MouseEvent, m: Msg) {
    if (!canDelete(m)) return;
    e.preventDefault();
    setSelectMode(true);
    setSelected((prev) => new Set(prev).add(m.id));
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function exitSelect() { setSelectMode(false); setSelected(new Set()); }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`${selected.size}개를 삭제할까요?`)) return;
    await fetch("/api/chat", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: Array.from(selected) }) });
    exitSelect();
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

        {/* 선택 삭제 툴바 */}
        {selectMode && (
          <div style={styles.toolbar}>
            <span style={{ fontSize: 13, color: "#334155", fontWeight: 600 }}>
              {selected.size}개 선택됨 · 삭제할 항목을 체크하세요
            </span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button type="button" onClick={exitSelect} style={styles.cancelBtn}>취소</button>
              <button type="button" onClick={deleteSelected} disabled={selected.size === 0} style={styles.delBtn}>
                선택 삭제 ({selected.size})
              </button>
            </div>
          </div>
        )}

        <div style={styles.messages}>
          {messages.length === 0 ? (
            <p style={styles.empty}>아직 메시지가 없어요. 첫 메시지를 남겨보세요!</p>
          ) : (
            messages.map((m) => {
              const mine = m.studentId === me;
              const deletable = canDelete(m);
              const checked = selected.has(m.id);
              return (
                <div
                  key={m.id}
                  onContextMenu={(e) => onContextMenu(e, m)}
                  onClick={() => { if (selectMode && deletable) toggle(m.id); }}
                  style={{
                    ...styles.row,
                    justifyContent: mine ? "flex-end" : "flex-start",
                    cursor: selectMode && deletable ? "pointer" : "default",
                    background: checked ? "#e0edff" : "transparent",
                    borderRadius: 10,
                    padding: selectMode ? "4px 6px" : 0,
                  }}
                >
                  {selectMode && deletable && (
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(m.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ alignSelf: "center", marginRight: 8, width: 17, height: 17 }}
                    />
                  )}
                  <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
                    {!mine && <div style={styles.sender}>{m.name}</div>}
                    {m.imagePath && (
                      <a
                        href={`/api/chat/image?id=${m.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => { if (selectMode) e.preventDefault(); }}
                      >
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

        {(pendingPreview || uploading) && !selectMode && (
          <div style={styles.previewBar}>
            {uploading ? (
              <span style={{ fontSize: 13, color: "#64748b" }}>이미지 업로드 중...</span>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pendingPreview!} alt="미리보기" style={styles.previewImg} />
                <span style={{ fontSize: 13, color: "#334155" }}>이미지 첨부됨</span>
                <button type="button" onClick={() => { setPendingPath(null); setPendingPreview(null); }} style={styles.previewX}>✕</button>
              </>
            )}
          </div>
        )}

        {!selectMode && (
          <form onSubmit={send} style={styles.inputRow}>
            <label style={styles.attachBtn} title="사진 첨부">
              📎
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
            </label>
            <input value={text} onChange={(e) => setText(e.target.value)} onPaste={onPaste} placeholder="메시지 입력 (사진은 📎 또는 Ctrl+V) · 우클릭으로 삭제" maxLength={500} style={styles.input} />
            <button type="submit" style={styles.sendBtn}>전송</button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 720, margin: "48px auto", padding: "0 16px", colorScheme: "light" },
  card: { background: "#fff", border: "1px solid #efe6fb", borderRadius: 18, boxShadow: "0 10px 30px rgba(147,112,219,.18)", display: "flex", flexDirection: "column", height: "70vh", overflow: "hidden" },
  // 상단부 — 라벤더 파스텔
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "linear-gradient(90deg,#EDE4FF 0%,#FBD9EC 100%)", borderBottom: "1px solid #ecd9f5" },
  title: { margin: 0, fontSize: 19, fontWeight: 800, color: "#7C3AED" },
  back: { fontSize: 13, color: "#9061c2", fontWeight: 600, textDecoration: "none" },
  toolbar: { display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "#fff0f5", borderBottom: "1px solid #f8d3e2" },
  cancelBtn: { padding: "6px 14px", background: "#fff", border: "1px solid #e6c9de", color: "#9061c2", borderRadius: 8, fontSize: 13, cursor: "pointer" },
  delBtn: { padding: "6px 16px", background: "#F472B6", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  // 메시지창 — 라벤더→민트 파스텔 그라데이션
  messages: { flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10, background: "linear-gradient(180deg,#F6F1FF 0%,#EAF7FF 55%,#E8FBF3 100%)" },
  empty: { textAlign: "center", color: "#a99bc7", marginTop: 40, fontSize: 14 },
  row: { display: "flex" },
  sender: { fontSize: 12, color: "#8a7bb0", margin: "0 0 3px 4px", fontWeight: 700 },
  bubble: { padding: "10px 14px", borderRadius: 16, fontSize: 14, lineHeight: 1.5, wordBreak: "break-word", whiteSpace: "pre-wrap", boxShadow: "0 2px 6px rgba(120,100,170,.12)" },
  // 내 말풍선 — 은은한 보라·핑크 그라데이션
  bubbleMine: { background: "linear-gradient(135deg,#B79CF5 0%,#F19FD0 100%)", color: "#ffffff", borderBottomRightRadius: 5 },
  // 상대 말풍선 — 흰색 + 파스텔 테두리
  bubbleOther: { background: "#ffffff", color: "#4b3b6b", border: "1px solid #ecdcff", borderBottomLeftRadius: 5 },
  msgImg: { maxWidth: 240, maxHeight: 240, borderRadius: 14, border: "2px solid #fff", boxShadow: "0 4px 12px rgba(120,100,170,.2)", display: "block", cursor: "pointer", marginBottom: 4 },
  time: { fontSize: 11, color: "#b0a3cc", marginTop: 3 },
  previewBar: { display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderTop: "1px solid #f3e6c8", background: "#FFF8E7" },
  previewImg: { height: 40, width: 40, objectFit: "cover", borderRadius: 8, border: "2px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,.1)" },
  previewX: { marginLeft: "auto", background: "transparent", border: "none", color: "#c9a36a", cursor: "pointer", fontSize: 14 },
  // 입력창 — 피치 파스텔
  inputRow: { display: "flex", gap: 8, padding: "14px 16px", background: "linear-gradient(90deg,#FFF3E6 0%,#FDE9F1 100%)", borderTop: "1px solid #f6ddc9", alignItems: "center" },
  attachBtn: { fontSize: 20, cursor: "pointer", padding: "6px 8px", borderRadius: 10, userSelect: "none", background: "#ffffffaa" },
  input: { flex: 1, padding: "11px 16px", border: "1px solid #f0cdb0", borderRadius: 999, fontSize: 14, outline: "none", color: "#4b3b2b", background: "#fff" },
  sendBtn: { padding: "11px 24px", background: "linear-gradient(135deg,#A78BFA 0%,#F472B6 100%)", color: "#fff", border: "none", borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(180,120,220,.35)" },
  loginBox: { background: "#fff", border: "1px solid #efe6fb", borderRadius: 16, padding: 32, textAlign: "center", maxWidth: 360, margin: "40px auto" },
  loginBtn: { display: "inline-block", padding: "10px 20px", background: "linear-gradient(135deg,#A78BFA,#F472B6)", color: "#fff", borderRadius: 10, textDecoration: "none", fontSize: 14, fontWeight: 700 },
};
