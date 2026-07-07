import fs from "fs";
import path from "path";

// 과목별 공지사항을 파일(data/notices.json)에 저장/조회하는 서버 전용 모듈.
// Node 서버가 상시 실행되는 환경(자체 서버 등)에서 사용하는 것을 전제로 합니다.
// (Vercel 같은 서버리스 환경에서는 파일 쓰기가 영구적으로 보존되지 않을 수 있습니다.)

export type Notice = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  content: string;
};

type NoticesStore = Record<string, Notice[]>;

const DATA_PATH = path.join(process.cwd(), "data", "notices.json");

function readStore(): NoticesStore {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    return JSON.parse(raw) as NoticesStore;
  } catch {
    return {};
  }
}

function writeStore(store: NoticesStore) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2) + "\n", "utf-8");
}

// 과목(slug)의 공지사항을 최신순으로 반환합니다.
export function getNoticesForSubject(slug: string): Notice[] {
  const store = readStore();
  const list = store[slug] ?? [];
  return [...list].sort((a, b) => (a.id < b.id ? 1 : -1));
}

// 새 공지사항을 추가하고 추가된 항목을 반환합니다.
export function addNotice(slug: string, title: string, content: string): Notice {
  const store = readStore();
  if (!store[slug]) store[slug] = [];

  const now = new Date();
  const notice: Notice = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    date: now.toISOString().slice(0, 10),
    title,
    content,
  };

  store[slug].push(notice);
  writeStore(store);
  return notice;
}
