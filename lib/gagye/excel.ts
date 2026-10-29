/** 엑셀 내보내기(연간정산 + 1~12월 + 고정항목) / 구글 시트 가계부(.xlsx) 가져오기 */
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { ensureTables, getAnnual, saveConfig, pad, parseYmd, kstNow } from "./core";
import { TYPES, type Categories } from "./defaults";

const HEAD_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF37474F" } };
const NUM = "#,##0";

function headRow(ws: ExcelJS.Worksheet, row: number) {
  ws.getRow(row).eachCell((c) => {
    c.fill = HEAD_FILL;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.alignment = { horizontal: "center", vertical: "middle" };
  });
}

export async function exportYear(y: number): Promise<Buffer> {
  await ensureTables();
  const [annual, txs, rec] = await Promise.all([
    getAnnual(y),
    prisma.gagyeTx.findMany({ where: { year: y }, orderBy: [{ date: "asc" }, { id: "asc" }] }),
    prisma.gagyeRecurring.findMany({ orderBy: { day: "asc" } }),
  ]);
  const wb = new ExcelJS.Workbook();
  wb.creator = "가계365";

  // 연간정산
  const a = wb.addWorksheet("연간정산", { views: [{ state: "frozen", xSplit: 2, ySplit: 3 }] });
  a.mergeCells("A1:Q1");
  a.getCell("A1").value = `${y}년 연간 정산`;
  a.getCell("A1").font = { bold: true, size: 16 };
  a.getRow(3).values = ["구분", "대분류", ...Array.from({ length: 12 }, (_, i) => `${i + 1}월`), "합계", "월평균", "비중"];
  headRow(a, 3);
  let r = 4;
  for (const s of annual.sections) {
    for (const l of s.lines) {
      a.getRow(r).values = [s.type, l.major, ...l.months, l.total, l.avg, s.total ? l.total / s.total : 0];
      r++;
    }
    const row = a.getRow(r);
    row.values = [`${s.type} 합계`, "", ...s.months, s.total, "", ""];
    row.font = { bold: true };
    row.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: s.type === "수입" ? "FFE3F2FD" : s.type === "지출" ? "FFFDECEA" : "FFE8F5E9" } }));
    r += 2;
  }
  a.getRow(r).values = ["순수지", "(수입-지출-저축)", ...annual.net, annual.netTotal];
  a.getRow(r).font = { bold: true };
  r += 1;
  a.getRow(r).values = ["연초 이월", "", annual.carry];
  a.getRow(r + 1).values = ["연말 잔액", "", annual.endBalance];
  a.getRow(r + 2).values = ["저축률", "", annual.rate];
  a.getCell(`C${r + 2}`).numFmt = "0.0%";
  r += 5;
  a.getCell(`A${r}`).value = "연말정산 참고 집계 (1~12월 합계)";
  a.getCell(`A${r}`).font = { bold: true };
  r++;
  for (const t of annual.tax) {
    a.getRow(r).values = [t.label, "", t.value, t.note];
    a.mergeCells(`A${r}:B${r}`);
    r++;
  }
  a.getCell(`A${r + 1}`).value = "※ 공제율·한도·요건은 해마다 바뀌므로 홈택스 간소화 자료와 대조해 최종 확인하세요.";
  a.columns.forEach((c, i) => {
    c.width = i === 0 ? 12 : i === 1 ? 16 : 11;
    if (i >= 2 && i <= 15) c.numFmt = NUM;
  });
  a.getColumn(17).numFmt = "0.0%";

  // 월별 시트
  const cols = [
    { header: "날짜", key: "date", width: 12 }, { header: "구분", key: "type", width: 7 },
    { header: "대분류", key: "major", width: 11 }, { header: "소분류", key: "minor", width: 11 },
    { header: "내용(사용처)", key: "content", width: 26 }, { header: "수입금액", key: "inc", width: 12 },
    { header: "지출/저축금액", key: "out", width: 13 }, { header: "결제수단", key: "payment", width: 10 },
    { header: "지출성격", key: "nature", width: 10 }, { header: "비고", key: "memo", width: 24 },
  ];
  for (let m = 1; m <= 12; m++) {
    const ws = wb.addWorksheet(`${m}월`, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = cols;
    headRow(ws, 1);
    for (const t of txs.filter((x) => x.month === m)) {
      ws.addRow({
        date: t.date, type: t.type, major: t.major, minor: t.minor, content: t.content,
        inc: t.type === "수입" ? t.amount : null, out: t.type === "수입" ? null : t.amount,
        payment: t.payment, nature: t.nature, memo: t.memo,
      });
    }
    ws.getColumn("inc").numFmt = NUM;
    ws.getColumn("out").numFmt = NUM;
    const n = ws.rowCount;
    const sumRow = ws.addRow({ date: "합계", inc: { formula: `SUM(F2:F${Math.max(2, n)})` }, out: { formula: `SUM(G2:G${Math.max(2, n)})` } });
    sumRow.font = { bold: true };
  }

  // 고정항목
  const f = wb.addWorksheet("고정항목", { views: [{ state: "frozen", ySplit: 1 }] });
  f.columns = [
    { header: "사용", key: "active", width: 7 }, { header: "구분", key: "type", width: 7 },
    { header: "대분류", key: "major", width: 11 }, { header: "소분류", key: "minor", width: 11 },
    { header: "내용", key: "content", width: 22 }, { header: "금액", key: "amount", width: 12 },
    { header: "결제수단", key: "payment", width: 10 }, { header: "지출성격", key: "nature", width: 10 },
    { header: "매월(일)", key: "day", width: 9 }, { header: "시작월", key: "start", width: 10 },
    { header: "종료월", key: "end", width: 10 }, { header: "최근처리", key: "last", width: 10 },
  ];
  headRow(f, 1);
  rec.forEach((x) => f.addRow({ ...x, active: x.active ? "사용" : "꺼짐" }));
  f.getColumn("amount").numFmt = NUM;

  return Buffer.from(await wb.xlsx.writeBuffer());
}

