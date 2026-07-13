"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { upload } from "@vercel/blob/client";

type FileRow = {
  kind: "file";
  id: number;
  name: string;
  size: number;
  uploaderName: string | null;
  uploaderStudentId: string | null;
  createdAt: string;
};
type LinkRow = {
  kind: "link";
  id: number;
  title: string;
  url: string;
  note: string | null;
  uploaderName: string | null;
  uploaderStudentId: string | null;
  createdAt: string;
};
type Row = FileRow | LinkRow;

const MAX = 100 * 1024 * 1024; // 100MB

function fmtSize(bytes: number) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + " KB";
  return bytes + " B";
}

export default function FilesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [needLogin, setNeedLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 링크 추가 폼
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkNote, setLinkNote] = useState("");
  const [savingLink, setSavingLink] = useState(false);

  async function load() {
    try {
      const [fRes, dRes] = await Promise.all([
        fetch("/api/files", { cache: "no-store" }),
        fetch("/api/drive", { cache: "no-store" }),
      ]);
      if (fRes.status === 401 || dRes.status === 401) {
        setNeedLogin(true);
        return;
      }
      const f = await fRes.json();
      const d = await dRes.json();
      if (f.ok) {
        setIsAdmin(f.isAdmin);
        setMe(f.me);
      }
      const fileRows: Row[] = (f.items ?? []).map((x: any) => ({ ...x, kind: "file" }));
      const linkRows: Row[] = (d.items ?? []).map((x: any) => ({ ...x, kind: "link" }));
      const merged = [...fileRows, ...linkRows].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setNeedLogin(false);
      setRows(merged);
    } catch {
      /* 무시 */
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > MAX) {
      setError(`파일이 너무 큽니다 (${fmtSize(file.size)}). 100MB 이하만 올릴 수 있어요.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const blob = await upload(file.name, file, { access: "private", handleUploadUrl: "/api/files/upload" });
      await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, url: blob.url, pathname: blob.pathname, size: file.size }),
      });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!linkTitle.trim() || !linkUrl.trim()) {
      setError("제목과 링크를 입력하세요.");
      return;
    }
    setSavingLink(true);
    const r = await fetch("/api/drive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: linkTitle, url: linkUrl, note: linkNote }),
    });
    setSavingLink(false);
    if (r.ok) {
      setLinkTitle("");
      setLinkUrl("");
      setLinkNote("");
      setShowLinkForm(false);
      load();
    } else {
      const d = await r.json().catch(() => ({}));
      setError(d.error ?? "링크 등록 실패");
    }
  }

  async function removeRow(row: Row) {
    if (!confirm("삭제할까요?")) return;
    const endpoint = row.kind === "file" ? "/api/files" : "/api/drive";
    await fetch(`${endpoint}?id=${row.id}`, { method: "DELETE" });
    load();
  }

  if (needLogin) {
    return (
      <div style={styles.wrap}>
        <div style={styles.loginBox}>
          <p style={{ margin: "0 0 14px", color: "#334155" }}>자료실은 로그인 후 이용할 수 있어요.</p>
          <Link href="/board/login" style={styles.loginBtn}>로그인 하러 가기 →</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>📁 자료실</h1>
          <Link href="/" style={styles.back}>← 홈</Link>
        </div>

        <p style={styles.notice}>
          파일을 직접 올리거나(최대 100MB), 용량이 크면 <strong>구글드라이브 링크</strong>를 등록해 공유하세요.
        </p>

        <div style={styles.uploadRow}>
          <label style={{ ...styles.uploadBtn, ...(uploading ? styles.disabled : {}) }}>
            {uploading ? "업로드 중..." : "＋ 파일 올리기"}
            <input ref={inputRef} type="file" onChange={handleFile} disabled={uploading} style={{ display: "none" }} />
          </label>
          <button type="button" onClick={() => setShowLinkForm((v) => !v)} style={styles.linkBtn}>
            🔗 대용량 링크 추가
          </button>
        </div>

        {showLinkForm && (
          <form onSubmit={addLink} style={styles.linkForm}>
            <input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="자료 제목" style={styles.input} />
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="링크 (https://drive.google.com/...)" style={styles.input} />
            <input value={linkNote} onChange={(e) => setLinkNote(e.target.value)} placeholder="간단 설명 (선택)" style={styles.input} />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={savingLink} style={styles.addLinkBtn}>{savingLink ? "등록 중..." : "링크 등록"}</button>
              <button type="button" onClick={() => setShowLinkForm(false)} style={styles.cancelBtn}>취소</button>
            </div>
          </form>
        )}

        {error && <p style={styles.error}>{error}</p>}

        {rows.length === 0 ? (
          <p style={styles.empty}>아직 올라온 자료가 없어요.</p>
        ) : (
          <ul style={styles.list}>
            {rows.map((row) => {
              const canDelete = isAdmin || row.uploaderStudentId === me;
              return (
                <li key={`${row.kind}-${row.id}`} style={styles.item}>
                  <div style={styles.info}>
                    {row.kind === "file" ? (
                      <>
                        <span style={styles.name}>📄 {row.name}</span>
                        <span style={styles.meta}>
                          {fmtSize(row.size)} · {row.uploaderName ?? "익명"} · {new Date(row.createdAt).toLocaleDateString("ko-KR")}
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={styles.name}>🔗 {row.title}</span>
                        {row.note && <span style={styles.note}>{row.note}</span>}
                        <span style={styles.meta}>
                          링크 · {row.uploaderName ?? "익명"} · {new Date(row.createdAt).toLocaleDateString("ko-KR")}
                        </span>
                      </>
                    )}
                  </div>
                  <div style={styles.actions}>
                    {row.kind === "file" ? (
                      <a href={`/api/files/download?id=${row.id}`} style={styles.downloadBtn}>다운로드</a>
                    ) : (
                      <a href={row.url} target="_blank" rel="noopener noreferrer" style={styles.openBtn}>열기 ↗</a>
                    )}
                    {canDelete && (
                      <button type="button" onClick={() => removeRow(row)} style={styles.deleteBtn}>삭제</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 720, margin: "40px auto", padding: "0 16px", colorScheme: "light" },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "28px", boxShadow: "0 4px 24px rgba(0,0,0,.08)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  title: { margin: 0, fontSize: 22, fontWeight: 700, color: "#1a2b4a" },
  back: { fontSize: 13, color: "#64748b", textDecoration: "none" },
  notice: { fontSize: 13, color: "#475569", background: "#f1f5f9", padding: "12px 14px", borderRadius: 8, margin: "0 0 18px", lineHeight: 1.6 },
  uploadRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" },
  uploadBtn: { display: "inline-block", padding: "10px 20px", background: "#1a2b4a", color: "#fff", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  linkBtn: { padding: "10px 18px", background: "#0f6cbd", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  disabled: { opacity: 0.5, cursor: "default" },
  linkForm: { display: "flex", flexDirection: "column", gap: 8, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, margin: "12px 0" },
  input: { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", color: "#111827", background: "#fff" },
  addLinkBtn: { padding: "9px 18px", background: "#1a2b4a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  cancelBtn: { padding: "9px 14px", background: "transparent", border: "1px solid #cbd5e1", color: "#64748b", borderRadius: 8, fontSize: 14, cursor: "pointer" },
  error: { color: "#dc2626", fontSize: 13, margin: "6px 0 0" },
  empty: { textAlign: "center", color: "#94a3b8", padding: "40px 0", fontSize: 14 },
  list: { listStyle: "none", margin: "18px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 10 },
  item: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px", flexWrap: "wrap" },
  info: { display: "flex", flexDirection: "column", gap: 3, minWidth: 0 },
  name: { fontSize: 15, fontWeight: 600, color: "#1e293b", wordBreak: "break-all" },
  note: { fontSize: 13, color: "#475569" },
  meta: { fontSize: 12, color: "#64748b" },
  actions: { display: "flex", gap: 8, alignItems: "center" },
  downloadBtn: { padding: "7px 16px", background: "#16794a", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 600 },
  openBtn: { padding: "7px 16px", background: "#0f6cbd", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 600 },
  deleteBtn: { padding: "7px 12px", background: "transparent", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: 8, fontSize: 13, cursor: "pointer" },
  loginBox: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 32, textAlign: "center", maxWidth: 360, margin: "40px auto" },
  loginBtn: { display: "inline-block", padding: "10px 20px", background: "#1a2b4a", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 600 },
};
