import type { Metadata, Viewport } from "next";
import GagyeApp from "./GagyeApp";

export const metadata: Metadata = {
  title: "가계365 | 가계부",
  description: "월별 수입·지출 기록, 영수증 자동 입력, 고정 항목 자동 기록, 연간 정산",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "가계365", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#6d5df6",
};

export default function GagyePage() {
  return <GagyeApp />;
}
