/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { logoutAction } from "./actions";

export const dynamic = "force-dynamic";

const SUBJECT_COLOR: Record<string, string> = {
  "인공지능": "#4f46e5",
  "프로그래밍": "#0891b2",
  "컴퓨터그래픽": "#7c3aed",
  "데이터과학": "#059669",
};

export default async function BoardPage() {
  const session = await getSession();
  if (!session) redirect("/board/login");

  // 관리자: 전체 글 + 작성자 정보 / 일반: 본인 글만
  const posts = session.isAdmin
    ? await (prisma as any).boardPost.findMany({
        orderBy: { createdAt: "desc" },
        include: { user: true },
      })
    : await (prisma as any).boardPost.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
      });

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            📖 학습 소감 게시판 {session.isAdmin && <span style={styles.adminBadge}>전체 관리</span>}
          </h1>
          <p style={styles.welcome}>
            안녕하세요, <strong>{session.name}</strong>님 ({session.affil})
          </p>
        </div>
        <div style={styles.headerActions}>
          {session.isAdmin ? (
            <a href="/board/admin/export" style={styles.excelBtn}>⬇ 엑셀 다운로드</a>
          ) : (
            <Link href="/board/write" style={styles.writeBtn}>+ 소감 작성</Link>
          )}
          <form action={logoutAction}>
            <button type="submit" style={styles.logoutBtn}>로그아웃</button>
          </form>
        </div>
      </div>

      {session.isAdmin ? (
        <AdminTable posts={posts} />
      ) : posts.length === 0 ? (
        <div style={styles.empty}>
          <p>아직 작성된 소감이 없습니다.</p>
          <Link href="/board/write" style={styles.writeBtn}>첫 소감 작성하기 →</Link>
        </div>
      ) : (
        <ul style={styles.list}>
          {posts.map((post: any) => (
            <li key={post.id} style={styles.item}>
              <Link href={`/board/${post.id}`} style={styles.itemLink}>
                <div style={styles.itemTop}>
                  <span style={{ ...styles.tag, background: SUBJECT_COLOR[post.subject] ?? "#64748b" }}>
                    {post.subject}
                  </span>
                  <span style={styles.date}>
                    {new Date(post.createdAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                <p style={styles.itemTitle}>{post.title}</p>
                <p style={styles.itemPreview}>
                  {String(post.content).slice(0, 60)}{String(post.content).length > 60 ? "…" : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── 관리자 전용 전체 리스트(작성자 표시) ──────────────────────
function AdminTable({ posts }: { posts: any[] }) {
  if (posts.length === 0) {
    return <p style={styles.emptyAdmin}>아직 작성된 소감이 없습니다.</p>;
  }
  return (
    <div>
      <p style={styles.count}>전체 {posts.length}건</p>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>소속</th>
              <th style={styles.th}>학번</th>
              <th style={styles.th}>성명</th>
              <th style={styles.th}>과목</th>
              <th style={styles.th}>제목</th>
              <th style={styles.th}>작성일</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} style={styles.tr}>
                <td style={styles.td}>{p.user?.affil ?? "-"}</td>
                <td style={styles.td}>{p.user?.studentId ?? "-"}</td>
                <td style={styles.td}>{p.user?.name ?? "-"}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.tag, background: SUBJECT_COLOR[p.subject] ?? "#64748b" }}>
                    {p.subject}
                  </span>
                </td>
                <td style={styles.td}>{p.title}</td>
                <td style={styles.td}>{new Date(p.createdAt).toLocaleDateString("ko-KR")}</td>
                <td style={styles.td}>
                  <Link href={`/board/${p.id}`} style={styles.viewLink}>보기</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 860, margin: "24px auto", padding: "28px 24px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,.08)", colorScheme: "light" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 },
  title: { margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#1a2b4a", display: "flex", alignItems: "center", gap: 8 },
  adminBadge: { fontSize: 12, fontWeight: 700, color: "#fff", background: "#dc2626", padding: "3px 10px", borderRadius: 20 },
  welcome: { margin: 0, fontSize: 14, color: "#475569" },
  headerActions: { display: "flex", gap: 10, alignItems: "center" },
  writeBtn: { padding: "9px 18px", background: "#1a2b4a", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 600 },
  excelBtn: { padding: "9px 18px", background: "#16794a", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 600 },
  logoutBtn: { padding: "9px 14px", background: "transparent", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, color: "#475569", cursor: "pointer" },
  empty: { textAlign: "center", padding: "60px 0", color: "#64748b", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 },
  emptyAdmin: { textAlign: "center", padding: "40px 0", color: "#64748b" },
  list: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 },
  item: { border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" },
  itemLink: { display: "block", padding: "16px 20px", textDecoration: "none", color: "inherit" },
  itemTop: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  tag: { display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "#fff" },
  date: { fontSize: 12, color: "#64748b", marginLeft: "auto" },
  itemTitle: { margin: "0 0 6px", fontSize: 16, fontWeight: 600, color: "#1e293b" },
  itemPreview: { margin: 0, fontSize: 13, color: "#475569" },
  count: { margin: "0 0 12px", fontSize: 13, color: "#475569", fontWeight: 600 },
  tableWrap: { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "12px 14px", background: "#f1f5f9", color: "#334155", fontWeight: 700, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid #f1f5f9" },
  td: { padding: "12px 14px", color: "#1e293b", verticalAlign: "middle" },
  viewLink: { color: "#1a2b4a", fontWeight: 600, textDecoration: "underline", fontSize: 13 },
};
