"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addNoticeAction } from "@/app/intro/actions";

export default function NoticeForm({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(addNoticeAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="mt-2 mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-100 cursor-pointer"
      >
        {open ? "닫기" : "+ 공지 작성"}
      </button>

      {open && (
        <form ref={formRef} action={formAction} className="mt-3 flex flex-col gap-2 max-w-md">
          <input type="hidden" name="slug" value={slug} />
          <input
            name="title"
            type="text"
            placeholder="제목"
            required
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <textarea
            name="content"
            placeholder="내용"
            required
            rows={4}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={isPending}
            className="self-start bg-indigo-600 text-white rounded-md px-4 py-2 text-sm disabled:opacity-50 cursor-pointer"
          >
            {isPending ? "등록 중..." : "등록"}
          </button>
          {state?.ok === true && (
            <p className="text-sm text-green-600">✓ 등록되었습니다.</p>
          )}
          {state?.ok === false && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}
        </form>
      )}
    </div>
  );
}
