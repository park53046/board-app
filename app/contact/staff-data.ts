export type StaffMember = {
  no: number;
  position: string;
  name: string;
  ext: string;
  note?: string;
  mobile?: string;
};

export const staffDirectory: StaffMember[] = [
  { no: 1, position: "교장", name: "김형기", ext: "1600", mobile: "010-5101-3636" },
  { no: 2, position: "교감", name: "김경임", ext: "1601", mobile: "010-2854-7431" },
  { no: 3, position: "교목", name: "차윤환", ext: "1602", mobile: "010-8969-5544" },
  { no: 4, position: "부목", name: "박재혁", ext: "1603", mobile: "010-5679-6242" },
  { no: 5, position: "교무부장(고)", name: "박진선", ext: "1610", mobile: "010-4924-1578" },
  { no: 6, position: "교무부장(중)", name: "권세일", ext: "1611", mobile: "010-8523-5054" },
  { no: 7, position: "학생안전부장", name: "장경숙", ext: "1632", mobile: "010-2830-9587" },
  { no: 8, position: "창체환경부장", name: "오영민", ext: "1637", note: "고3-2", mobile: "010-7232-1772" },
  { no: 9, position: "교육정보부장", name: "안경수", ext: "1617", mobile: "010-2305-3610" },
  { no: 10, position: "연구부장", name: "한복영", ext: "1615", mobile: "010-6273-9842" },
  { no: 11, position: "진로진학부장", name: "하주연", ext: "1634", mobile: "010-4536-1936" },
  { no: 12, position: "교사", name: "고현수", ext: "1639", note: "고1-1", mobile: "010-4249-0323" },
  { no: 13, position: "교사", name: "임범식", ext: "1625", note: "중2", mobile: "010-3398-7965" },
  { no: 14, position: "교사", name: "이후영", ext: "1633", note: "고2-1", mobile: "010-4723-8459" },
  { no: 15, position: "교사", name: "최수진", ext: "1638", mobile: "010-3158-5323" },
  { no: 16, position: "교사", name: "이향민", ext: "1621", mobile: "010-5766-9745" },
  { no: 17, position: "교사", name: "전계현", ext: "1620", mobile: "010-8793-9436" },
  { no: 18, position: "교사", name: "김민숙", ext: "1636", note: "여사감", mobile: "010-2280-2237" },
  { no: 19, position: "교사", name: "김지훈", ext: "1638", note: "고3-1", mobile: "010-5655-8121" },
  { no: 20, position: "교사", name: "오명환", ext: "1624", mobile: "010-9308-9174" },
  { no: 21, position: "교사", name: "이선", ext: "1631", note: "고1-2", mobile: "010-9857-5678" },
  { no: 22, position: "교사", name: "하은혜", ext: "1614", note: "고2-2", mobile: "010-4117-7866" },
  { no: 23, position: "교사", name: "최혜린", ext: "1640", mobile: "010-4345-1863" },
  { no: 24, position: "교사", name: "김수미", ext: "1622", note: "중1", mobile: "010-8838-1122" },
  { no: 25, position: "교사", name: "김지나", ext: "1623", note: "중3", mobile: "010-4272-0190" },
  { no: 26, position: "교사", name: "박진아", ext: "1635", mobile: "010-7149-1130" },
  { no: 27, position: "강사", name: "박희정", ext: "1627", mobile: "010-3456-1376" },
  { no: 28, position: "학습튜터", name: "김솔지", ext: "1626", mobile: "010-2361-0223" },
  { no: 29, position: "진로대체강사", name: "임상진", ext: "1628", mobile: "010-2742-4365" },
  { no: 30, position: "원어민강사", name: "Hayes Isiah", ext: "1629", mobile: "010-1234-5678" },
  { no: 31, position: "행정실장", name: "이해식", ext: "1604", mobile: "010-4760-9550" },
  { no: 32, position: "행정계장", name: "조성기", ext: "1605", mobile: "010-9722-3004" },
  { no: 33, position: "주무관", name: "서선희", ext: "1606", mobile: "010-4870-3681" },
  { no: 34, position: "주무관", name: "김인서", ext: "1608", mobile: "010-2365-3681" },
  { no: 35, position: "주무관", name: "최철영", ext: "1609", mobile: "010-3388-3686" },
  { no: 36, position: "사무행정실무원", name: "주선미", ext: "1607", mobile: "010-6371-7199" },
  { no: 37, position: "학교보안관", name: "조성진", ext: "1641", mobile: "010-5067-7224" },
  { no: 38, position: "전문상담사", name: "심영주", ext: "1630", mobile: "010-4806-3005" },
  { no: 39, position: "교무행정사(고)", name: "김연일", ext: "1613", mobile: "010-4373-8405" },
  { no: 40, position: "교무행정사(중)", name: "권주희", ext: "1612", mobile: "010-2075-5817" },
  { no: 41, position: "영양사", name: "권수경", ext: "1642", note: "영양사", mobile: "010-8263-0203" },
  { no: 42, position: "부영양사", name: "이시원", ext: "1643", note: "부영양사", mobile: "010-7422-7309" },
  { no: 43, position: "조합사무국장", name: "박기혁", ext: "1616", mobile: "010-8565-7866" },
  { no: 44, position: "남기숙사 사감", name: "김선홍", ext: "1644", note: "남사감", mobile: "010-5779-6672" },
];
