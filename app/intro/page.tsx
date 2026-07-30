// app/intro/page.tsx  (Next.js App Router)
// 또는  pages/intro.tsx  (Pages Router) — 둘 다 사용 가능
//
// 박희정(Viki Park) 프로필 소개 페이지
// 디자인 컨셉: "코드 에디터" — 정보(AI)교사의 정체성을 모노스페이스 타이포와
//             터미널 프롬프트, 라인 넘버 모티프로 표현

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// 프로젝트 설명 키워드로 아이콘(이모지) 자동 지정
function projectIcon(text: string): string {
  const t = text;
  if (t.includes("급식")) return "🍱";
  if (t.includes("감독") || t.includes("시험")) return "📝";
  if (t.includes("시간표")) return "🗓️";
  if (t.includes("바둑")) return "⚫";
  if (t.includes("오목")) return "⚪";
  if (t.includes("윷")) return "🎲";
  if (t.includes("사다리")) return "🪜";
  if (t.includes("최저가") || t.includes("물건") || t.includes("쇼핑")) return "🛒";
  if (t.includes("도서")) return "📚";
  if (t.includes("날씨") || t.includes("일기") || t.includes("예보")) return "🌤️";
  if (t.includes("미세먼지")) return "🌫️";
  if (t.includes("여행")) return "✈️";
  if (t.includes("영화") || t.includes("Movie") || t.includes("movie")) return "🎬";
  if (t.includes("MBTI") || t.includes("직업")) return "🧭";
  if (t.includes("피자") || t.includes("레시피") || t.includes("음식") || t.includes("영양") || t.includes("식단") || t.includes("다이어트")) return "🍽️";
  if (t.includes("게임")) return "🎮";
  return "🤖";
}

