import Link from "next/link";
import { notFound } from "next/navigation";
import { subjects, getSubject } from "../subjects-data";
import { getNoticesForSubject } from "@/lib/notices";
import { getSubjectFiles } from "@/lib/subject-files";
import NoticesAccordion from "./notices-accordion";
import NoticeForm from "./notice-form";

// public/subjects/<slug>/ 폴더에 파일을 추가/삭제하면 바로 반영되도록 매 요청마다 새로 렌더링합니다.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return subjects.map((s) => ({ slug: s.slug }));
}

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const subject = getSubject(slug);
  if (!subject) notFound();
  const notices = getNoticesForSubject(slug);

  // subjects-data.ts에 직접 등록한 자료 + public/subjects/<slug>/ 폴더에 넣어둔 파일을 합쳐서 보여줍니다.
  const allMaterials = [
    ...subject.materials.map((m) => ({ name: m.title, url: m.url })),
    ...getSubjectFiles(slug),
  ];

  return (
    <div className="mt-6 text-lg leading-8 text-white-600 px-10 py-4 rounded-xl shadow-lg">
      <h1>{subject.name}</h1>

      <h2 className="mt-8 text-xl font-semibold">공지사항</h2>
      <NoticeForm slug={slug} />
      <NoticesAccordion notices={notices} />

      <h2 className="mt-8 text-xl font-semibold">수업 자료</h2>
      {allMaterials.length === 0 ? (
        <p className="text-sm text-gray-500">아직 등록된 자료가 없습니다.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {allMaterials.map((m, i) => (
            <li key={i}>
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                {m.name}
              </a>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-xl font-semibold">과제 제출</h2>
      <div className="mt-2 flex flex-wrap gap-3">
        {subject.assignmentForms.map((f, i) =>
          f.url ? (
            <a
              key={i}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-btn inline-block"
            >
              {f.label}
            </a>
          ) : (
            <p key={i} className="text-sm text-gray-500">
              {f.label} 링크가 준비 중입니다.
            </p>
          )
        )}
      </div>

      <p className="mt-10">
        <Link href="/intro" className="text-sm text-gray-500 underline">
          ← 교사 소개로 돌아가기
        </Link>
      </p>
    </div>
  );
}
