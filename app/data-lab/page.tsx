"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";

/* ───────────── CSV 파싱 (따옴표·콤마·줄바꿈 처리) ───────────── */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

function toNum(v: string): number | null {
  if (v == null) return null;
  const s = v.replace(/,/g, "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

type Parsed = { headers: string[]; data: string[][] };

export default function DataLabPage() {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"summary" | "quality" | "corr" | "chart" | "insight">("summary");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCSV(String(reader.result ?? ""));
        if (rows.length < 2) { setError("데이터가 너무 적거나 형식이 올바르지 않습니다."); return; }
        const headers = rows[0].map((h, i) => h.trim() || `열${i + 1}`);
        const data = rows.slice(1).map((r) => headers.map((_, i) => r[i] ?? ""));
        setParsed({ headers, data });
        setFileName(file.name);
        setTab("summary");
      } catch {
        setError("CSV를 읽는 중 오류가 발생했습니다.");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>🔬 데이터 분석실</h1>
          <p style={S.sub}>CSV를 올리면 브라우저 안에서 바로 분석해요 · 데이터는 서버로 전송되지 않습니다</p>
        </div>
        <Link href="/" style={S.back}>← 홈</Link>
      </div>

      {/* 업로드 */}
      <div style={S.uploadBox}>
        <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={handleFile} />
        <button style={S.uploadBtn} onClick={() => fileRef.current?.click()}>📤 CSV 파일 올리기</button>
        <span style={S.fileName}>{fileName || "선택된 파일 없음"}</span>
      </div>
      {error && <p style={S.error}>{error}</p>}

      {parsed && (
        <>
          <div style={S.metaBar}>
            📊 <b style={{ color: "#a5f3fc" }}>{parsed.data.length.toLocaleString()}</b> 행 ·{" "}
            <b style={{ color: "#a5f3fc" }}>{parsed.headers.length}</b> 열
          </div>

          <div style={S.tabs}>
            {([
              ["summary", "요약 통계"],
              ["quality", "결측치·중복"],
              ["corr", "상관관계"],
              ["chart", "차트"],
              ["insight", "결론 추론"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                style={{ ...S.tab, ...(tab === k ? S.tabOn : {}) }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={S.panel}>
            {tab === "summary" && <Summary parsed={parsed} />}
            {tab === "quality" && <Quality parsed={parsed} />}
            {tab === "corr" && <Corr parsed={parsed} />}
            {tab === "chart" && <Charts parsed={parsed} />}
            {tab === "insight" && <Insight parsed={parsed} />}
          </div>
        </>
      )}
    </div>
  );
}

/* ───────────── 공통 분석 헬퍼 ───────────── */
function colValues(p: Parsed, ci: number) { return p.data.map((r) => r[ci] ?? ""); }
function isNumericCol(p: Parsed, ci: number) {
  const vals = colValues(p, ci).filter((v) => v.trim() !== "");
  if (vals.length === 0) return false;
  const ok = vals.filter((v) => toNum(v) !== null).length;
  return ok / vals.length >= 0.7;
}
function nums(p: Parsed, ci: number) {
  return colValues(p, ci).map(toNum).filter((n): n is number => n !== null);
}
function stat(arr: number[]) {
  const n = arr.length;
  if (n === 0) return { mean: 0, min: 0, max: 0, std: 0, median: 0 };
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const min = Math.min(...arr), max = Math.max(...arr);
  const std = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  const sorted = [...arr].sort((a, b) => a - b);
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  return { mean, min, max, std, median };
}
function fmt(n: number) {
  if (!Number.isFinite(n)) return "-";
  return Math.abs(n) >= 1000 || Number.isInteger(n) ? n.toLocaleString("ko-KR", { maximumFractionDigits: 2 }) : n.toFixed(2);
}
function pearson(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  if (n < 2) return NaN;
  const ma = a.reduce((x, y) => x + y, 0) / n;
  const mb = b.reduce((x, y) => x + y, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
  const den = Math.sqrt(da * db);
  return den === 0 ? NaN : num / den;
}

/* ───────────── 요약 통계 ───────────── */
function Summary({ parsed }: { parsed: Parsed }) {
  return (
    <div>
      <h3 style={S.secTitle}>열별 요약</h3>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>{["열 이름", "유형", "값 개수", "결측", "평균", "최소", "최대", "표준편차"].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {parsed.headers.map((h, ci) => {
              const numeric = isNumericCol(parsed, ci);
              const all = colValues(parsed, ci);
              const filled = all.filter((v) => v.trim() !== "").length;
              const missing = all.length - filled;
              if (numeric) {
                const s = stat(nums(parsed, ci));
                return (
                  <tr key={ci} style={S.tr}>
                    <td style={S.tdName}>{h}</td>
                    <td style={S.td}><span style={S.badgeNum}>숫자</span></td>
                    <td style={S.td}>{filled}</td>
                    <td style={S.td}>{missing}</td>
                    <td style={S.td}>{fmt(s.mean)}</td>
                    <td style={S.td}>{fmt(s.min)}</td>
                    <td style={S.td}>{fmt(s.max)}</td>
                    <td style={S.td}>{fmt(s.std)}</td>
                  </tr>
                );
              }
              const uniq = new Set(all.filter((v) => v.trim() !== "")).size;
              return (
                <tr key={ci} style={S.tr}>
                  <td style={S.tdName}>{h}</td>
                  <td style={S.td}><span style={S.badgeCat}>범주</span></td>
                  <td style={S.td}>{filled}</td>
                  <td style={S.td}>{missing}</td>
                  <td style={S.td} colSpan={4}>고유값 {uniq}개</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 style={{ ...S.secTitle, marginTop: 24 }}>데이터 미리보기 (상위 10행)</h3>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead><tr>{parsed.headers.map((h, i) => <th key={i} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {parsed.data.slice(0, 10).map((r, ri) => (
              <tr key={ri} style={S.tr}>{r.map((v, ci) => <td key={ci} style={S.td}>{v}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────────── 결측치·중복 ───────────── */
function Quality({ parsed }: { parsed: Parsed }) {
  const totalRows = parsed.data.length;
  const seen = new Set<string>();
  let dup = 0;
  for (const r of parsed.data) { const key = r.join(""); if (seen.has(key)) dup++; else seen.add(key); }

  return (
    <div>
      <h3 style={S.secTitle}>결측치 (빈 값)</h3>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead><tr>{["열 이름", "결측 개수", "결측 비율"].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {parsed.headers.map((h, ci) => {
              const miss = colValues(parsed, ci).filter((v) => v.trim() === "").length;
              const pct = totalRows ? (miss / totalRows) * 100 : 0;
              return (
                <tr key={ci} style={S.tr}>
                  <td style={S.tdName}>{h}</td>
                  <td style={S.td}>{miss}</td>
                  <td style={S.td}>
                    <div style={S.barTrack}><div style={{ ...S.barFill, width: `${pct}%`, background: pct > 30 ? "#f87171" : "#34d399" }} /></div>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>{pct.toFixed(1)}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={S.callout}>
        🔁 완전히 동일한 중복 행: <b style={{ color: dup > 0 ? "#fbbf24" : "#34d399" }}>{dup}개</b>
        {dup > 0 ? " — 중복 제거를 고려해보세요." : " — 중복이 없어요."}
      </div>
    </div>
  );
}

/* ───────────── 상관관계 ───────────── */
function Corr({ parsed }: { parsed: Parsed }) {
  const numCols = parsed.headers.map((h, i) => ({ h, i })).filter((c) => isNumericCol(parsed, c.i));
  if (numCols.length < 2) return <p style={S.muted}>상관관계를 보려면 숫자 열이 2개 이상 필요해요.</p>;
  const series = numCols.map((c) => nums(parsed, c.i));

  return (
    <div>
      <h3 style={S.secTitle}>상관계수 (Pearson, -1 ~ +1)</h3>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead><tr><th style={S.th}></th>{numCols.map((c) => <th key={c.i} style={S.th}>{c.h}</th>)}</tr></thead>
          <tbody>
            {numCols.map((rc, ri) => (
              <tr key={rc.i} style={S.tr}>
                <td style={S.tdName}>{rc.h}</td>
                {numCols.map((cc, cii) => {
                  const r = ri === cii ? 1 : pearson(series[ri], series[cii]);
                  const a = Math.abs(r);
                  const bg = Number.isNaN(r) ? "transparent" : r >= 0
                    ? `rgba(56,189,248,${a * 0.7})` : `rgba(248,113,113,${a * 0.7})`;
                  return <td key={cc.i} style={{ ...S.td, background: bg, color: "#fff", fontWeight: 600 }}>{Number.isNaN(r) ? "-" : r.toFixed(2)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={S.muted}>파란색일수록 양(+)의 상관, 붉은색일수록 음(−)의 상관이 강해요.</p>
    </div>
  );
}

/* ───────────── 차트 ───────────── */
function Charts({ parsed }: { parsed: Parsed }) {
  const numCols = parsed.headers.map((h, i) => ({ h, i })).filter((c) => isNumericCol(parsed, c.i));
  const catCols = parsed.headers.map((h, i) => ({ h, i })).filter((c) => !isNumericCol(parsed, c.i));
  const [type, setType] = useState<"bar" | "hist" | "scatter">(catCols.length ? "bar" : "hist");
  const [x, setX] = useState<number>((catCols[0]?.i ?? numCols[0]?.i ?? 0));
  const [y, setY] = useState<number>((numCols[1]?.i ?? numCols[0]?.i ?? 0));

  return (
    <div>
      <div style={S.chartControls}>
        <div style={S.ctrlGroup}>
          {([["bar", "막대(범주)"], ["hist", "히스토그램(숫자)"], ["scatter", "산점도(숫자×숫자)"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setType(k)} style={{ ...S.chip, ...(type === k ? S.chipOn : {}) }}>{label}</button>
          ))}
        </div>
        <div style={S.ctrlGroup}>
          <label style={S.lbl}>{type === "scatter" ? "X축" : "열"}:
            <select value={x} onChange={(e) => setX(Number(e.target.value))} style={S.select}>
              {(type === "bar" ? catCols : numCols).map((c) => <option key={c.i} value={c.i}>{c.h}</option>)}
            </select>
          </label>
          {type === "scatter" && (
            <label style={S.lbl}>Y축:
              <select value={y} onChange={(e) => setY(Number(e.target.value))} style={S.select}>
                {numCols.map((c) => <option key={c.i} value={c.i}>{c.h}</option>)}
              </select>
            </label>
          )}
        </div>
      </div>

      {type === "bar" && <BarChart parsed={parsed} ci={x} />}
      {type === "hist" && <Histogram parsed={parsed} ci={x} />}
      {type === "scatter" && <Scatter parsed={parsed} xi={x} yi={y} />}
    </div>
  );
}

function BarChart({ parsed, ci }: { parsed: Parsed; ci: number }) {
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of colValues(parsed, ci)) { const k = v.trim() || "(빈값)"; m.set(k, (m.get(k) ?? 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [parsed, ci]);
  const max = Math.max(1, ...counts.map((c) => c[1]));
  return (
    <div style={S.chartBox}>
      {counts.map(([label, n]) => (
        <div key={label} style={S.barRow}>
          <span style={S.barLabel} title={label}>{label}</span>
          <div style={S.barBg}><div style={{ ...S.barVal, width: `${(n / max) * 100}%` }} /></div>
          <span style={S.barNum}>{n}</span>
        </div>
      ))}
    </div>
  );
}

function Histogram({ parsed, ci }: { parsed: Parsed; ci: number }) {
  const arr = nums(parsed, ci);
  if (arr.length === 0) return <p style={S.muted}>숫자 값이 없어요.</p>;
  const min = Math.min(...arr), max = Math.max(...arr);
  const bins = 10;
  const width = (max - min) / bins || 1;
  const counts = new Array(bins).fill(0);
  for (const v of arr) { let b = Math.floor((v - min) / width); if (b >= bins) b = bins - 1; if (b < 0) b = 0; counts[b]++; }
  const maxc = Math.max(...counts);
  const W = 560, H = 240, pad = 30;
  const bw = (W - pad * 2) / bins;
  return (
    <div style={S.chartBox}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        {counts.map((c, i) => {
          const h = maxc ? (c / maxc) * (H - pad * 2) : 0;
          return <rect key={i} x={pad + i * bw + 2} y={H - pad - h} width={bw - 4} height={h} fill="#38bdf8" rx="3" />;
        })}
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#475569" />
        <text x={pad} y={H - 8} fill="#94a3b8" fontSize="11">{fmt(min)}</text>
        <text x={W - pad} y={H - 8} fill="#94a3b8" fontSize="11" textAnchor="end">{fmt(max)}</text>
      </svg>
      <p style={S.muted}>{parsed.headers[ci]} 분포 (10구간)</p>
    </div>
  );
}

function Scatter({ parsed, xi, yi }: { parsed: Parsed; xi: number; yi: number }) {
  const pts = useMemo(() => {
    const out: [number, number][] = [];
    for (const r of parsed.data) { const a = toNum(r[xi]), b = toNum(r[yi]); if (a !== null && b !== null) out.push([a, b]); }
    return out;
  }, [parsed, xi, yi]);
  if (pts.length === 0) return <p style={S.muted}>그릴 수 있는 점이 없어요.</p>;
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys);
  const W = 560, H = 320, pad = 40;
  const sx = (v: number) => pad + ((v - xmin) / (xmax - xmin || 1)) * (W - pad * 2);
  const sy = (v: number) => H - pad - ((v - ymin) / (ymax - ymin || 1)) * (H - pad * 2);
  const r = pearson(xs, ys);
  return (
    <div style={S.chartBox}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#475569" />
        <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="#475569" />
        {pts.map((p, i) => <circle key={i} cx={sx(p[0])} cy={sy(p[1])} r="3.5" fill="rgba(56,189,248,0.7)" />)}
        <text x={W / 2} y={H - 8} fill="#94a3b8" fontSize="12" textAnchor="middle">{parsed.headers[xi]}</text>
        <text x={12} y={H / 2} fill="#94a3b8" fontSize="12" transform={`rotate(-90 12 ${H / 2})`} textAnchor="middle">{parsed.headers[yi]}</text>
      </svg>
      {!Number.isNaN(r) && <p style={S.muted}>상관계수 r = <b style={{ color: "#a5f3fc" }}>{r.toFixed(2)}</b></p>}
    </div>
  );
}

/* ───────────── 결론 추론 (규칙 기반) ───────────── */
function Insight({ parsed }: { parsed: Parsed }) {
  const lines: string[] = [];
  const rows = parsed.data.length;
  const cols = parsed.headers.length;
  const numCols = parsed.headers.map((h, i) => ({ h, i })).filter((c) => isNumericCol(parsed, c.i));
  const catCols = parsed.headers.map((h, i) => ({ h, i })).filter((c) => !isNumericCol(parsed, c.i));

  lines.push(`데이터는 총 ${rows.toLocaleString()}행 × ${cols}열이며, 숫자형 ${numCols.length}개 · 범주형 ${catCols.length}개 열로 구성됩니다.`);

  // 결측치가 가장 많은 열
  let worst = { h: "", miss: -1 };
  for (const [i, h] of parsed.headers.entries()) {
    const miss = colValues(parsed, i).filter((v) => v.trim() === "").length;
    if (miss > worst.miss) worst = { h, miss };
  }
  if (worst.miss > 0) lines.push(`결측치는 '${worst.h}' 열에서 가장 많이(${worst.miss}개) 나타나므로, 이 열을 다룰 때 주의가 필요합니다.`);
  else lines.push(`빈 값(결측치)이 없는 깨끗한 데이터입니다.`);

  // 가장 강한 상관 쌍
  if (numCols.length >= 2) {
    const series = numCols.map((c) => nums(parsed, c.i));
    let best = { a: "", b: "", r: 0 };
    for (let i = 0; i < numCols.length; i++)
      for (let j = i + 1; j < numCols.length; j++) {
        const r = pearson(series[i], series[j]);
        if (!Number.isNaN(r) && Math.abs(r) > Math.abs(best.r)) best = { a: numCols[i].h, b: numCols[j].h, r };
      }
    if (best.a) {
      const dir = best.r > 0 ? "양(+)의" : "음(−)의";
      const strength = Math.abs(best.r) >= 0.7 ? "강한" : Math.abs(best.r) >= 0.4 ? "뚜렷한" : "약한";
      lines.push(`'${best.a}'와(과) '${best.b}'는 ${strength} ${dir} 상관관계(r=${best.r.toFixed(2)})를 보입니다${Math.abs(best.r) >= 0.4 ? " — 한쪽이 커질수록 다른 쪽도 함께 변하는 경향입니다." : "."}`);
    }
  }

  // 대표 범주형 열의 최빈값
  if (catCols.length) {
    const c = catCols[0];
    const m = new Map<string, number>();
    for (const v of colValues(parsed, c.i)) { const k = v.trim(); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
    const top = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) lines.push(`'${c.h}' 열에서는 '${top[0]}'이(가) ${top[1]}건으로 가장 많이 나타납니다.`);
  }

  // 숫자열 분포 특징(치우침)
  for (const c of numCols.slice(0, 2)) {
    const s = stat(nums(parsed, c.i));
    if (s.median !== 0 && Math.abs(s.mean - s.median) > s.std * 0.5) {
      const dir = s.mean > s.median ? "오른쪽(큰 값)" : "왼쪽(작은 값)";
      lines.push(`'${c.h}'는 평균(${fmt(s.mean)})과 중앙값(${fmt(s.median)}) 차이가 커서 분포가 ${dir}으로 치우쳐 있습니다.`);
    }
  }

  return (
    <div>
      <h3 style={S.secTitle}>🧠 자동 결론 추론</h3>
      <ul style={S.insightList}>
        {lines.map((l, i) => <li key={i} style={S.insightItem}>{l}</li>)}
      </ul>
      <p style={S.muted}>※ 통계에 근거한 자동 해석입니다. 최종 해석은 수업 맥락에 맞게 판단하세요.</p>
    </div>
  );
}

/* ───────────── 스타일 (다크) ───────────── */
const S: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 1000, margin: "32px auto", padding: "0 16px 60px", color: "#e5e7eb" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 8 },
  title: { margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: "#fff" },
  sub: { margin: 0, fontSize: 13, color: "#94a3b8" },
  back: { fontSize: 14, color: "#94a3b8", textDecoration: "none" },
  uploadBox: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "18px 20px" },
  uploadBtn: { background: "linear-gradient(135deg,#6366f1,#38bdf8)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 20px", fontSize: 15, fontWeight: 700, cursor: "pointer" },
  fileName: { fontSize: 14, color: "#94a3b8" },
  error: { color: "#f87171", fontSize: 14, marginTop: 10 },
  metaBar: { marginTop: 18, fontSize: 15, color: "#cbd5e1" },
  tabs: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 },
  tab: { background: "rgba(255,255,255,0.05)", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "8px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  tabOn: { background: "linear-gradient(135deg,#6366f1,#38bdf8)", color: "#fff", borderColor: "transparent" },
  panel: { marginTop: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "20px 22px" },
  secTitle: { margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#fff" },
  tableWrap: { overflowX: "auto", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13.5 },
  th: { textAlign: "left", padding: "10px 12px", background: "rgba(255,255,255,0.06)", color: "#a5b4c8", fontWeight: 700, whiteSpace: "nowrap", borderBottom: "1px solid rgba(255,255,255,0.1)" },
  tr: { borderBottom: "1px solid rgba(255,255,255,0.06)" },
  td: { padding: "9px 12px", color: "#cbd5e1", whiteSpace: "nowrap" },
  tdName: { padding: "9px 12px", color: "#fff", fontWeight: 600, whiteSpace: "nowrap" },
  badgeNum: { fontSize: 11, fontWeight: 700, color: "#0369a1", background: "#bae6fd", padding: "1px 8px", borderRadius: 20 },
  badgeCat: { fontSize: 11, fontWeight: 700, color: "#7c2d12", background: "#fed7aa", padding: "1px 8px", borderRadius: 20 },
  muted: { color: "#94a3b8", fontSize: 13, marginTop: 10 },
  barTrack: { display: "inline-block", width: 120, height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden", verticalAlign: "middle", marginRight: 8 },
  barFill: { height: "100%", borderRadius: 4 },
  callout: { marginTop: 16, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 16px", fontSize: 14 },
  chartControls: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 },
  ctrlGroup: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  chip: { background: "rgba(255,255,255,0.05)", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  chipOn: { background: "#38bdf8", color: "#04283a", borderColor: "transparent" },
  lbl: { fontSize: 13, color: "#cbd5e1", display: "flex", alignItems: "center", gap: 6 },
  select: { background: "#0b1020", color: "#e5e7eb", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 10px", fontSize: 13 },
  chartBox: { background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px" },
  barRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  barLabel: { width: 120, fontSize: 13, color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  barBg: { flex: 1, height: 18, background: "rgba(255,255,255,0.08)", borderRadius: 6, overflow: "hidden" },
  barVal: { height: "100%", background: "linear-gradient(90deg,#6366f1,#38bdf8)", borderRadius: 6 },
  barNum: { width: 46, textAlign: "right", fontSize: 13, color: "#a5f3fc", fontWeight: 700 },
  insightList: { margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 },
  insightItem: { background: "rgba(255,255,255,0.04)", borderLeft: "3px solid #38bdf8", borderRadius: 8, padding: "10px 14px", fontSize: 14, lineHeight: 1.6, color: "#dbeafe" },
};
