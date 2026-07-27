export const metadata = { title: "Soho 쇼핑몰" };

const SHOP_URL = "https://soho-shop.vercel.app";

export default function SohoPage() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px" }}>
      <iframe
        src={SHOP_URL}
        title="Soho 쇼핑몰"
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
        <a href={SHOP_URL} target="_blank" rel="noopener noreferrer" style={{ color: "#1a2b4a", textDecoration: "underline" }}>
          여기서 새 창으로 열기
        </a>
      </p>
    </div>
  );
}
