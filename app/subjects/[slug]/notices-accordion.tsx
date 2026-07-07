"use client";

import { useState } from "react";
import type { Notice } from "@/lib/notices";

export default function NoticesAccordion({ notices }: { notices: Notice[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (notices.length === 0) {
    return <p className="text-sm text-gray-500">아직 등록된 공지사항이 없습니다.</p>;
  }

  return (
    <ul className="mt-2 space-y-2">
      {notices.map((n) => {
        const isOpen = openId === n.id;
        return (
          <li key={n.id} className="border border-gray-300 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : n.id)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left cursor-pointer"
            >
              <span className="font-medium">
                {n.title} <span className="text-sm text-gray-500">({n.date})</span>
              </span>
              <span className="text-sm text-gray-400">{isOpen ? "▲" : "▼"}</span>
            </button>
            {isOpen && (
              <p className="px-3 pb-3 text-sm whitespace-pre-wrap border-t border-gray-200 pt-2">
                {n.content}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
