// 가계365 기본값 (설정이 없을 때 사용)

export const TYPES = ["수입", "지출", "저축"] as const;
export type TxType = (typeof TYPES)[number];

export type Categories = Record<string, Record<string, string[]>>;

export const DEFAULT_CATEGORIES: Categories = {
  수입: {
    주수입: ["급여", "상여", "수당"],
    부수입: ["부업", "이자/배당", "중고판매", "용돈", "기타수입"],
  },
  지출: {
    식비: ["식자재", "외식", "배달", "카페/간식", "술/유흥"],
    주거통신: ["관리비", "월세", "전기/수도", "도시가스", "휴대폰", "인터넷/TV"],
    생활용품: ["생필품", "주방/욕실", "가구/가전"],
    의복미용: ["의류/잡화", "미용실", "화장품", "세탁/수선"],
    건강문화: ["병원/약", "운동", "문화생활", "여행/숙박", "도서", "구독서비스"],
    교육육아: ["학원비", "교육비", "교재", "육아용품"],
    교통차량: ["주유", "대중교통", "택시", "주차/통행료", "정비/세차", "자동차보험"],
    경조회비: ["경조사비", "회비", "선물", "기부"],
    금융: ["보험", "대출이자", "수수료", "세금/과태료"],
    기타지출: ["기타"],
  },
  저축: {
    저축투자: ["적금", "예금", "주택청약", "연금", "투자"],
  },
};

export const DEFAULT_PAYMENTS = ["현금", "체크카드", "신용카드", "계좌이체", "간편결제"];
export const DEFAULT_NATURES = ["고정지출", "변동지출", "낭비지출"];

export type GagyeConfig = {
  categories: Categories;
  payments: string[];
  natures: string[];
  budgets: Record<string, number>; // 대분류 → 월예산
  startCarry: number; // 가계부 시작 시점 잔액(이월금)
  salarySubs: string[]; // 연말정산 참고: 총급여로 볼 소분류
};

export const DEFAULT_CONFIG: GagyeConfig = {
  categories: DEFAULT_CATEGORIES,
  payments: DEFAULT_PAYMENTS,
  natures: DEFAULT_NATURES,
  budgets: {},
  startCarry: 0,
  salarySubs: ["급여", "상여", "수당"],
};
