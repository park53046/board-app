import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, clearSession } from "@/lib/session";

import "./globals.css";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // 상단 공통 로그아웃 (로그아웃 후 홈으로)
  async function logout() {
    "use server";
    await clearSession();
    redirect("/");
  }

  return (
    <html lang="ko">
      <body>
        {/* 상단 공통 메뉴 */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
            maxWidth: "860px",
            margin: "0 auto",
            padding: "16px 20px 0",
            marginBottom: "20px",
          }}
        >
          <Link href="/" className="nav-btn">홈</Link>

          <div className="nav-dropdown">
            <Link href="/about" className="nav-btn nav-drop-trigger">학교 소개 ▾</Link>
            <div className="nav-drop-menu">
              <Link href="/contact" className="nav-sub-btn">교직원 연락처</Link>
              <Link href="/about/history" className="nav-sub-btn">학교 연혁</Link>
            </div>
          </div>

          <Link href="/intro" className="nav-btn">교사 소개</Link>
          <Link href="/board" className="nav-btn">게시판</Link>
          <Link href="/board/chat" className="nav-btn">채팅</Link>
          <Link href="/mail" className="nav-btn">메일</Link>
          <Link href="/files" className="nav-btn">자료실</Link>

          {/* 로그인 상태 영역 (오른쪽) */}
          {session ? (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ color: "#f5f5dc", fontWeight: 700, fontSize: "14px", whiteSpace: "nowrap" }}>
                {session.name}님{session.isAdmin ? " (관리자)" : ""}
              </span>
              <form action={logout}>
                <button type="submit" className="nav-btn" style={{ cursor: "pointer", fontFamily: "inherit" }}>
                  로그아웃
                </button>
              </form>
            </div>
          ) : (
            <Link href="/board/login" className="nav-btn" style={{ marginLeft: "auto" }}>
              로그인
            </Link>
          )}
        </nav>

        <main>{children}</main>

        <footer style={{ marginTop: "20px", borderTop: "1px solid #ccc", paddingTop: "10px" }}>
          <p style={{ textAlign: "center" }}>© 2026 동해삼육고등학교. All rights reserved.</p>
        </footer>
      </body>
    </html>
  );
}