/* ───────────── 가져오기 ───────────── */
function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (v instanceof Date) return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
  if (typeof v === "object") {
    const o = v as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (o.richText) return o.richText.map((x) => x.text).join("");
    if (o.text !== undefined) return String(o.text);
    if (o.result !== undefined) return cellText(o.result as ExcelJS.CellValue);
    return "";
  }
  return String(v).trim();
}
const num = (v: ExcelJS.CellValue) => Math.round(Number(cellText(v).replace(/[^\d.-]/g, "")) || 0);

export async function importWorkbook(buf: ArrayBuffer) {
  await ensureTables();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const result = { added: 0, skipped: 0, fixed: 0, recurring: 0, settings: false, sheets: [] as string[] };

  // 1) 설정 시트 (구글 시트 가계부 형식)
  const st = wb.getWorksheet("설정");
  if (st && cellText(st.getCell("A1").value) === "구분") {
    const cats: Categories = { 수입: {}, 지출: {}, 저축: {} };
    const pays: string[] = [], nats: string[] = [], budgets: Record<string, number> = {};
    let carry: number | undefined;
    st.eachRow((row, i) => {
      if (i < 2) return;
      const t = cellText(row.getCell(1).value), mj = cellText(row.getCell(2).value), mn = cellText(row.getCell(3).value);
      if ((TYPES as readonly string[]).includes(t) && mj) {
        cats[t][mj] = cats[t][mj] || [];
        if (mn && !cats[t][mj].includes(mn)) cats[t][mj].push(mn);
      }
      const p = cellText(row.getCell(5).value); if (p) pays.push(p);
      const n = cellText(row.getCell(6).value); if (n) nats.push(n);
      if (cellText(row.getCell(8).value) === "전년 이월금액") carry = num(row.getCell(9).value);
      const bk = cellText(row.getCell(11).value), bv = num(row.getCell(12).value);
      if (bk && bv > 0) budgets[bk] = bv;
    });
    const hasCats = Object.values(cats).some((x) => Object.keys(x).length);
    await saveConfig({
      ...(hasCats ? { categories: cats } : {}),
      ...(pays.length ? { payments: pays } : {}),
      ...(nats.length ? { natures: nats } : {}),
      ...(Object.keys(budgets).length ? { budgets } : {}),
      ...(carry !== undefined ? { startCarry: carry } : {}),
    });
    result.settings = true;
  }

  // 2) 월 시트: '날짜'·'구분' 머리글을 찾아 그 아래를 읽음
  const yearHint = kstNow().y;
  for (const ws of wb.worksheets) {
    const mName = ws.name.match(/^(\d{1,2})월/);
    if (!mName) continue;
    let head = 0;
    for (let i = 1; i <= Math.min(30, ws.rowCount); i++) {
      if (cellText(ws.getCell(i, 1).value) === "날짜" && cellText(ws.getCell(i, 2).value) === "구분") { head = i; break; }
    }
    if (!head) continue;
    // 열 위치는 머리글로 찾음 (구글 시트 형식/이 앱의 내보내기 형식 모두 지원)
    const hdr: Record<string, number> = {};
    // 같은 이름의 머리글이 오른쪽(카테고리별 집계표 등)에 또 있으므로 '처음 나온 열'만 사용
    ws.getRow(head).eachCell((c, col) => { const k = cellText(c.value); if (k && !(k in hdr)) hdr[k] = col; });
    const col = (...names: string[]) => names.map((n) => hdr[n]).find(Boolean) || 0;
    const C = {
      date: 1, type: 2, major: col("대분류"), minor: col("소분류"), content: col("내용(사용처)", "내용"),
      inc: col("수입금액"), out: col("지출/저축금액"), pay: col("결제수단"), nat: col("지출성격"), memo: col("비고"),
    };
    let count = 0;
    for (let i = head + 1; i <= ws.rowCount; i++) {
      const row = ws.getRow(i);
      const g = (c: number) => (c ? row.getCell(c).value : null);
      let ds = cellText(g(C.date));
      const type = cellText(g(C.type));
      if (!ds || !(TYPES as readonly string[]).includes(type)) continue;
      if (/^\d{1,2}[-./]\d{1,2}$/.test(ds)) ds = `${yearHint}-${ds}`;
      const d = parseYmd(ds);
      const amount = type === "수입" ? num(g(C.inc)) : num(g(C.out));
      if (!d || amount <= 0) { result.skipped++; continue; }
      const content = cellText(g(C.content));
      const major = cellText(g(C.major)) || "기타", minor = cellText(g(C.minor));
      const payment = type === "수입" ? "" : cellText(g(C.pay)), nature = type === "지출" ? cellText(g(C.nat)) : "";
      const dup = await prisma.gagyeTx.findFirst({ where: { date: d.ymd, type, amount, content } });
      if (dup) {
        // 이미 있는 내역: 분류가 다르면 시트 기준으로 바로잡음 (예전 가져오기 오류 복구)
        if (dup.major !== major || dup.minor !== minor || dup.payment !== payment || dup.nature !== nature) {
          await prisma.gagyeTx.update({ where: { id: dup.id }, data: { major, minor, payment, nature } });
          result.fixed++;
        } else result.skipped++;
        continue;
      }
      await prisma.gagyeTx.create({
        data: {
          date: d.ymd, year: d.y, month: d.m, type, amount, content,
          major, minor, payment, nature,
          memo: cellText(g(C.memo)).slice(0, 300),
        },
      });
      result.added++; count++;
    }
    if (count) result.sheets.push(`${ws.name} ${count}건`);
  }

  // 3) 고정항목 시트
  const fx = wb.getWorksheet("고정항목");
  if (fx) {
    const hdr: Record<string, number> = {};
    fx.getRow(1).eachCell((c, col) => { const k = cellText(c.value); if (k && !(k in hdr)) hdr[k] = col; });
    if (hdr["구분"] && hdr["금액"]) {
      const existing = await prisma.gagyeRecurring.findMany();
      for (let i = 2; i <= fx.rowCount; i++) {
        const row = fx.getRow(i);
        const g = (name: string) => (hdr[name] ? cellText(row.getCell(hdr[name]).value) : "");
        const type = g("구분"), amount = num(row.getCell(hdr["금액"]).value);
        if (!(TYPES as readonly string[]).includes(type) || amount <= 0) continue;
        const content = g("내용"), day = Math.min(31, Math.max(1, Number(g("매월(일)")) || 1));
        if (existing.some((x) => x.type === type && x.amount === amount && x.content === content && x.day === day)) continue;
        const act = g("사용").toUpperCase();
        await prisma.gagyeRecurring.create({
          data: {
            active: !(act === "FALSE" || act === "꺼짐"), type, major: g("대분류") || "기타", minor: g("소분류"), content, amount,
            payment: g("결제수단"), nature: g("지출성격"), day,
            start: /^\d{4}-\d{2}$/.test(g("시작월")) ? g("시작월") : kstNow().ym,
            end: /^\d{4}-\d{2}$/.test(g("종료월")) ? g("종료월") : "",
            last: /^\d{4}-\d{2}$/.test(g("최근처리")) ? g("최근처리") : "",
          },
        });
        result.recurring++;
      }
    }
  }
  return result;
}
