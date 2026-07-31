// app/intro/page.tsx  (Next.js App Router)
// 또는  pages/intro.tsx  (Pages Router) — 둘 다 사용 가능
//
// 박희정(Viki Park) 프로필 소개 페이지
// 디자인 컨셉: "코드 에디터" — 정보(AI)교사의 정체성을 모노스페이스 타이포와
//             터미널 프롬프트, 라인 넘버 모티프로 표현

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type SubjectData = {
  name: string;
  notices: { id: string; date: string; title: string; content: string }[];
  materials: { name: string; url: string }[];
  assignmentForms: { label: string; url: string }[];
};

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

  // 담당 과목 클릭 → 해당 과목 내용을 아래 프레임으로 표시
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [subjectData, setSubjectData] = useState<SubjectData | null>(null);
  const [subjectLoading, setSubjectLoading] = useState(false);

  // 관리자 여부 + 공지 작성 폼
  const [isAdmin, setIsAdmin] = useState(false);
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [nSlug, setNSlug] = useState("");
  const [nTitle, setNTitle] = useState("");
  const [nContent, setNContent] = useState("");
  const [nSubmitting, setNSubmitting] = useState(false);
  const [nMsg, setNMsg] = useState("");

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setIsAdmin(!!d.isAdmin))
      .catch(() => {});
  }, []);

  async function loadSubject(slug: string) {
    setActiveSlug(slug);
    setSubjectData(null);
    setSubjectLoading(true);
    try {
      const res = await fetch(`/api/subject?slug=${slug}`);
      setSubjectData(await res.json());
    } catch {
      setSubjectData(null);
    } finally {
      setSubjectLoading(false);
    }
  }

  async function submitNotice(e: React.FormEvent) {
    e.preventDefault();
    setNMsg("");
    setNSubmitting(true);
    try {
      const r = await fetch("/api/notice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: nSlug, title: nTitle, content: nContent }),
      });
      const d = await r.json();
      if (r.ok) {
        setNTitle("");
        setNContent("");
        setShowNoticeForm(false);
        await loadSubject(nSlug); // 방금 작성한 과목 내용 열어서 반영
      } else {
        setNMsg(d.error || "등록에 실패했습니다.");
      }
    } catch {
      setNMsg("등록에 실패했습니다.");
    } finally {
      setNSubmitting(false);
    }
  }

  async function openSubject(slug: string) {
    if (activeSlug === slug) {
      setActiveSlug(null);
      setSubjectData(null);
      return;
    }
    setActiveSlug(slug);
    setSubjectData(null);
    setSubjectLoading(true);
    try {
      const res = await fetch(`/api/subject?slug=${slug}`);
      setSubjectData(await res.json());
    } catch {
      setSubjectData(null);
    } finally {
      setSubjectLoading(false);
    }
  }

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
            <p className="comment">{"// 담당 과목 (누르면 아래에 과목 내용이 열립니다)"}</p>
            <div className="chips">
              {teaches.map((t) => (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => openSubject(t.slug)}
                  className={`subject-btn${activeSlug === t.slug ? " subject-btn-active" : ""}`}
                >
                  {t.name}
                </button>
              ))}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => { setShowNoticeForm((v) => !v); setNMsg(""); }}
                  className="notice-write-btn"
                >
                  ✎ 공지 쓰기
                </button>
              )}
            </div>

            {/* 공지 작성 폼 (관리자 전용) */}
            {isAdmin && showNoticeForm && (
              <form onSubmit={submitNotice} className="nform">
                <div className="nform-title">📢 공지사항 작성</div>
                <select value={nSlug} onChange={(e) => setNSlug(e.target.value)} required className="nform-select">
                  <option value="" disabled>과목 선택</option>
                  {teaches.map((t) => (
                    <option key={t.slug} value={t.slug}>{t.name}</option>
                  ))}
                </select>
                <input
                  value={nTitle}
                  onChange={(e) => setNTitle(e.target.value)}
                  placeholder="제목"
                  required
                  className="nform-input"
                />
                <textarea
                  value={nContent}
                  onChange={(e) => setNContent(e.target.value)}
                  placeholder="내용"
                  required
                  rows={4}
                  className="nform-textarea"
                />
                <div className="nform-actions">
                  <button type="submit" disabled={nSubmitting} className="nform-submit">
                    {nSubmitting ? "등록 중…" : "공지 등록"}
                  </button>
                  <button type="button" onClick={() => setShowNoticeForm(false)} className="nform-cancel">취소</button>
                  {nMsg && <span className="nform-msg">{nMsg}</span>}
                </div>
              </form>
            )}

            {/* 과목 내용 프레임 */}
            {activeSlug && (
              <div className="subject-frame">
                {subjectLoading ? (
                  <p className="sf-loading">불러오는 중…</p>
                ) : subjectData ? (
                  <>
                    <div className="sf-head">
                      <h3 className="sf-title">📘 {subjectData.name}</h3>
                      <button type="button" className="sf-close" onClick={() => { setActiveSlug(null); setSubjectData(null); }}>닫기 ✕</button>
                    </div>

                    <h4 className="sf-sec">공지사항</h4>
                    {subjectData.notices.length === 0 ? (
                      <p className="sf-empty">등록된 공지가 없습니다.</p>
                    ) : (
                      <ul className="sf-list">
                        {subjectData.notices.map((n) => (
                          <li key={n.id} className="sf-notice">
                            <div className="sf-notice-top">
                              <span className="sf-notice-title">{n.title}</span>
                              <span className="sf-notice-date">{n.date}</span>
                            </div>
                            <p className="sf-notice-body">{n.content}</p>
                          </li>
                        ))}
                      </ul>
                    )}

                    <h4 className="sf-sec">수업 자료</h4>
                    {subjectData.materials.length === 0 ? (
                      <p className="sf-empty">등록된 자료가 없습니다.</p>
                    ) : (
                      <ul className="sf-materials">
                        {subjectData.materials.map((m, i) => (
                          <li key={i}>
                            <a href={m.url} target="_blank" rel="noopener noreferrer" className="sf-link">📄 {m.name}</a>
                          </li>
                        ))}
                      </ul>
                    )}

                    <h4 className="sf-sec">과제 제출</h4>
                    <div className="sf-forms">
                      {subjectData.assignmentForms.map((f, i) =>
                        f.url ? (
                          <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="sf-form-btn">{f.label}</a>
                        ) : (
                          <span key={i} className="sf-empty">{f.label} 준비 중</span>
                        )
                      )}
                    </div>
                  </>
                ) : (
                  <p className="sf-empty">내용을 불러오지 못했습니다.</p>
                )}
              </div>
            )}
          </section>

          {/* 코딩 작품 전시 → 별도 페이지 */}
          <section className="block">
            <p className="comment">{"// 코딩 작품 전시"}</p>
            <Link href="/works" className="works-link">🚀 코딩 작품 전시 보러가기 →</Link>
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
        .subject-btn-active {
          background: #14b8a6 !important;
          color: #ffffff !important;
          border-color: #0d9488 !important;
        }
        .notice-write-btn {
          background: #fff7ed;
          color: #c2410c;
          border: 1px dashed #fdba74;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s;
        }
        .notice-write-btn:hover {
          background: #ffedd5;
        }
        .nform {
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: #fffdf7;
          border: 1px solid #fde4c4;
          border-radius: 12px;
          padding: 16px 18px;
          max-width: 520px;
        }
        .nform-title {
          font-size: 15px;
          font-weight: 800;
          color: #c2410c;
        }
        .nform-select,
        .nform-input,
        .nform-textarea {
          width: 100%;
          box-sizing: border-box;
          background: #ffffff;
          border: 1px solid #e2c9a8;
          border-radius: 8px;
          padding: 10px 12px;
          color: #111827;
          font-family: inherit;
          font-size: 14px;
          resize: vertical;
        }
        .nform-select:focus,
        .nform-input:focus,
        .nform-textarea:focus {
          outline: none;
          border-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
        }
        .nform-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .nform-submit {
          background: linear-gradient(135deg, #f59e0b, #fb923c);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 9px 18px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
        }
        .nform-submit:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .nform-cancel {
          background: transparent;
          border: 1px solid #cbd5e1;
          color: #64748b;
          border-radius: 8px;
          padding: 9px 14px;
          font-size: 14px;
          cursor: pointer;
          font-family: inherit;
        }
        .nform-msg {
          font-size: 13px;
          color: #dc2626;
        }
        .subject-frame {
          margin-top: 16px;
          background: #ffffff;
          border: 1px solid #cfeee0;
          border-radius: 14px;
          padding: 20px 22px;
          box-shadow: 0 8px 22px rgba(20, 150, 120, 0.12);
        }
        .sf-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .sf-title {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
          color: #0d9488;
        }
        .sf-close {
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 13px;
          color: #64748b;
          cursor: pointer;
          font-family: inherit;
        }
        .sf-close:hover {
          background: #e2e8f0;
        }
        .sf-sec {
          margin: 18px 0 8px;
          font-size: 15px;
          font-weight: 700;
          color: #1e293b;
          border-left: 3px solid #14b8a6;
          padding-left: 8px;
        }
        .sf-loading,
        .sf-empty {
          color: #94a3b8;
          font-size: 14px;
          margin: 4px 0;
        }
        .sf-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .sf-notice {
          background: #f8fafc;
          border: 1px solid #eef2f7;
          border-radius: 10px;
          padding: 12px 14px;
        }
        .sf-notice-top {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 4px;
        }
        .sf-notice-title {
          font-weight: 700;
          color: #1e293b;
          font-size: 14px;
        }
        .sf-notice-date {
          color: #94a3b8;
          font-size: 12px;
          white-space: nowrap;
        }
        .sf-notice-body {
          margin: 0;
          font-size: 13.5px;
          color: #475569;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        .sf-materials {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .sf-link {
          color: #0d9488;
          text-decoration: none;
          font-size: 14px;
        }
        .sf-link:hover {
          text-decoration: underline;
        }
        .sf-forms {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .sf-form-btn {
          display: inline-block;
          background: linear-gradient(135deg, #14b8a6, #38bdf8);
          color: #fff;
          text-decoration: none;
          padding: 8px 16px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
        }
        .works-link {
          display: inline-block;
          background: #e6f7f1;
          color: #0d9488;
          border: 1px solid #b9e8db;
          border-radius: 10px;
          padding: 12px 20px;
          font-size: 15px;
          font-weight: 700;
          text-decoration: none;
          transition: background 0.15s, transform 0.1s;
        }
        .works-link:hover {
          background: #d3f2e8;
          transform: translateY(-2px);
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
