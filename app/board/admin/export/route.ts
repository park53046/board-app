/* eslint-disable @typescript-eslint/no-explicit-any */
import ExcelJS from "exceljs";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 과목 표시 순서(이 목록 순으로 시트 생성, 그 외 과목은 뒤에 추가)
const SUBJECT_ORDER = ["인공지능", "프로그래밍", "컴퓨터그래픽", "데이터과학"];

// 시트명 규칙 위반 문자 제거 (Excel 제한: []:*?/\ , 31자)
function safeSheetName(name: string): string {
  return name.replace(/[[\]:*?/\\]/g, " ").slice(0, 31) || "기타";
}

// 하나의 시트를 표준 서식으로 채운다
function buildSheet(ws: ExcelJS.Worksheet, posts: any[]) {
  ws.views = [{ state: "frozen", ySplit: 1 }]; // 헤더 고정
  ws.columns = [
    { header: "번호", key: "id", width: 6 },
    { header: "소속", key: "affil", width: 14 },
    { header: "학번", key: "studentId", width: 10 },
    { header: "성명", key: "name", width: 10 },
    { header: "과목", key: "subject", width: 12 },
    { header: "제목", key: "title", width: 32 },   // F열
    { header: "내용", key: "content", width: 60 },  // G열
    { header: "작성일시", key: "createdAt", width: 20 },
  ];

  // 헤더 스타일
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A2B4A" } };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });

  // 데이터 행
  posts.forEach((p: any) => {
    ws.addRow({
      id: p.id,
      affil: p.user?.affil ?? "",
      studentId: p.user?.studentId ?? "",
      name: p.user?.name ?? "",
      subject: p.subject,
      title: p.title,
      content: p.content,
      createdAt: new Date(p.createdAt).toLocaleString("ko-KR"),
    });
  });

  // 본문: 가운데 정렬 + 사방 테두리(줄칸) + F(제목)/G(내용) 자동 줄바꿈
  const thin = { style: "thin" as const, color: { argb: "FFB0B7C3" } };
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= 8; c++) {
      const cell = row.getCell(c);
      cell.alignment =
        c === 6 || c === 7
          ? { vertical: "middle", horizontal: "center", wrapText: true } // 제목·내용은 줄바꿈 유지
          : { vertical: "middle", horizontal: "center" };
      cell.border = { top: thin, bottom: thin, left: thin, right: thin };
    }
  }
}

export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin) {
    return new Response("권한이 없습니다.", { status: 403 });
  }

  const posts = await (prisma as any).boardPost.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });

  // 과목별 그룹핑
  const groups = new Map<string, any[]>();
  for (const p of posts) {
    const key = String(p.subject ?? "기타");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  // 시트 순서: 정해진 순서 우선, 그 외 과목은 뒤에
  const subjects = [
    ...SUBJECT_ORDER.filter((s) => groups.has(s)),
    ...[...groups.keys()].filter((s) => !SUBJECT_ORDER.includes(s)),
  ];

  const wb = new ExcelJS.Workbook();
  wb.creator = "학습 소감 게시판";

  if (subjects.length === 0) {
    // 글이 하나도 없을 때 빈 시트라도 생성
    buildSheet(wb.addWorksheet("전체"), []);
  } else {
    for (const subject of subjects) {
      const ws = wb.addWorksheet(safeSheetName(subject));
      buildSheet(ws, groups.get(subject)!);
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  const today = new Date().toISOString().slice(0, 10);
  const filename = `board_소감_과목별_${today}.xlsx`;

  return new Response(Buffer.from(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
