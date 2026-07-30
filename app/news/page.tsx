/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";

export const revalidate = 1800; // 30분마다 갱신

// ─────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────
function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function pick(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? decode(m[1]) : "";
}

function timeAgo(dateStr: string): string {
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return "";
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

// ─────────────────────────────────────────────
// 뉴스 (Google 뉴스 RSS)
// ─────────────────────────────────────────────
type NewsItem = { title: string; link: string; source: string; ago: string };

const CATEGORIES: { name: string; emoji: string; url: string }[] = [
  { name: "정치", emoji: "🏛️", url: "https://news.google.com/rss/search?q=" + encodeURIComponent("정치 when:1d") + "&hl=ko&gl=KR&ceid=KR:ko" },
  { name: "경제", emoji: "💹", url: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=ko&gl=KR&ceid=KR:ko" },
  { name: "사회", emoji: "🏙️", url: "https://news.google.com/rss/search?q=" + encodeURIComponent("사회 when:1d") + "&hl=ko&gl=KR&ceid=KR:ko" },
  { name: "세계", emoji: "🌏", url: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=ko&gl=KR&ceid=KR:ko" },
  { name: "IT·과학", emoji: "🔬", url: "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=ko&gl=KR&ceid=KR:ko" },
];

async function getNews(url: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    const xml = await res.text();
    const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
    return blocks.slice(0, 6).map((b) => {
      let title = pick(b, "title");
      let source = pick(b, "source");
      // 구글 뉴스 제목은 "제목 - 언론사" 형태
      if (!source && title.includes(" - ")) {
        const idx = title.lastIndexOf(" - ");
        source = title.slice(idx + 3);
        title = title.slice(0, idx);
      } else if (source && title.endsWith(" - " + source)) {
        title = title.slice(0, title.length - source.length - 3);
      }
      return { title, link: pick(b, "link"), source, ago: timeAgo(pick(b, "pubDate")) };
    });
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────
// 날씨 (Open-Meteo, 서울)
// ─────────────────────────────────────────────
const WMO: Record<number, { t: string; e: string }> = {
  0: { t: "맑음", e: "☀️" }, 1: { t: "대체로 맑음", e: "🌤️" }, 2: { t: "구름 조금", e: "⛅" }, 3: { t: "흐림", e: "☁️" },
  45: { t: "안개", e: "🌫️" }, 48: { t: "짙은 안개", e: "🌫️" },
  51: { t: "약한 이슬비", e: "🌦️" }, 53: { t: "이슬비", e: "🌦️" }, 55: { t: "강한 이슬비", e: "🌦️" },
  61: { t: "약한 비", e: "🌧️" }, 63: { t: "비", e: "🌧️" }, 65: { t: "강한 비", e: "🌧️" },
  66: { t: "진눈깨비", e: "🌧️" }, 67: { t: "진눈깨비", e: "🌧️" },
  71: { t: "약한 눈", e: "🌨️" }, 73: { t: "눈", e: "🌨️" }, 75: { t: "강한 눈", e: "❄️" }, 77: { t: "싸락눈", e: "🌨️" },
  80: { t: "소나기", e: "🌦️" }, 81: { t: "소나기", e: "🌦️" }, 82: { t: "강한 소나기", e: "⛈️" },
  85: { t: "소나기눈", e: "🌨️" }, 86: { t: "소나기눈", e: "🌨️" },
  95: { t: "뇌우", e: "⛈️" }, 96: { t: "우박 뇌우", e: "⛈️" }, 99: { t: "우박 뇌우", e: "⛈️" },
};

async function getWeather() {
  try {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current=temperature_2m,relative_humidity_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FSeoul";
    const res = await fetch(url, { next: { revalidate: 1800 } });
    const d = await res.json();
    const code = d.current?.weather_code ?? 0;
    const w = WMO[code] ?? { t: "-", e: "🌡️" };
    return {
      ok: true,
      emoji: w.e,
      desc: w.t,
      temp: Math.round(d.current?.temperature_2m),
      humidity: d.current?.relative_humidity_2m,
      max: Math.round(d.daily?.temperature_2m_max?.[0]),
      min: Math.round(d.daily?.temperature_2m_min?.[0]),
    };
  } catch {
    return { ok: false } as any;
  }
}

// ─────────────────────────────────────────────
// 환율 (open.er-api.com)
// ─────────────────────────────────────────────
async function getFx() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 1800 } });
    const d = await res.json();
    const r = d.rates ?? {};
    return {
      ok: true,
      usd: r.KRW,
      jpy100: (r.KRW / r.JPY) * 100,
      eur: r.KRW / r.EUR,
      cny: r.KRW / r.CNY,
    };
  } catch {
    return { ok: false } as any;
  }
}

