import fs from "fs";
import path from "path";

// public/subjects/<slug>/ 폴더 안의 파일들을 읽어 자동으로 자료 목록을 만듭니다.
// 예: public/subjects/ai/1단원_변수와자료형.pdf
//  -> 웹에서 /subjects/ai/1단원_변수와자료형.pdf 로 그대로 서빙됩니다.

export type SubjectFile = {
  name: string; // 화면에 보여줄 이름 (확장자 제거)
  url: string; // 실제 파일 경로
};

const PUBLIC_SUBJECTS_DIR = path.join(process.cwd(), "public", "subjects");

export function getSubjectFiles(slug: string): SubjectFile[] {
  const dir = path.join(PUBLIC_SUBJECTS_DIR, slug);

  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }

  return entries
    .filter((name) => {
      if (name.startsWith(".")) return false; // .gitkeep 등 숨김 파일 제외
      const full = path.join(dir, name);
      try {
        return fs.statSync(full).isFile();
      } catch {
        return false;
      }
    })
    .sort((a, b) => a.localeCompare(b, "ko"))
    .map((name) => ({
      name: name.replace(/\.[^./]+$/, ""), // 확장자 제거한 표시용 이름
      url: `/subjects/${slug}/${name
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`,
    }));
}
