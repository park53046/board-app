"use client";

export default function DeleteButton({ action }: { action: () => void }) {
  return (
    <form action={action}>
      <button
        type="submit"
        style={{
          padding: "8px 16px",
          background: "transparent",
          border: "1px solid #fca5a5",
          color: "#dc2626",
          borderRadius: 8,
          fontSize: 13,
          cursor: "pointer",
        }}
        onClick={(e) => {
          if (!confirm("이 소감을 삭제하시겠습니까?")) e.preventDefault();
        }}
      >
        삭제
      </button>
    </form>
  );
}