// ─────────────────────────────────────────────
// 증시 (Yahoo Finance)
// ─────────────────────────────────────────────
async function getQuote(symbol: string, label: string) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 1800 },
    });
    const d = await res.json();
    const meta = d?.chart?.result?.[0]?.meta;
    if (!meta) return { label, ok: false };
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose ?? meta.previousClose;
    const change = price - prev;
    const pct = (change / prev) * 100;
    return { label, ok: true, price, change, pct };
  } catch {
    return { label, ok: false };
  }
}

// ─────────────────────────────────────────────
// 페이지
// ─────────────────────────────────────────────
export default async function NewsPage() {
  const [weather, fx, kospi, kosdaq, nasdaq, sp500, ...newsLists] = await Promise.all([
    getWeather(),
    getFx(),
    getQuote("^KS11", "코스피"),
    getQuote("^KQ11", "코스닥"),
    getQuote("^IXIC", "나스닥"),
    getQuote("^GSPC", "S&P 500"),
    ...CATEGORIES.map((c) => getNews(c.url)),
  ]);

  const quotes = [kospi, kosdaq, nasdaq, sp500];
  const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "long", timeStyle: "short" });

  const fmt = (n: number, d = 0) =>
    n?.toLocaleString("ko-KR", { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📰 오늘의 뉴스</h1>
          <p style={styles.sub}>{now} 기준 · 30분마다 자동 갱신</p>
        </div>
        <Link href="/" style={styles.back}>← 홈</Link>
      </div>

      {/* 시사 요약 카드 3종 */}
      <div style={styles.cards}>
        {/* 날씨 */}
        <div style={{ ...styles.card, ...styles.cardWeather }}>
          <div style={styles.cardHead}>🌤️ 서울 날씨</div>
          {weather.ok ? (
            <div>
              <div style={styles.wxTop}>
                <span style={styles.wxEmoji}>{weather.emoji}</span>
                <span style={styles.wxTemp}>{weather.temp}°</span>
              </div>
              <div style={styles.wxDesc}>{weather.desc}</div>
              <div style={styles.wxMeta}>최고 {weather.max}° / 최저 {weather.min}° · 습도 {weather.humidity}%</div>
            </div>
          ) : (
            <p style={styles.fail}>날씨 정보를 불러오지 못했어요.</p>
          )}
        </div>

        {/* 환율 */}
        <div style={{ ...styles.card, ...styles.cardFx }}>
          <div style={styles.cardHead}>💱 환율 (원)</div>
          {fx.ok ? (
            <ul style={styles.fxList}>
              <li style={styles.fxRow}><span>🇺🇸 미국 USD</span><b>{fmt(fx.usd, 1)}</b></li>
              <li style={styles.fxRow}><span>🇯🇵 일본 100엔</span><b>{fmt(fx.jpy100, 1)}</b></li>
              <li style={styles.fxRow}><span>🇪🇺 유로 EUR</span><b>{fmt(fx.eur, 1)}</b></li>
              <li style={styles.fxRow}><span>🇨🇳 중국 CNY</span><b>{fmt(fx.cny, 1)}</b></li>
            </ul>
          ) : (
            <p style={styles.fail}>환율 정보를 불러오지 못했어요.</p>
          )}
        </div>

        {/* 증시 */}
        <div style={{ ...styles.card, ...styles.cardStock }}>
          <div style={styles.cardHead}>📈 증시 현황</div>
          <ul style={styles.fxList}>
            {quotes.map((q: any) => (
              <li key={q.label} style={styles.fxRow}>
                <span>{q.label}</span>
                {q.ok ? (
                  <span style={{ textAlign: "right" }}>
                    <b>{fmt(q.price, 2)}</b>{" "}
                    <span style={{ color: q.change >= 0 ? "#dc2626" : "#2563eb", fontWeight: 700, fontSize: 12 }}>
                      {q.change >= 0 ? "▲" : "▼"} {fmt(Math.abs(q.change), 2)} ({q.pct >= 0 ? "+" : ""}{q.pct.toFixed(2)}%)
                    </span>
                  </span>
                ) : (
                  <span style={styles.failInline}>—</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 카테고리별 뉴스 */}
      <div style={styles.newsGrid}>
        {CATEGORIES.map((c, i) => {
          const items = newsLists[i] as NewsItem[];
          return (
            <div key={c.name} style={styles.newsCol}>
              <div style={styles.catHead}>
                <span style={styles.catEmoji}>{c.emoji}</span> {c.name}
              </div>
              {items.length === 0 ? (
                <p style={styles.fail}>기사를 불러오지 못했어요.</p>
              ) : (
                <ul style={styles.newsList}>
                  {items.map((n, j) => (
                    <li key={j} style={styles.newsItem}>
                      <a href={n.link} target="_blank" rel="noopener noreferrer" style={styles.newsLink}>
                        {n.title}
                      </a>
                      <div style={styles.newsMeta}>
                        {n.source}{n.source && n.ago ? " · " : ""}{n.ago}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <p style={styles.disclaimer}>
        뉴스: Google 뉴스 · 날씨: Open-Meteo · 환율: open.er-api.com · 증시: Yahoo Finance · 실시간 공개 데이터를 자동 수집합니다.
      </p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 1000, margin: "32px auto", padding: "0 16px 48px", colorScheme: "light" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 8 },
  title: { margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: "#1a2b4a" },
  sub: { margin: 0, fontSize: 13, color: "#94a3b8" },
  back: { fontSize: 14, color: "#64748b", textDecoration: "none" },

  cards: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 24 },
  card: { borderRadius: 16, padding: "18px 20px", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,.05)" },
  cardWeather: { background: "linear-gradient(160deg,#EAF6FF,#F5FBFF)" },
  cardFx: { background: "linear-gradient(160deg,#F1FDF5,#F7FFFB)" },
  cardStock: { background: "linear-gradient(160deg,#FFF6F0,#FFFBF7)" },
  cardHead: { fontSize: 15, fontWeight: 800, color: "#334155", marginBottom: 12 },

  wxTop: { display: "flex", alignItems: "center", gap: 10 },
  wxEmoji: { fontSize: 40, lineHeight: 1 },
  wxTemp: { fontSize: 38, fontWeight: 800, color: "#1e293b" },
  wxDesc: { fontSize: 16, fontWeight: 700, color: "#0e7490", margin: "6px 0 4px" },
  wxMeta: { fontSize: 13, color: "#64748b" },

  fxList: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 9 },
  fxRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, color: "#334155" },

  fail: { fontSize: 13, color: "#94a3b8", margin: "8px 0 0" },
  failInline: { color: "#cbd5e1" },

  newsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 },
  newsCol: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 18px", boxShadow: "0 3px 12px rgba(0,0,0,.04)" },
  catHead: { fontSize: 16, fontWeight: 800, color: "#1a2b4a", paddingBottom: 10, marginBottom: 10, borderBottom: "2px solid #eef2f7", display: "flex", alignItems: "center", gap: 6 },
  catEmoji: { fontSize: 18 },
  newsList: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 },
  newsItem: { paddingBottom: 12, borderBottom: "1px solid #f5f7fa" },
  newsLink: { fontSize: 14, fontWeight: 600, color: "#1e293b", textDecoration: "none", lineHeight: 1.45, display: "block" },
  newsMeta: { fontSize: 12, color: "#94a3b8", marginTop: 4 },

  disclaimer: { fontSize: 12, color: "#b0bcc9", textAlign: "center", marginTop: 28, lineHeight: 1.6 },
};
