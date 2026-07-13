"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { upload } from "@vercel/blob/client";

type FileItem = {
  id: number;
  name: string;
  url: string;
  size: number;
  uploaderName: string | null;
  uploaderStudentId: string | null;
  createdAt: string;
};

const MAX = 100 * 1024 * 1024; // 100MB

function fmtSize(bytes: number) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + " KB";
  return bytes + " B";
}

export default function FilesPage() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [needLogin, setNeedLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const r = await fetch("/api/files", { cache: "no-store" });
      if (r.status === 401) {
        setNeedLogin(true);
        return;
      }
      const data = await r.json();
      if (data.ok) {
        setNeedLogin(false);
        setItems(data.items);
        setIsAdmin(data.isAdmin);
        setMe(data.me);
      }
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
      // 1) 브라우저 → Vercel Blob 직접 업로드 (비공개)
      const blob = await upload(file.name, file, {
        access: "private",
        handleUploadUrl: "/api/files/upload",
      });
      // 2) DB에 파일 정보 저장
      await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          url: blob.url,
          pathname: blob.pathname,
          size: file.size,
        }),
      });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(id: number) {
    if (!confirm("이 파일을 삭제할까요?")) return;
    await fetch(`/api/files?id=${id}`, { method: "DELETE" });
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

        <p style={styles.notice}>파일을 올리고 함께 주고받는 공간이에요. (한 파일당 최대 100MB)</p>

        <div style={styles.uploadRow}>
          <label style={{ ...styles.uploadBtn, ...(uploading ? styles.uploadBtnDisabled : {}) }}>
            {uploading ? "업로드 중..." : "＋ 파일 올리기"}
            <input ref={inputRef} type="file" onChange={handleFile} disabled={uploading} style={{ display: "none" }} />
          </label>
          <span style={styles.hint}>파일 선택 시 바로 업로드돼요</span>
        </div>
        {error && <p style={styles.error}>{error}</p>}

        {items.length === 0 ? (
          <p style={styles.empty}>아직 올라온 파일이 없어요.</p>
        ) : (
          <ul style={styles.list}>
            {items.map((f) => {
              const canDelete = isAdmin || f.uploaderStudentId === me;
              return (
                <li key={f.id} style={styles.item}>
                  <div style={styles.fileInfo}>
                    <span style={styles.fileName}>📄 {f.name}</span>
                    <span style={styles.fileMeta}>
                      {fmtSize(f.size)} · {f.uploaderName ?? "익명"} · {new Date(f.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                  <div style={styles.fileActions}>
                    <a href={`/api/files/download?id=${f.id}`} style={styles.downloadBtn}>다운로드</a>
                    {canDelete && (
                      <button type="button" onClick={() => remove(f.id)} style={styles.deleteBtn}>삭제</button>
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
  uploadRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" },
  uploadBtn: { display: "inline-block", padding: "10px 20px", background: "#1a2b4a", color: "#fff", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  uploadBtnDisabled: { opacity: 0.5, cursor: "default" },
  hint: { fontSize: 12, color: "#94a3b8" },
  error: { color: "#dc2626", fontSize: 13, margin: "6px 0 0" },
  empty: { textAlign: "center", color: "#94a3b8", padding: "40px 0", fontSize: 14 },
  list: { listStyle: "none", margin: "18px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 10 },
  item: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px", flexWrap: "wrap" },
  fileInfo: { display: "flex", flexDirection: "column", gap: 3, minWidth: 0 },
  fileName: { fontSize: 15, fontWeight: 600, color: "#1e293b", wordBreak: "break-all" },
  fileMeta: { fontSize: 12, color: "#64748b" },
  fileActions: { display: "flex", gap: 8, alignItems: "center" },
  downloadBtn: { padding: "7px 16px", background: "#16794a", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 600 },
  deleteBtn: { padding: "7px 12px", background: "transparent", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: 8, fontSize: 13, cursor: "pointer" },
  loginBox: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 32, textAlign: "center", maxWidth: 360, margin: "40px auto" },
  loginBtn: { display: "inline-block", padding: "10px 20px", background: "#1a2b4a", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 600 },
};
