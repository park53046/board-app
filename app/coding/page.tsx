export const metadata = { title: "코딩 교실" };

export default function CodingPage() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px" }}>
      <iframe
        src="https://honjobs.com/54"
        title="코딩 교실"
        style={{
          width: "100%",
          height: "85vh",
          border: "1px solid #cbd5e1",
          borderRadius: 10,
          background: "#fff",
        }}
      />
      <p style={{ fontSize: 12, color: "#94a3b8", margin: "8px 0 0", textAlign: "center" }}>
        화면이 안 보이면{" "}
        <a href="https://honjobs.com/54" target="_blank" rel="noopener noreferrer" style={{ color: "#1a2b4a", textDecoration: "underline" }}>
          여기서 새 창으로 열기
        </a>
      </p>
    </div>
  );
}
