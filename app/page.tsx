import Link from "next/link";

const corners = [
  { href: "/intro", emoji: "🧑‍🏫", title: "비키 AI", desc: "교사 소개 · 담당 과목 · 코딩 작품" },
  { href: "/board", emoji: "📖", title: "학습 소감 게시판", desc: "수업 소감을 남기고 나눠요" },
  { href: "/board/chat", emoji: "💬", title: "실시간 채팅", desc: "학급 실시간 소통 공간" },
  { href: "/files", emoji: "📁", title: "자료실", desc: "수업 자료 업로드 · 다운로드" },
  { href: "/coding", emoji: "⌨️", title: "코딩 교실", desc: "코딩 실습 공간" },
  { href: "/news", emoji: "📰", title: "오늘의 뉴스", desc: "뉴스 · 날씨 · 환율 · 증시" },
  { href: "/works", emoji: "🚀", title: "코딩 작품 전시", desc: "수업으로 만든 도구들" },
  { href: "/mail", emoji: "✉️", title: "메일", desc: "메일 보내기" },
];

export default function Home() {
  return (
    <div className="text-slate-100">
      {/* ── HERO ── */}
      <section className="relative mx-auto max-w-6xl px-4">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
          <img
            src="/hero-particle.jpg"
            alt="파티클 아트"
            className="h-[62vh] min-h-[380px] w-full object-cover"
          />
          {/* 어둡게 덮는 그라디언트 */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070a12] via-[#070a12]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070a12]/80 via-transparent to-transparent" />

          {/* 히어로 텍스트 */}
          <div className="absolute inset-0 flex flex-col justify-center px-8 sm:px-14">
            <p className="mb-3 text-xs sm:text-sm font-semibold tracking-[0.35em] text-cyan-300/90">
              DONGHAE SAHMYOOK · VIKI
            </p>
            <h1 className="max-w-3xl text-4xl sm:text-6xl font-extrabold leading-tight tracking-tight text-white drop-shadow-lg">
              STEP INTO<br />VIKI CODING&nbsp;ROOM
            </h1>
            <p className="mt-5 max-w-xl text-base sm:text-lg text-slate-300">
              코드로 상상을 현실로. 배움이 도구가 되는 공간에 오신 것을 환영합니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/works"
                className="rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
              >
                🚀 코딩 작품 보기
              </Link>
              <Link
                href="/intro"
                className="rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
              >
                교사 소개 →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 주요 코너 ── */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold tracking-[0.3em] text-cyan-300/80">EXPLORE</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-white">이 웹사이트의 주요 코너</h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {corners.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:border-cyan-400/40 hover:bg-white/[0.08]"
            >
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl transition group-hover:bg-cyan-400/20" />
              <div className="relative">
                <div className="text-3xl">{c.emoji}</div>
                <h3 className="mt-4 text-lg font-bold text-white">{c.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{c.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 소개 글 ── */}
      <section className="mx-auto max-w-4xl px-4 pb-20">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 sm:p-10">
          <p className="text-base leading-8 text-slate-300">
            현대 사회는 이른바 &quot;인공지능 사회&quot;라고도 불립니다. 이런 세상에서 자신을 알리는 방법 중 하나가 바로
            &quot;홈페이지&quot;입니다. 홈페이지는 개인이나 단체가 자신을 소개하고, 정보를 공유하며, 소통할 수 있는 공간입니다.
            이를 통해 우리는 다른 사람들과 연결되고, 새로운 기회를 발견하며, 자신의 능력을 발휘할 수 있습니다.
          </p>
          <p className="mt-6 text-base leading-8 text-slate-300">
            홈페이지를 만드는 것은 단순한 기술 작업이 아니라, 생각과 아이디어를 시각적으로 표현하는 과정입니다. 이를 통해
            창의력과 문제 해결 능력을 키울 수 있습니다. 홈페이지란 단순한 개인 공간이 아니라 브랜드의 얼굴입니다.
            아름답게 메이크업 해볼까요? ㅎㅎ
          </p>
        </div>
      </section>
    </div>
  );
}
