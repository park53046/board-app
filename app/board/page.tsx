/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const SUBJECT_COLOR: Record<string, string> = {
  "인공지능": "#4f46e5",
  "프로그래밍": "#0891b2",
  "컴퓨터그래픽": "#7c3aed",
  "데이터과학": "#059669",
};

export default async function BoardPage() {
  const session = await getSession();

  // 로그인 없이도 전체 목록을 볼 수 있음
  const posts = await (prisma as any).boardPost.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });

  // 교사 댓글을 글별로 묶기 (목록에 최신 코멘트 표시용)
  const allComments = await (prisma as any).comment.findMany({ orderBy: { createdAt: "asc" } });
  const commentMap = new Map<number, any[]>();
  for (const c of allComments) {
    const arr = commentMap.get(c.postId) ?? [];
    arr.push(c);
    commentMap.set(c.postId, arr);
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            📖 학습 소감 게시판 {session?.isAdmin && <span style={styles.adminBadge}>전체 관리</span>}
          </h1>
          <p style={styles.welcome}>전체 {posts.length}건</p>
        </div>
        <div style={styles.headerActions}>
          {session?.isAdmin ? (
            <a href="/board/admin/export" style={styles.excelBtn}>⬇ 엑셀 다운로드</a>
          ) : session ? (
            <Link href="/board/write" style={styles.writeBtn}>+ 소감 작성</Link>
          ) : (
            <Link href="/board/login" style={styles.writeBtn}>로그인하고 작성</Link>
          )}
        </div>
      </div>

      {session?.isAdmin ? (
        <AdminTable posts={posts} commentMap={commentMap} />
      ) : posts.length === 0 ? (
        <div style={styles.empty}>
          <p>아직 작성된 소감이 없습니다.</p>
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
                  <span style={styles.author}>
                    {post.user?.name ?? "-"} {post.user?.affil ? `(${post.user.affil})` : ""}
                  </span>
                  {post.praise && <span style={styles.praise}>{post.praise} 칭찬</span>}
                  <span style={styles.date}>
                    {new Date(post.createdAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                <p style={styles.itemTitle}>{post.title}</p>
                <p style={styles.itemPreview}>
                  {String(post.content).slice(0, 60)}{String(post.content).length > 60 ? "…" : ""}
                </p>
                {(() => {
                  const cs = commentMap.get(post.id) ?? [];
                  if (cs.length === 0) return null;
                  const last = cs[cs.length - 1];
                  return (
                    <div style={styles.commentPeek}>
                      <span style={styles.commentPeekBadge}>💬 교사 {last.authorName}</span>
                      <span style={styles.commentPeekText}>
                        {String(last.content).slice(0, 50)}{String(last.content).length > 50 ? "…" : ""}
                        {cs.length > 1 ? `  (외 ${cs.length - 1})` : ""}
                      </span>
                    </div>
                  );
                })()}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── 관리자 전용 전체 리스트(작성자 표시) ──────────────────────
function AdminTable({ posts, commentMap }: { posts: any[]; commentMap: Map<number, any[]> }) {
  if (posts.length === 0) {
    return <p style={styles.emptyAdmin}>아직 작성된 소감이 없습니다.</p>;
  }
  return (
    <div>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>소속</th>
              <th style={styles.th}>학번</th>
              <th style={styles.th}>성명</th>
              <th style={styles.th}>과목</th>
              <th style={styles.th}>제목</th>
              <th style={styles.th}>교사 코멘트</th>
              <th style={styles.th}>작성일</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => {
              const cs = commentMap.get(p.id) ?? [];
              const last = cs[cs.length - 1];
              return (
                <tr key={p.id} style={styles.tr}>
                  <td style={styles.td}>{p.user?.affil ?? "-"}</td>
                  <td style={styles.td}>{p.user?.studentId ?? "-"}</td>
                  <td style={styles.td}>{p.user?.name ?? "-"}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.tag, background: SUBJECT_COLOR[p.subject] ?? "#64748b" }}>
                      {p.subject}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <Link href={`/board/${p.id}`} style={styles.titleLink}>
                      {p.title}
                    </Link>{" "}
                    {p.praise && <span title="교사 칭찬">{p.praise}</span>}
                  </td>
                  <td style={styles.td}>
                    {last ? (
                      <span style={styles.commentCell}>
                        💬 {String(last.content).slice(0, 24)}{String(last.content).length > 24 ? "…" : ""}
                        {cs.length > 1 ? ` (외 ${cs.length - 1})` : ""}
                      </span>
                    ) : (
                      <span style={styles.commentEmpty}>—</span>
                    )}
                  </td>
                  <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                    {new Date(p.createdAt).toLocaleDateString("ko-KR")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 860, margin: "48px auto", padding: "28px 24px", background: "linear-gradient(180deg,#F4FBFF 0%,#F1FFF8 100%)", border: "1px solid #d7eef2", borderRadius: 18, boxShadow: "0 10px 30px rgba(20,150,160,.14)", colorScheme: "light" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, paddingBottom: 16, borderBottom: "2px dashed #cdeee6", flexWrap: "wrap", gap: 12 },
  title: { margin: "0 0 4px", fontSize: 23, fontWeight: 800, color: "#0E8F73", display: "flex", alignItems: "center", gap: 8 },
  adminBadge: { fontSize: 12, fontWeight: 700, color: "#fff", background: "#F472B6", padding: "3px 10px", borderRadius: 20 },
  welcome: { margin: 0, fontSize: 14, color: "#4b8a80", fontWeight: 600 },
  headerActions: { display: "flex", gap: 10, alignItems: "center" },
  writeBtn: { padding: "10px 18px", background: "linear-gradient(135deg,#5FBFE0,#59C7A6)", color: "#fff", borderRadius: 999, textDecoration: "none", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 12px rgba(80,180,190,.35)" },
  excelBtn: { padding: "10px 18px", background: "linear-gradient(135deg,#34D399,#10B981)", color: "#fff", borderRadius: 999, textDecoration: "none", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 12px rgba(16,185,129,.35)" },
  empty: { textAlign: "center", padding: "60px 0", color: "#6b9a90" },
  emptyAdmin: { textAlign: "center", padding: "40px 0", color: "#6b9a90" },
  list: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 },
  item: { border: "1px solid #e2f0f3", borderRadius: 14, overflow: "hidden", background: "#ffffff", boxShadow: "0 3px 10px rgba(90,150,170,.10)" },
  itemLink: { display: "block", padding: "16px 20px", textDecoration: "none", color: "inherit" },
  itemTop: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  tag: { display: "inline-block", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, color: "#fff" },
  author: { fontSize: 12, color: "#4b8a80", fontWeight: 700 },
  praise: { fontSize: 12, fontWeight: 700, color: "#b45309", background: "#FEF3C7", border: "1px solid #fcd34d", padding: "1px 8px", borderRadius: 20 },
  date: { fontSize: 12, color: "#9bb7c4", marginLeft: "auto" },
  itemTitle: { margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "#15495c" },
  itemPreview: { margin: 0, fontSize: 13, color: "#5a7d86" },
  commentPeek: { display: "flex", alignItems: "center", gap: 8, marginTop: 10, padding: "8px 12px", background: "#ECFEFF", border: "1px solid #cfeff5", borderRadius: 10, flexWrap: "wrap" },
  commentPeekBadge: { fontSize: 11, fontWeight: 700, color: "#fff", background: "#0891b2", padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" },
  commentPeekText: { fontSize: 12.5, color: "#155e6b", flex: 1, minWidth: 0 },
  tableWrap: { overflowX: "auto", border: "1px solid #d7eef2", borderRadius: 12, background: "#fff" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "12px 14px", background: "linear-gradient(90deg,#CFF5E7,#D3F0FA)", color: "#0E8F73", fontWeight: 800, borderBottom: "1px solid #c7ebe0", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid #eef7f4" },
  td: { padding: "12px 14px", color: "#1e293b", verticalAlign: "middle" },
  viewLink: { color: "#0E8F73", fontWeight: 800, textDecoration: "underline", fontSize: 15 },
  titleLink: { color: "#15495c", fontWeight: 700, textDecoration: "none", borderBottom: "1px solid #b8dfe6" },
  commentCell: { fontSize: 12.5, color: "#0e7490", fontWeight: 600, background: "#ECFEFF", border: "1px solid #cfeff5", padding: "3px 8px", borderRadius: 8, display: "inline-block" },
  commentEmpty: { color: "#c3d6dd" },
};