export default function IntroPage() {
  // 타이핑 효과용 상태
  const [typed, setTyped] = useState("");
  const fullText = "안녕하세요! AI담당 교사 ViKi입니다!";
  const isTypingDone = typed.length >= fullText.length;

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setTyped(fullText.slice(0, i + 1));
      i++;
      if (i >= fullText.length) clearInterval(timer);
    }, 70);
    return () => clearInterval(timer);
  }, []);

  // 데이터 — 여기 값만 바꾸면 내용이 갱신됩니다
  const profile = {
    name: "박희정",
    nameEn: "Viki Park",
    phone: "010-3456-1376",
    role: "AI·정보 교사",
    school: "동해삼육고등학교",
    location: "강원특별자치도 동해대로 5367",
  };

  const teaches = [
    { name: "인공지능", slug: "ai" },
    { name: "프로그래밍", slug: "programming" },
    { name: "컴퓨터그래픽", slug: "graphics" },
    { name: "데이터과학", slug: "data-science" },
  ];

  // url 이 채워진 항목만 클릭 시 새 창으로 열립니다. (빈 "" 은 일반 카드)
  const projects = [
    
    { name: "급식 조회 앱", tag: "NEIS API", desc: "학교 급식 메뉴 조회", img: "/lunch-menu.jpg", url: "https://script.google.com/macros/s/AKfycbyA2Tc3L12i33MVjNSYvX4BiRtaEQ71jrD7MtW0jYi-gtsZwCusPZbOOnglrqyeZkBXqQ/exec" },
    { name: "감독 배정 관리", tag: "GAS", desc: "시험·감독배정", img: "/work-exam.jpg", url: "https://script.google.com/macros/s/AKfycbyD6vXQbJQVxwsNSY8ht7tuYtH0VTiSmqD1LoOl7PbpupNWHJkbxMYZ9zKsNixCghnzCg/exec" },
    { name: "시간표 관리 도구", tag: "GAS", desc: "학교 시간표관리 · 수업교환", img: "/work-timetable.jpg", url: "https://script.google.com/macros/s/AKfycbx75CugxJ6aVV16iokCvRLlm6Gm5ei75BjLym_F8f1B2j6X1aaV_N7dNU7s8i6_M9Br/exec" },
    { name: "바둑 교육 게임", tag: "MCTS", desc: "바둑 공략법 익히기", img: "/work-baduk.png", url: "https://script.google.com/macros/s/AKfycbxTq1Anpxg0oDz3HtTYmRTZ92rs0qAN0S-q3XTc32VEmmjqFOw7m6Fsb3VNpf0wCkDeNg/exec" },
    { name: "바둑 교육 게임", tag: "MCTS", desc: "AI 오목 경기 도구", img: "/work-omok.jpg", url: "https://script.google.com/macros/s/AKfycbz73W8U-IAb_gvSOxPSACyn8wm7zoBdVelv3Iap5ajYswmYCffAwEkBe4kRY-dNUOX_/exec" },
    { name: "생활도우미 도구", tag: "MCTS", desc: "AI 최저가 물건찾기", img: "/work-cart.jpg", url: "https://script.google.com/macros/s/AKfycbxnUegDQQLDAQsb4pCBVE0_ZZa_RwNOJHhXYdBUwOTqHYcx8lAr536_bnRzFwUc4Bvp/exec" },
    { name: "디지털 게임 도구", tag: "MCTS", desc: "AI 디지털 윷놀이", img: "/work-yut.jpg", url: "https://script.google.com/macros/s/AKfycbx50U3cPj2b4cACdpuq1OcYFxqgr1Z9DAaEVsSArgFVw91iz4b6eUEpD3nvTiNzjONK/exec" },
    { name: "디지털 게임 도구", tag: "MCTS", desc: "AI 사다리 게임", img: "/work-ladder.jpg", url: "https://script.google.com/macros/s/AKfycbzIW5O4aEhIxpFasJ3_NhSRA25apMMovgjLNIaKwcii6vSkizEnbDSNko2dnKJnl2D1/exec" },
    { name: "AI 생활 도우미", tag: "MCTS", desc: "AI 피자 추천하기", img: "/work-pizza.png", url: "https://script.google.com/macros/s/AKfycbyOlKv_W11ZWfAFXywH4jq_eq_Bse4uMyBc3FpD32fAqyJv_sdeUiWoQyJkD21Xzl3FqA/exec" },
    { name: "AI 다이어트", tag: "MCTS", desc: "AI 음식 영양 분석 도구", img: "/work-nutrition.jpg", url: "https://script.google.com/macros/s/AKfycbxJj8bWXd_VIFKm9_Cib4qiQQbShWD3_FVHCjuLaBF4DLaiSrbZ2nRuY1QfZqhuABgvng/exec" },
    { name: "AI 다이어트", tag: "MCTS", desc: "나의 식단 맞춤형 관리", img: "/work-diet.jpg", url: "https://script.google.com/macros/s/AKfycbyGMjE6OxJ6i4NUpwEY2JZ2cNkL3ZvbvJuqYrYh92lRiqwlCOxvHE_DlMq3zCaad-H0/exec" },
    { name: "AI 레시피 추천", tag: "MCTS", desc: "음식 메뉴 레시피 추천", img: "/work-recipe.jpg", url: "https://script.google.com/macros/s/AKfycbz09q4Ze7IIPEfwJthDL_xETXLqiHBdK_W5Be-pelRw8Wu6t7qhIXvBjgoYgudETp3Y/exec" },
    { name: "AI 도서 시스템", tag: "MCTS", desc: "도서대출 관리시스템", img: "/work-book.jpg", url: "https://script.google.com/macros/s/AKfycbyHHGCgus0mHMBaUsFHFk3ITNxkGUddFFyn7yyd1Eq64PoSxQSg7TrvCjX9lUh4mkA4zg/exec" },
    { name: "AI 일기 예보 시스템", tag: "MCTS", desc: "일기예보 주간 날씨 예보", img: "/work-weather.jpg", url: "https://script.google.com/macros/s/AKfycbwyJ8qBbJQBwceUQ4ednE12aEbEs5y5prE5MzoVgclc6QfHGY_lIDhr7kgq9mKV2w8_/exec" },
    { name: "AI 미세먼지 분석 시스템", tag: "MCTS", desc: "지역별 미세먼지 분석예측", img: "/work-dust.png", url: "https://script.google.com/macros/s/AKfycbzrMs7q-Kp-Jkpfua3G1lIiYWx_OyzwOd3QAapI9v-ujBnASu3EWPjKwJSj3zwYuOkF6Q/exec"},
    { name: "AI 여행 추천", tag: "MCTS", desc: "맞춤형 수학여행 추천하기", img: "/work-trip.jpg", url: "https://script.google.com/macros/s/AKfycbwthEa7goNJi6hUGOJPLo8ZRt6-41P_giUNT0MPmoNdr6Nt850Nn2zJ68DjoQMLeqbNSQ/exec" },
    { name: "AI 영화 추천", tag: "MCTS", desc: "영화(Movie) 추천하기", img: "/work-movie.jpg", url: "https://script.google.com/macros/s/AKfycby8VyUUAu9rAdK-cZIpOI68x4bfMAZSBpQgRwYJQd2Ylrizi3qFr8VijF4QWXSCtZVN7Q/exec" },
    { name: "AI 직업 찾기", tag: "MCTS", desc: "MBTI 미래 직업찾기", img: "/work-mbti.jpg", url: "https://script.google.com/macros/s/AKfycbz7YY0DvUzVJoSBxScZ5sTpPaWfqPMzvd3NKTS7eLtFFjXpdYJj-xJ5qUkD42300mo1gQ/exec" }
  ];

  return (
    <main className="page">
      {/* ── 에디터 상단 바 ── */}
      <div className="window">
        <header className="titlebar">
          <span className="dot red" />
          <span className="dot yellow" />
          <span className="dot green" />
          <span className="titlebar-text">미래는 도전하는 자의 몫이다!</span>
        </header>

        {/* ── 본문 ── */}
        <div className="body">
          {/* HERO */}
          <section className="hero">
            <h1 className="typed">
              {typed}
              {!isTypingDone && <span className="cursor">▋</span>}
            </h1>

            <div className="namecard">
              <div className="namecard-info">
                <h2 className="name">
                  {profile.name}{" "}
                  <span className="name-en">/ {profile.nameEn}</span>
                </h2>
                <h2 className="phone">{profile.phone}</h2>
                <p className="role">{profile.role}</p>
                <p className="meta">
                  📍 {profile.school} · {profile.location}
                </p>
              </div>
              {/* 이름 우측 사진 — public/teacher.jpg 파일 필요 */}
              <img
                src="/teacher.jpg"
                alt={`${profile.name} 교사`}
                className="profile-photo"
              />
            </div>
          </section>

          {/* 소개 주석 */}
          <section className="block">
            <p className="comment">{"/* 소개 */"}</p>
            <p className="text">
              정보(AI) 과목을 가르치는 교사입니다. 학생들과 함께 코드를 짜고,
              머신러닝 모델을 만들고, 실제로 동작하는 도구를 만드는 수업을
              좋아합니다. Google Apps Script부터 Python, Next.js까지 — 배운 것을
              교육에 녹여내는 일에 열정을 가지고 있습니다.
            </p>
          </section>

          {/* 담당 과목 */}
          <section className="block">
            <p className="comment">{"// 담당 과목"}</p>
            <div className="chips">
              {teaches.map((t) => (
                <Link key={t.slug} href={`/subjects/${t.slug}`} className="subject-btn">
                  {t.name}
                </Link>
              ))}
            </div>
          </section>

          {/* 프로젝트 */}
          <section className="block">
            <p className="comment">{"// 코딩 작품 전시..ㅋㅋ (클릭하면 새 창에서 열립니다)"}</p>
            <div className="grid">
              {projects.map((p, idx) => {
                const img = (p as any).img as string | undefined;
                const inner = (
                  <>
                    {img ? (
                      <img src={img} alt={p.desc} className="card-photo" />
                    ) : (
                      <div className="card-icon">{projectIcon(p.desc + p.name)}</div>
                    )}
                    <p className="card-sub">{p.tag}</p>
                    <h3 className="card-name">{p.desc}</h3>
                  </>
                );

                // url 이 있으면 <a> 링크 카드, 없으면 일반 <article> 카드
                return p.url ? (
                  <a
                    key={`${p.name}-${idx}`}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card card-link"
                  >
                    {inner}
                  </a>
                ) : (
                  <article key={`${p.name}-${idx}`} className="card">
                    {inner}
                  </article>
                );
              })}
            </div>
          </section>

          {/* 푸터 */}
          <footer className="foot">
            <p className="prompt">
              <span className="caret">언제나 성실과 열성으로...!</span> echo
              &quot;감사합니다 🙏&quot;
            </p>
          </footer>
        </div>
      </div>

      {/* ── 스타일 ── */}
      <style jsx>{`
        .page {
          min-height: 100vh;
          background: transparent;
          display: flex;
          justify-content: center;
          padding: 32px 16px;
          font-family: "SF Mono", "JetBrains Mono", "D2Coding", Consolas,
            monospace;
        }
        .window {
          width: 100%;
          max-width: 760px;
          background: linear-gradient(165deg, #ffffff, #f1fbf6);
          backdrop-filter: blur(6px);
          border: 1px solid #cfeee0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(20, 150, 120, 0.16);
        }
        .titlebar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: linear-gradient(90deg, #dcf6ec, #eafaf3);
          border-bottom: 1px solid #cfeee0;
        }
        .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: inline-block;
        }
        .red {
          background: #ff5f56;
        }
        .yellow {
          background: #ffbd2e;
        }
        .green {
          background: #27c93f;
        }
        .filename {
          margin-left: 8px;
          color: #64748b;
          font-size: 13px;
        }
        .titlebar-text {
          margin-left: 12px;
          color: #0d9488;
          font-size: 14px;
          font-weight: 700;
        }
        .body {
          padding: 28px 28px 36px;
          color: #334155;
          line-height: 1.7;
        }
        .prompt {
          color: #0d9488;
          font-size: 14px;
          margin: 0 0 8px;
        }
        .caret {
          color: #10b981;
          margin-right: 8px;
        }
        .hero {
          margin-bottom: 36px;
        }
        .typed {
          font-size: clamp(20px, 4vw, 28px);
          color: #1e293b;
          font-weight: 700;
          margin: 0 0 24px;
          min-height: 1.4em;
        }
        .cursor {
          color: #10b981;
          animation: blink 1s step-end infinite;
        }
        @keyframes blink {
          50% {
            opacity: 0;
          }
        }
        .namecard {
          border-left: 3px solid #14b8a6;
          padding-left: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }
        .namecard-info {
          flex: 1;
          min-width: 200px;
        }
        /* 사진 크기 조절: width 값만 바꾸면 됩니다 (예: 100px, 160px) */
        .profile-photo {
          width: 130px;
          height: auto;
          border-radius: 10px;
          border: 1px solid #dbe6f2;
          background: #fff;
          object-fit: cover;
          flex-shrink: 0;
          box-shadow: 0 6px 16px rgba(80, 120, 200, 0.15);
        }
        .name {
          font-size: 22px;
          color: #1e293b;
          margin: 0 0 4px;
        }
        .name-en {
          color: #64748b;
          font-size: 16px;
          font-weight: 400;
        }
        .phone {
          font-size: 22px;
          color: #1e293b;
          margin: 0 0 4px;
        }
        .phone-en {
          color: #64748b;
          font-size: 16px;
          font-weight: 400;
        }
        .role {
          color: #0d9488;
          margin: 0 0 4px;
          font-size: 15px;
          font-weight: 600;
        }
        .meta {
          color: #64748b;
          font-size: 13px;
          margin: 0;
        }
        .block {
          margin-bottom: 32px;
        }
        .comment {
          color: #0d9488;
          font-size: 15px;
          font-weight: 600;
          margin: 0 0 12px;
        }
        .text {
          color: #334155;
          font-size: 15px;
          margin: 0;
        }
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .notice-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 480px;
        }
        .notice-select,
        .notice-input,
        .notice-textarea {
          width: 100%;
          background: #eef4fc;
          border: 1px solid #c3d3ea;
          border-radius: 8px;
          padding: 10px 12px;
          color: #111827;
          font-family: inherit;
          font-size: 14px;
          resize: vertical;
        }
        .notice-select:focus,
        .notice-input:focus,
        .notice-textarea:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
        .notice-submit {
          align-self: flex-start;
          background: linear-gradient(135deg, #6366f1, #38bdf8);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 9px 18px;
          font-size: 14px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: filter 0.15s;
        }
        .notice-submit:hover {
          filter: brightness(1.08);
        }
        .notice-submit:disabled {
          background: #e2e8f0;
          color: #94a3b8;
          cursor: default;
        }
        .notice-msg {
          margin: 10px 0 0;
          font-size: 13px;
        }
        .notice-success {
          color: #059669;
        }
        .notice-error {
          color: #dc2626;
        }
        .skills {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .skill-top {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          margin-bottom: 6px;
          color: #334155;
        }
        .pct {
          color: #94a3b8;
        }
        .bar {
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }
        .fill {
          height: 100%;
          background: linear-gradient(90deg, #6366f1, #38bdf8);
          border-radius: 4px;
          transition: width 1s ease;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 18px;
        }
        .card {
          background: #ffffff;
          border: 1px solid #d8efe6;
          border-radius: 18px;
          padding: 26px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 6px 18px rgba(80, 120, 200, 0.08);
          transition: transform 0.18s, border-color 0.18s, box-shadow 0.18s;
        }
        .card:hover {
          transform: translateY(-4px);
          border-color: #5eead4;
          box-shadow: 0 12px 28px rgba(20, 184, 166, 0.20);
        }
        .card-icon {
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          line-height: 1;
          border-radius: 16px;
          background: linear-gradient(160deg, #dbf7ee, #eafaf4);
          margin-bottom: 14px;
        }
        .card-photo {
          width: 100%;
          height: 110px;
          object-fit: cover;
          border-radius: 12px;
          margin-bottom: 14px;
        }
        .card-sub {
          font-size: 12.5px;
          color: #94a3b8;
          margin: 0 0 4px;
          font-weight: 600;
        }
        .card-name {
          font-size: 16px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
          line-height: 1.4;
        }
        .card-link {
          text-decoration: none;
          color: inherit;
          cursor: pointer;
        }
        .foot {
          margin-top: 36px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }
        @media (prefers-reduced-motion: reduce) {
          .cursor,
          .fill {
            animation: none;
            transition: none;
          }
        }
      `}</style>
    </main>
  );
}
