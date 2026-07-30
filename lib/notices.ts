/* eslint-disable @typescript-eslint/no-explicit-any */
// 과목별 공지사항을 DB(Turso/Prisma)에 저장/조회하는 서버 전용 모듈.
// (이전에는 data/notices.json 파일에 저장했으나, Vercel 서버리스 환경은
//  파일 쓰기가 불가/휘발성이라 DB로 옮겼습니다.)

import { prisma } from "@/lib/db";

export type Notice = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  content: string;
};

// 과목(slug)의 공지사항을 최신순으로 반환합니다.
export async function getNoticesForSubject(slug: string): Promise<Notice[]> {
  try {
    const rows = await (prisma as any).notice.findMany({
      where: { slug },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r: any) => ({
      id: String(r.id),
      date: new Date(r.createdAt).toISOString().slice(0, 10),
      title: r.title,
      content: r.content,
    }));
  } catch {
    return [];
  }
}

// 새 공지사항을 추가하고 추가된 항목을 반환합니다.
export async function addNotice(slug: string, title: string, content: string): Promise<Notice> {
  const r = await (prisma as any).notice.create({
    data: { slug, title, content },
  });
  return {
    id: String(r.id),
    date: new Date(r.createdAt).toISOString().slice(0, 10),
    title: r.title,
    content: r.content,
  };
}
