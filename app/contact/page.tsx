import { staffDirectory } from './staff-data';

export default function ContactPage() {
  return (
    <div className="mt-6 text-lg leading-8 text-white-600 px-10 py-4 rounded-xl shadow-lg">
      <h1>학교 및 교직원 연락처</h1>
      <p>학교 주소: 강원도 동해시 동해대로 5367</p>
      <p>교무실 착신전화: 033-531-3206 (내선 1612) / FAX: 033-531-0353</p>
      <p>행정실 착신전화: 033-531-3207 (내선 1607) / FAX: 033-531-7161</p>
      <p className="text-sm">※ 외부에서 내선번호로 직접 거실 때는 033-539-'내선번호' 형식으로 거시면 됩니다.</p>

      <h2 className="mt-8 text-xl font-semibold">교직원 연락처</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-gray-400 text-left">
              <th className="px-2 py-2">번호</th>
              <th className="px-2 py-2">직책</th>
              <th className="px-2 py-2">성명</th>
              <th className="px-2 py-2">내선</th>
              <th className="px-2 py-2">비고</th>
              <th className="px-2 py-2">휴대폰</th>
            </tr>
          </thead>
          <tbody>
            {staffDirectory.map((staff) => (
              <tr key={staff.no} className="border-b border-gray-200">
                <td className="px-2 py-1">{staff.no}</td>
                <td className="px-2 py-1">{staff.position}</td>
                <td className="px-2 py-1">{staff.name}</td>
                <td className="px-2 py-1">{staff.ext}</td>
                <td className="px-2 py-1">{staff.note ?? ''}</td>
                <td className="px-2 py-1">{staff.mobile ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}