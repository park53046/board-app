/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { deletePostAction, addCommentAction, deleteCommentAction, setPraiseAction } from "../actions";
import DeleteButton from "./DeleteButton";

export const dynamic = "force-dynamic";

const SUBJECT_COLOR: Record<string, string> = {
  인공지능: "#4f46e5",
  프로그래밍: "#0891b2",
  컴퓨터그래픽: "#7c3aed",
  데이터과학: "#059669",
};
const STAMPS = ["⭐", "👍", "💯", "🌟", "❤️"];

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const isAdmin = !!session?.isAdmin;

  const { id } = await params;
  const postId = parseInt(id, 10);
  if (isNaN(postId)) notFound();

  const post = await (prisma as any).boardPost.findUnique({ where: { id: postId } });
  if (!post) notFound();

  const comments = await (prisma as any).comment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
  });

  const deleteWithId = deletePostAction.bind(null, postId);
  const isOwner = !!session && post.userId === session.userId;

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.meta}>
          <span style={{ ...styles.tag, background: SUBJECT_COLOR[post.subject as string] ?? "#64748b" }}>
            {post.subject}
          </span>
          {post.praise && (
            <span style={styles.praiseBadge}>{post.praise} 교사 칭찬</span>
          )}
          <span style={styles.date}>
            {new Date(post.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>

        <h1 style={styles.title}>{post.title}</h1>
        <div style={styles.divider} />
        <div style={styles.content}>
          {String(post.content).split("\n").map((line: string, i: number) => (
            <p key={i} style={styles.line}>{line || <br />}</p>
          ))}
        </div>

        {/* 교사 칭찬 스탬프 (관리자만) */}
        {isAdmin && (
          <div style={styles.praiseBar}>
            <span style={styles.praiseLabel}>칭찬 스탬프:</span>
            {STAMPS.map((s) => (
              <form key={s} action={setPraiseAction.bind(null, postId, s)}>
                <button
                  type="submit"
                  style={{ ...styles.stampBtn, ...(post.praise === s ? styles.stampActive : {}) }}
                >
                  {s}
                </button>
              </form>
            ))}
            {post.praise && (
              <form action={setPraiseAction.bind(null, postId, "")}>
                <button type="submit" style={styles.stampCancel}>취소</button>
              </form>
            )}
          </div>
        )}

        <div style={styles.footer}>
          <Link href="/board" style={styles.backBtn}>← 목록으로</Link>
          {isOwner && <DeleteButton action={deleteWithId} />}
        </div>
      </div>

      {/* 댓글 영역 */}
      <div style={styles.commentCard}>
        <h2 style={styles.commentTitle}>💬 교사 코멘트 <span style={styles.commentCount}>({comments.length})</span></h2>

        {comments.length === 0 ? (
          <p style={styles.noComment}>아직 코멘트가 없어요.</p>
        ) : (
          <ul style={styles.commentList}>
            {comments.map((c: any) => (
              <li key={c.id} style={styles.commentItem}>
                <div style={styles.commentHead}>
                  <span style={styles.teacherBadge}>교사</span>
                  <span style={styles.commentAuthor}>{c.authorName}</span>
                  <span style={styles.commentDate}>{new Date(c.createdAt).toLocaleDateString("ko-KR")}</span>
                  {isAdmin && (
                    <form action={deleteCommentAction.bind(null, c.id, postId)} style={{ marginLeft: "auto" }}>
                      <button type="submit" style={styles.commentDel}>삭제</button>
                    </form>
                  )}
                </div>
                <p style={styles.commentBody}>{c.content}</p>
              </li>
            ))}
          </ul>
        )}

        {isAdmin ? (
          <form action={addCommentAction.bind(null, postId)} style={styles.commentForm}>
            <textarea name="content" required rows={3} placeholder="학생에게 코멘트를 남겨주세요" style={styles.commentInput} />
            <button type="submit" style={styles.commentSubmit}>코멘트 등록</button>
          </form>
        ) : (
          <p style={styles.commentHint}>코멘트는 교사만 작성할 수 있어요.</p>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 720, margin: "0 auto", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 16, colorScheme: "light" },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "32px", boxShadow: "0 2px 12px rgba(0,0,0,.05)" },
  meta: { display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" },
  tag: { display: "inline-block", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "#fff" },
  praiseBadge: { display: "inline-block", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, color: "#b45309", background: "#FEF3C7", border: "1px solid #fcd34d" },
  date: { fontSize: 13, color: "#94a3b8" },
  title: { margin: "0 0 20px", fontSize: 22, fontWeight: 700, color: "#1e293b", lineHeight: 1.4 },
  divider: { borderTop: "1px solid #f1f5f9", margin: "20px 0" },
  content: { minHeight: 120 },
  line: { margin: "0 0 8px", fontSize: 15, color: "#334155", lineHeight: 1.8 },
  praiseBar: { display: "flex", alignItems: "center", gap: 8, marginTop: 20, padding: "12px 14px", background: "#FFFBEB", border: "1px dashed #fcd34d", borderRadius: 10, flexWrap: "wrap" },
  praiseLabel: { fontSize: 13, fontWeight: 700, color: "#b45309" },
  stampBtn: { fontSize: 20, padding: "4px 8px", background: "#fff", border: "1px solid #fcd34d", borderRadius: 8, cursor: "pointer", lineHeight: 1 },
  stampActive: { background: "#FDE68A", boxShadow: "0 0 0 2px #f59e0b inset" },
  stampCancel: { fontSize: 12, padding: "6px 10px", background: "transparent", border: "1px solid #e2e8f0", color: "#94a3b8", borderRadius: 8, cursor: "pointer" },
  footer: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, paddingTop: 20, borderTop: "1px solid #f1f5f9" },
  backBtn: { fontSize: 14, color: "#64748b", textDecoration: "none" },

  commentCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,.05)" },
  commentTitle: { margin: "0 0 16px", fontSize: 17, fontWeight: 700, color: "#1a2b4a" },
  commentCount: { fontSize: 14, color: "#64748b", fontWeight: 600 },
  noComment: { color: "#94a3b8", fontSize: 14, padding: "8px 0 16px" },
  commentList: { listStyle: "none", margin: "0 0 16px", padding: 0, display: "flex", flexDirection: "column", gap: 12 },
  commentItem: { background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 10, padding: "12px 14px" },
  commentHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },
  teacherBadge: { fontSize: 11, fontWeight: 700, color: "#fff", background: "#0891b2", padding: "2px 8px", borderRadius: 20 },
  commentAuthor: { fontSize: 13, fontWeight: 700, color: "#1e293b" },
  commentDate: { fontSize: 12, color: "#94a3b8" },
  commentDel: { fontSize: 12, background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer" },
  commentBody: { margin: 0, fontSize: 14, color: "#334155", lineHeight: 1.6, whiteSpace: "pre-wrap" },
  commentForm: { display: "flex", flexDirection: "column", gap: 8 },
  commentInput: { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, outline: "none", color: "#111827", background: "#fff", resize: "vertical", fontFamily: "inherit" },
  commentSubmit: { alignSelf: "flex-start", padding: "9px 20px", background: "#0891b2", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  commentHint: { fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "8px 0" },
};
