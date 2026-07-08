// app/intro/page.tsx  (Next.js App Router)
// 또는  pages/intro.tsx  (Pages Router) — 둘 다 사용 가능
//
// 박희정(Viki Park) 프로필 소개 페이지
// 디자인 컨셉: "코드 에디터" — 정보(AI)교사의 정체성을 모노스페이스 타이포와
//             터미널 프롬프트, 라인 넘버 모티프로 표현

"use client";

import { useState, useEffect, useRef } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { addNoticeAction } from "./actions";

export default function IntroPage() {
  // 타이핑 효과용 상태
  const [typed, setTyped] = useState("");
  const fullText = "안녕하세요, AI담당 교사 ViKi입니다.";
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
    role: "AI · 정보 교사",
    school: "동해삼육고등학교",
    location: "강원특별자치도 동해대로 5367",
  };

  const teaches = [
    { name: "인공지능", slug: "ai" },
    { name: "프로그래밍", slug: "programming" },
    { name: "컴퓨터그래픽", slug: "graphics" },
    { name: "데이터과학", slug: "data-science" },
  ];

  // 공지사항 작성 폼
  const [noticeState, noticeFormAction, isNoticePending] = useActionState(
    addNoticeAction,
    null
  );
  const noticeFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (noticeState?.ok) {
      noticeFormRef.current?.reset();
    }
  }, [noticeState]);

  const skills = [
    { label: "Python", level: 90 },
    { label: "Google Apps Script", level: 95 },
    { label: "머신러닝 / CNN", level: 80 },
    { label: "Next.js / 웹", level: 70 },
    { label: "Illustrator", level: 75 },
  ];

  // url 이 채워진 항목만 클릭 시 새 창으로 열립니다. (빈 "" 은 일반 카드)
  const projects = [
    
    { name: "급식 조회 앱", tag: "NEIS API", desc: "학교 급식 메뉴 조회", url: "https://script.google.com/macros/s/AKfycbyA2Tc3L12i33MVjNSYvX4BiRtaEQ71jrD7MtW0jYi-gtsZwCusPZbOOnglrqyeZkBXqQ/exec" },
    { name: "감독배정 관리", tag: "GAS", desc: "시험·감독배정", url: "https://script.google.com/macros/s/AKfycbyD6vXQbJQVxwsNSY8ht7tuYtH0VTiSmqD1LoOl7PbpupNWHJkbxMYZ9zKsNixCghnzCg/exec" },
    { name: "시간표 관리", tag: "GAS", desc: "시간표관리 · 수업교환", url: "https://script.google.com/macros/s/AKfycbyJO7IoZ6qR7sYJ8ttJ0XM7G6AB5K6fg9AerNm_ehbWGzA0X8T3DdVXl68D4gIHP9dJ/exec" },
    { name: "바둑 교육 게임", tag: "MCTS", desc: "바둑 공략법 익히기", url: "https://script.google.com/macros/s/AKfycbxTq1Anpxg0oDz3HtTYmRTZ92rs0qAN0S-q3XTc32VEmmjqFOw7m6Fsb3VNpf0wCkDeNg/exec" },
    { name: "바둑 교육 게임", tag: "MCTS", desc: "AI 오목 경기 도구", url: "https://script.google.com/macros/s/AKfycbz73W8U-IAb_gvSOxPSACyn8wm7zoBdVelv3Iap5ajYswmYCffAwEkBe4kRY-dNUOX_/exec" },
    { name: "생활도우미 도구", tag: "MCTS", desc: "AI 최저가 물건찾기", url: "https://script.google.com/macros/s/AKfycbxnUegDQQLDAQsb4pCBVE0_ZZa_RwNOJHhXYdBUwOTqHYcx8lAr536_bnRzFwUc4Bvp/exec" },
    { name: "디지털 게임 도구", tag: "MCTS", desc: "AI 디지털 윷놀이", url: "https://script.google.com/macros/s/AKfycbx50U3cPj2b4cACdpuq1OcYFxqgr1Z9DAaEVsSArgFVw91iz4b6eUEpD3nvTiNzjONK/exec" },
    { name: "디지털 게임 도구", tag: "MCTS", desc: "AI 사다리 게임", url: "https://script.google.com/macros/s/AKfycbzIW5O4aEhIxpFasJ3_NhSRA25apMMovgjLNIaKwcii6vSkizEnbDSNko2dnKJnl2D1/exec" },
    { name: "AI 생활 도우미", tag: "MCTS", desc: "AI 피자 추천하기", url: "https://script.google.com/macros/s/AKfycbyOlKv_W11ZWfAFXywH4jq_eq_Bse4uMyBc3FpD32fAqyJv_sdeUiWoQyJkD21Xzl3FqA/exec" },
    { name: "AI 다이어트", tag: "MCTS", desc: "AI 음식 영양 분석 도구", url: "https://script.google.com/macros/s/AKfycbxJj8bWXd_VIFKm9_Cib4qiQQbShWD3_FVHCjuLaBF4DLaiSrbZ2nRuY1QfZqhuABgvng/exec" },
    { name: "AI 다이어트", tag: "MCTS", desc: "나의 식단 맞춤형 관리", url: "https://script.google.com/macros/s/AKfycbyGMjE6OxJ6i4NUpwEY2JZ2cNkL3ZvbvJuqYrYh92lRiqwlCOxvHE_DlMq3zCaad-H0/exec" },
    { name: "AI 레시피 추천", tag: "MCTS", desc: "음식 메뉴 레시피 추천", url: "https://script.google.com/macros/s/AKfycbz09q4Ze7IIPEfwJthDL_xETXLqiHBdK_W5Be-pelRw8Wu6t7qhIXvBjgoYgudETp3Y/exec" },
    { name: "AI 도서 시스템", tag: "MCTS", desc: "도서대출 관리시스템", url: "https://script.google.com/macros/s/AKfycbyHHGCgus0mHMBaUsFHFk3ITNxkGUddFFyn7yyd1Eq64PoSxQSg7TrvCjX9lUh4mkA4zg/exec" },
    { name: "AI 일기 예보 시스템", tag: "MCTS", desc: "일기예보 주간 날씨 예보", url: "https://script.google.com/macros/s/AKfycbwyJ8qBbJQBwceUQ4ednE12aEbEs5y5prE5MzoVgclc6QfHGY_lIDhr7kgq9mKV2w8_/exec" },
    { name: "AI 미세먼지 분석 시스템", tag: "MCTS", desc: "지역별 미세먼지 분석예측", url: "https://script.google.com/macros/s/AKfycbzrMs7q-Kp-Jkpfua3G1lIiYWx_OyzwOd3QAapI9v-ujBnASu3EWPjKwJSj3zwYuOkF6Q/exec"}
  ];

  return (
    <main className="page">
      {/* ── 에디터 상단 바 ── */}
      <div className="window">
        <header className="titlebar">
          <span className="dot red" />
          <span className="dot yellow" />
          <span className="dot green" />
          <span className="filename">intro.tsx</span>
        </header>

        {/* ── 본문 ── */}
        <div className="body">
          {/* HERO */}
          <section className="hero">
            <p className="prompt">
              <span className="caret">~/profile $</span> whoami
            </p>
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

          {/* 공지사항 작성 */}
          <section className="block">
            <p className="comment">{"// 공지사항 작성 — 과목을 선택하고 등록하면 해당 과목 페이지에 바로 표시됩니다"}</p>
            <form ref={noticeFormRef} action={noticeFormAction} className="notice-form">
              <select name="slug" defaultValue="" required className="notice-select">
                <option value="" disabled>
                  과목 선택
                </option>
                {teaches.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.name}
                  </option>
                ))}
              </select>
              <input
                name="title"
                type="text"
                placeholder="제목"
                required
                className="notice-input"
              />
              <textarea
                name="content"
                placeholder="내용"
                required
                rows={4}
                className="notice-textarea"
              />
              <button type="submit" disabled={isNoticePending} className="notice-submit">
                {isNoticePending ? "등록 중..." : "공지 등록"}
              </button>
            </form>
            {noticeState?.ok === true && (
              <p className="notice-msg notice-success">✓ 등록되었습니다.</p>
            )}
            {noticeState?.ok === false && (
              <p className="notice-msg notice-error">{noticeState.error}</p>
            )}
          </section>

          {/* 기술 스택 */}
          <section className="block">
            <p className="comment">{"// 기술 스택"}</p>
            <div className="skills">
              {skills.map((s) => (
                <div key={s.label} className="skill">
                  <div className="skill-top">
                    <span>{s.label}</span>
                    <span className="pct">{s.level}%</span>
                  </div>
                  <div className="bar">
                    <div className="fill" style={{ width: `${s.level}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 프로젝트 */}
          <section className="block">
            <p className="comment">{"// 만든 것들 (클릭하면 새 창에서 열립니다)"}</p>
            <div className="grid">
              {projects.map((p, idx) => {
                const inner = (
                  <>
                    <span className="card-tag">{p.tag}</span>
                    <h3 className="card-name">{p.name}</h3>
                    <p className="card-desc">{p.desc}</p>
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
          background: #0d1117;
          display: flex;
          justify-content: center;
          padding: 32px 16px;
          font-family: "SF Mono", "JetBrains Mono", "D2Coding", Consolas,
            monospace;
        }
        .window {
          width: 100%;
          max-width: 760px;
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
        }
        .titlebar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #21262d;
          border-bottom: 1px solid #30363d;
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
          color: #8b949e;
          font-size: 13px;
        }
        .body {
          padding: 28px 28px 36px;
          color: #c9d1d9;
          line-height: 1.7;
        }
        .prompt {
          color: #58a6ff;
          font-size: 14px;
          margin: 0 0 8px;
        }
        .caret {
          color: #3fb950;
          margin-right: 8px;
        }
        .hero {
          margin-bottom: 36px;
        }
        .typed {
          font-size: clamp(20px, 4vw, 28px);
          color: #f0f6fc;
          font-weight: 600;
          margin: 0 0 24px;
          min-height: 1.4em;
        }
        .cursor {
          color: #58a6ff;
          animation: blink 1s step-end infinite;
        }
        @keyframes blink {
          50% {
            opacity: 0;
          }
        }
        .namecard {
          border-left: 3px solid #58a6ff;
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
          border: 1px solid #30363d;
          background: #fff;
          object-fit: cover;
          flex-shrink: 0;
        }
        .name {
          font-size: 22px;
          color: #f0f6fc;
          margin: 0 0 4px;
        }
        .name-en {
          color: #8b949e;
          font-size: 16px;
          font-weight: 400;
        }
        .phone {
          font-size: 22px;
          color: #f0f6fc;
          margin: 0 0 4px;
        }
        .phone-en {
          color: #8b949e;
          font-size: 16px;
          font-weight: 400;
        }  
        .role {
          color: #d2a8ff;
          margin: 0 0 4px;
          font-size: 15px;
        }
        .meta {
          color: #8b949e;
          font-size: 13px;
          margin: 0;
        }
        .block {
          margin-bottom: 32px;
        }
        .comment {
          color: #6e7681;
          font-size: 13px;
          margin: 0 0 12px;
        }
        .text {
          color: #c9d1d9;
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
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 10px 12px;
          color: #c9d1d9;
          font-family: inherit;
          font-size: 14px;
          resize: vertical;
        }
        .notice-select:focus,
        .notice-input:focus,
        .notice-textarea:focus {
          outline: none;
          border-color: #58a6ff;
        }
        .notice-submit {
          align-self: flex-start;
          background: #1f6feb;
          color: #f0f6fc;
          border: none;
          border-radius: 8px;
          padding: 9px 18px;
          font-size: 14px;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.15s;
        }
        .notice-submit:hover {
          background: #388bfd;
        }
        .notice-submit:disabled {
          background: #21262d;
          color: #6e7681;
          cursor: default;
        }
        .notice-msg {
          margin: 10px 0 0;
          font-size: 13px;
        }
        .notice-success {
          color: #3fb950;
        }
        .notice-error {
          color: #f85149;
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
          color: #c9d1d9;
        }
        .pct {
          color: #6e7681;
        }
        .bar {
          height: 8px;
          background: #21262d;
          border-radius: 4px;
          overflow: hidden;
        }
        .fill {
          height: 100%;
          background: linear-gradient(90deg, #1f6feb, #58a6ff);
          border-radius: 4px;
          transition: width 1s ease;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 14px;
        }
        .card {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 10px;
          padding: 16px;
          transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
        }
        .card:hover {
          transform: translateY(-3px);
          border-color: #58a6ff;
        }
        .card-tag {
          display: inline-block;
          font-size: 11px;
          color: #3fb950;
          background: #3fb95022;
          padding: 2px 8px;
          border-radius: 6px;
          margin-bottom: 8px;
        }
        .card-name {
          font-size: 15px;
          color: #f0f6fc;
          margin: 0 0 6px;
        }
        .card-desc {
          font-size: 13px;
          color: #8b949e;
          margin: 0;
        }
        .card-link {
          display: block;
          text-decoration: none;
          color: inherit;
          cursor: pointer;
        }
        .card-link:hover {
          transform: translateY(-3px);
          border-color: #58a6ff;
          box-shadow: 0 6px 20px rgba(88, 166, 255, 0.15);
        }
        .foot {
          margin-top: 36px;
          padding-top: 20px;
          border-top: 1px solid #30363d;
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
