import Link from "next/link";

import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        {/* 여기에 공통 메뉴를 만듭니다 */}
        <nav style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <Link href="/" className="nav-btn">홈</Link>
          <Link href="/about" className="nav-btn">학교 소개</Link>
          <Link href="/contact" className="nav-btn">교직원 연락처</Link>
          <Link href="/about/history" className="nav-btn">학교 연혁</Link>
          <Link href="/intro" className="nav-btn">교사 소개</Link>
          <Link href="/board" className="nav-btn">게시판</Link>
        </nav>
        <main>
          {children}
        </main>
        <footer style={{ marginTop: "20px", borderTop: "1px solid #ccc", paddingTop: "10px" }}>
          <p style={{ textAlign: "center" }}>© 2026 동해삼육고등학교. All rights reserved.</p>
        </footer>
      </body>
    </html>
  );
}
