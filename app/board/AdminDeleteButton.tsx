"use client";

/** 관리자 목록에서 게시글 삭제 버튼 */
export default function AdminDeleteButton({ action, title }: { action: () => void; title: string }) {
  return (
    <form action={action} style={{ margin: 0 }}>
      <button
        type="submit"
        style={{
          padding: "5px 12px",
          background: "#fff",
          border: "1px solid #fca5a5",
          color: "#dc2626",
          borderRadius: 8,
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
        }}
        onClick={(e) => {
          if (!confirm(`「${title}」 글을 삭제할까요?\n삭제하면 되돌릴 수 없어요.`)) e.preventDefault();
        }}
      >
        삭제
      </button>
    </form>
  );
}
