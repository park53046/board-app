/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { deletePostAction, setPraiseAction } from "../actions";
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
          {(isOwner || isAdmin) && <DeleteButton action={deleteWithId} />}
        </div>
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

};
