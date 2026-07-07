export type Material = {
  title: string;
  url: string;
};

export type AssignmentForm = {
  label: string;
  url: string;
};

export type Subject = {
  slug: string;
  name: string;
  materials: Material[];
  // Google Form/Classroom 과제 제출 링크 목록. url을 비워두면 버튼이 "준비 중"으로 표시됩니다.
  assignmentForms: AssignmentForm[];
};

// 공지사항은 더 이상 이 파일에 하드코딩하지 않고 data/notices.json 에 저장됩니다.
// (작성: /intro 페이지의 공지사항 작성 폼 → lib/notices.ts → app/subjects/[slug]/page.tsx 에서 조회)
export const subjects: Subject[] = [
  { slug: "ai", name: "인공지능", materials: [], assignmentForms: [{ label: "과제 제출", url: "https://classroom.google.com/c/ODQ3MDE0NjAzMDAz" }] },
  { slug: "programming", name: "프로그래밍", materials: [], assignmentForms: [{ label: "과제 제출", url: "https://classroom.google.com/c/ODQ3MDE1MTI2MDEz" }] },
  {
    slug: "graphics",
    name: "컴퓨터그래픽",
    materials: [],
    assignmentForms: [
      { label: "과제제출(A반)", url: "https://classroom.google.com/w/ODQ3NjEyMDYxMzMw/t/all" },
      { label: "과제제출(B반)", url: "https://classroom.google.com/w/ODQ3NjEyMjMxNTY4/t/all" },
    ],
  },
  { slug: "data-science", name: "데이터과학", materials: [], assignmentForms: [{ label: "과제 제출", url: "https://classroom.google.com/c/ODU0NzU3Mzk3MzQx" }] },
];

export function getSubject(slug: string): Subject | undefined {
  return subjects.find((s) => s.slug === slug);
}
