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
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
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
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError(null);

    // 용량 초과 파일 걸러내기
    const tooBig = files.filter((f) => f.size > MAX);
    const okFiles = files.filter((f) => f.size <= MAX);
    if (tooBig.length > 0) {
      setError(`100MB를 넘는 파일은 제외했어요: ${tooBig.map((f) => f.name).join(", ")}`);
    }
    if (okFiles.length === 0) {
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    const failed: string[] = [];
    try {
      for (let i = 0; i < okFiles.length; i++) {
        const file = okFiles[i];
        setProgress(`${okFiles.length}개 중 ${i + 1}번째 올리는 중… (${file.name})`);
        try {
          const blob = await upload(file.name, file, { access: "private", handleUploadUrl: "/api/files/upload" });
          await fetch("/api/files", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: file.name, url: blob.url, pathname: blob.pathname, size: file.size }),
          });
        } catch {
          failed.push(file.name);
        }
      }
      if (failed.length > 0) {
        setError(`업로드 실패: ${failed.join(", ")}`);
      }
      await load();
    } finally {
      setUploading(false);
      setProgress("");
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

  function rowKey(row: Row) {
    return `${row.kind}-${row.id}`;
  }

  function toggleOne(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function deleteSelected(deletableKeys: string[]) {
    const targets = rows.filter((r) => selected.has(rowKey(r)) && deletableKeys.includes(rowKey(r)));
    if (targets.length === 0) return;
    if (!confirm(`선택한 ${targets.length}개를 삭제할까요?`)) return;
    for (const row of targets) {
      const endpoint = row.kind === "file" ? "/api/files" : "/api/drive";
      await fetch(`${endpoint}?id=${row.id}`, { method: "DELETE" });
    }
    setSelected(new Set());
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
            {uploading ? "업로드 중..." : "＋ 파일 올리기 (여러 장 가능)"}
            <input ref={inputRef} type="file" multiple onChange={handleFile} disabled={uploading} style={{ display: "none" }} />
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

        {uploading && progress && <p style={styles.progress}>{progress}</p>}
        {error && <p style={styles.error}>{error}</p>}

        {rows.length === 0 ? (
          <p style={styles.empty}>아직 올라온 자료가 없어요.</p>
        ) : (() => {
          const deletableKeys = rows.filter((r) => isAdmin || r.uploaderStudentId === me).map(rowKey);
          const selectedCount = deletableKeys.filter((k) => selected.has(k)).length;
          const allSelected = deletableKeys.length > 0 && deletableKeys.every((k) => selected.has(k));
          const toggleAll = () =>
            setSelected(allSelected ? new Set() : new Set(deletableKeys));
          return (
            <div style={styles.tableBox}>
              <div style={styles.listHead}>
                <span style={styles.listCount}>전체 {rows.length}개{selectedCount > 0 ? ` · ${selectedCount}개 선택` : ""}</span>
                <button
                  type="button"
                  onClick={() => deleteSelected(deletableKeys)}
                  disabled={selectedCount === 0}
                  style={{ ...styles.bulkDelete, ...(selectedCount === 0 ? styles.bulkDisabled : {}) }}
                >
                  🗑 선택 삭제
                </button>
              </div>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, width: 34, textAlign: "center" }}>
                        {deletableKeys.length > 0 && (
                          <input type="checkbox" checked={allSelected} onChange={toggleAll} style={styles.checkbox} />
                        )}
                      </th>
                      <th style={{ ...styles.th, width: 34, textAlign: "center" }}>#</th>
                      <th style={styles.th}>이름</th>
                      <th style={{ ...styles.th, width: 72, textAlign: "right" }}>크기</th>
                      <th style={{ ...styles.th, width: 70, whiteSpace: "nowrap" }}>올린이</th>
                      <th style={{ ...styles.th, width: 92, whiteSpace: "nowrap" }}>날짜</th>
                      <th style={{ ...styles.th, width: 64, textAlign: "center" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const key = rowKey(row);
                      const canDelete = isAdmin || row.uploaderStudentId === me;
                      const checked = selected.has(key);
                      return (
                        <tr key={key} style={{ ...styles.trow, ...(checked ? styles.trowChecked : {}) }}>
                          <td style={{ ...styles.tdc, textAlign: "center" }}>
                            {canDelete && (
                              <input type="checkbox" checked={checked} onChange={() => toggleOne(key)} style={styles.checkbox} />
                            )}
                          </td>
                          <td style={{ ...styles.tdc, textAlign: "center", color: "#94a3b8" }}>{i + 1}</td>
                          <td style={styles.tdc}>
                            <span style={styles.fname}>
                              {row.kind === "file" ? "📄" : "🔗"}{" "}
                              {row.kind === "file" ? row.name : row.title}
                            </span>
                            {row.kind === "link" && row.note && <span style={styles.fnote}> — {row.note}</span>}
                          </td>
                          <td style={{ ...styles.tdc, textAlign: "right", color: "#64748b", whiteSpace: "nowrap" }}>
                            {row.kind === "file" ? fmtSize(row.size) : "링크"}
                          </td>
                          <td style={{ ...styles.tdc, color: "#64748b", whiteSpace: "nowrap" }}>{row.uploaderName ?? "익명"}</td>
                          <td style={{ ...styles.tdc, color: "#94a3b8", whiteSpace: "nowrap" }}>
                            {new Date(row.createdAt).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}
                          </td>
                          <td style={{ ...styles.tdc, textAlign: "center" }}>
                            {row.kind === "file" ? (
                              <a href={`/api/files/download?id=${row.id}`} style={styles.dlMini} title="다운로드">⬇</a>
                            ) : (
                              <a href={row.url} target="_blank" rel="noopener noreferrer" style={styles.dlMini} title="열기">↗</a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
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
  progress: { color: "#0e7490", fontSize: 13, fontWeight: 600, margin: "6px 0 0" },
  empty: { textAlign: "center", color: "#94a3b8", padding: "40px 0", fontSize: 14 },
  tableBox: { marginTop: 18 },
  listHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  listCount: { fontSize: 13, color: "#64748b", fontWeight: 600 },
  bulkDelete: { padding: "6px 14px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  bulkDisabled: { background: "#e2e8f0", color: "#94a3b8", cursor: "default" },
  tableWrap: { border: "1px solid #e2e8f0", borderRadius: 10, overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "8px 10px", background: "#f8fafc", color: "#475569", fontWeight: 700, borderBottom: "1px solid #e2e8f0", fontSize: 12, whiteSpace: "nowrap" },
  trow: { borderBottom: "1px solid #f1f5f9" },
  trowChecked: { background: "#eff6ff" },
  tdc: { padding: "7px 10px", color: "#1e293b", verticalAlign: "middle" },
  checkbox: { width: 15, height: 15, cursor: "pointer", accentColor: "#0f6cbd" },
  fname: { fontWeight: 600, color: "#1e293b", wordBreak: "break-all" },
  fnote: { color: "#64748b", fontSize: 12 },
  dlMini: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, background: "#16794a", color: "#fff", borderRadius: 6, textDecoration: "none", fontSize: 14, fontWeight: 700 },
  loginBox: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 32, textAlign: "center", maxWidth: 360, margin: "40px auto" },
  loginBtn: { display: "inline-block", padding: "10px 20px", background: "#1a2b4a", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 600 },
};
