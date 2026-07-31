import Link from "next/link";

// 코딩 작품 전시 — intro에서 분리한 별도 페이지
const projects = [
  { name: "급식 조회 앱", tag: "NEIS API", desc: "학교 급식 메뉴 조회", img: "/lunch-menu.jpg", url: "https://script.google.com/macros/s/AKfycbyA2Tc3L12i33MVjNSYvX4BiRtaEQ71jrD7MtW0jYi-gtsZwCusPZbOOnglrqyeZkBXqQ/exec" },
  { name: "감독 배정 관리", tag: "GAS", desc: "시험·감독배정", img: "/work-exam.jpg", url: "https://script.google.com/macros/s/AKfycbwE4qKdtwi3oQ-xglQ82RxyXO0ib_2mnVXwDJc8HRGGgphtIJugQs4FB6qf3nWtE7re/exec" },
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
  { name: "AI 미세먼지 분석 시스템", tag: "MCTS", desc: "지역별 미세먼지 분석예측", img: "/work-dust.png", url: "https://script.google.com/macros/s/AKfycbzrMs7q-Kp-Jkpfua3G1lIiYWx_OyzwOd3QAapI9v-ujBnASu3EWPjKwJSj3zwYuOkF6Q/exec" },
  { name: "AI 여행 추천", tag: "MCTS", desc: "맞춤형 수학여행 추천하기", img: "/work-trip.jpg", url: "https://script.google.com/macros/s/AKfycbwthEa7goNJi6hUGOJPLo8ZRt6-41P_giUNT0MPmoNdr6Nt850Nn2zJ68DjoQMLeqbNSQ/exec" },
  { name: "AI 영화 추천", tag: "MCTS", desc: "영화(Movie) 추천하기", img: "/work-movie.jpg", url: "https://script.google.com/macros/s/AKfycby8VyUUAu9rAdK-cZIpOI68x4bfMAZSBpQgRwYJQd2Ylrizi3qFr8VijF4QWXSCtZVN7Q/exec" },
  { name: "AI 직업 찾기", tag: "MCTS", desc: "MBTI 미래 직업찾기", img: "/work-mbti.jpg", url: "https://script.google.com/macros/s/AKfycbz7YY0DvUzVJoSBxScZ5sTpPaWfqPMzvd3NKTS7eLtFFjXpdYJj-xJ5qUkD42300mo1gQ/exec" },
];

export default function WorksPage() {
  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🚀 코딩 작품 전시</h1>
          <p style={styles.sub}>수업과 아이디어로 만든 도구들 · 클릭하면 새 창에서 열립니다</p>
        </div>
        <Link href="/intro" style={styles.back}>← 교사 소개</Link>
      </div>

      <div style={styles.grid}>
        {projects.map((p, idx) => (
          <a
            key={`${p.desc}-${idx}`}
            href={p.url || undefined}
            target={p.url ? "_blank" : undefined}
            rel="noopener noreferrer"
            style={{ ...styles.card, ...(p.url ? {} : styles.cardDisabled) }}
          >
            <img src={p.img} alt={p.desc} style={styles.photo} />
            <span style={styles.tag}>{p.tag}</span>
            <h3 style={styles.name}>{p.desc}</h3>
          </a>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 1000, margin: "32px auto", padding: "0 16px 48px", colorScheme: "light" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 8 },
  title: { margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: "#0d9488" },
  sub: { margin: 0, fontSize: 13, color: "#64748b" },
  back: { fontSize: 14, color: "#64748b", textDecoration: "none" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 },
  card: { background: "#fff", border: "1px solid #d8efe6", borderRadius: 18, padding: "18px 16px 22px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", textDecoration: "none", color: "inherit", boxShadow: "0 6px 18px rgba(20,150,120,.08)" },
  cardDisabled: { opacity: 0.6, cursor: "default", pointerEvents: "none" },
  photo: { width: "100%", height: 120, objectFit: "cover", borderRadius: 12, marginBottom: 14 },
  tag: { fontSize: 12, color: "#0d9488", fontWeight: 700, background: "#e6f7f1", padding: "2px 10px", borderRadius: 20, marginBottom: 6 },
  name: { fontSize: 16, fontWeight: 700, color: "#1e293b", margin: 0, lineHeight: 1.4 },
};
