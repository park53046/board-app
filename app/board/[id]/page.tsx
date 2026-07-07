import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { deletePostAction } from "../actions";
import DeleteButton from "./DeleteButton";

export const dynamic = "force-dynamic";

const SUBJECT_COLOR: Record<string, string> = {
  인공지능: "#4f46e5",
  프로그래밍: "#0891b2",
  컴퓨터그래픽: "#7c3aed",
  데이터과학: "#059669",
};

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/board/login");

  const { id } = await params;
  const postId = parseInt(id, 10);
  if (isNaN(postId)) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const post = await (prisma as any).boardPost.findUnique({ where: { id: postId } });
  if (!post) notFound();

  // 본인 글이 아니면 접근 불가 (단, 관리자는 전체 열람 가능)
  if (post.userId !== session.userId && !session.isAdmin) redirect("/board");

  const deleteWithId = deletePostAction.bind(null, postId);
  const isOwner = post.userId === session.userId;

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        {/* 상단 */}
        <div style={styles.meta}>
          <span
            style={{
              ...styles.tag,
              background: SUBJECT_COLOR[post.subject as string] ?? "#64748b",
            }}
          >
            {post.subject}
          </span>
          <span style={styles.date}>
            {new Date(post.createdAt).toLocaleDateString("ko-KR", {
              year: "numeric", month: "long", day: "numeric",
            })}
          </span>
        </div>

        <h1 style={styles.title}>{post.title}</h1>

        <div style={styles.divider} />

        <div style={styles.content}>
          {String(post.content).split("\n").map((line: string, i: number) => (
            <p key={i} style={styles.line}>{line || <br />}</p>
          ))}
        </div>

        {/* 하단 버튼 */}
        <div style={styles.footer}>
          <Link href="/board" style={styles.backBtn}>← 목록으로</Link>
          {isOwner && <DeleteButton action={deleteWithId} />}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 720, margin: "0 auto", padding: "24px 16px" },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "32px", boxShadow: "0 2px 12px rgba(0,0,0,.05)" },
  meta: { display: "flex", alignItems: "center", gap: 10, marginBottom: 14 },
  tag: { display: "inline-block", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "#fff" },
  date: { fontSize: 13, color: "#94a3b8" },
  title: { margin: "0 0 20px", fontSize: 22, fontWeight: 700, color: "#1e293b", lineHeight: 1.4 },
  divider: { borderTop: "1px solid #f1f5f9", margin: "20px 0" },
  content: { minHeight: 160 },
  line: { margin: "0 0 8px", fontSize: 15, color: "#334155", lineHeight: 1.8 },
  footer: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32, paddingTop: 20, borderTop: "1px solid #f1f5f9" },
  backBtn: { fontSize: 14, color: "#64748b", textDecoration: "none" },
  deleteBtn: { padding: "8px 16px", background: "transparent", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: 8, fontSize: 13, cursor: "pointer" },
};
