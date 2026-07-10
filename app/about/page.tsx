import Link from 'next/link';

export default function AboutPage(){
   return (
         <div>
            <p>:</p>
            <h1 className="mt-8 text-lg leading-8 text-white-600 px-12 py-3 rounded-xl shadow-lg">
              저희 학교를 소개합니다.
            </h1>
            <div className="mt-2 text-lg leading-8 text-white-600 px-10 py-10 rounded-xl shadow-lg"> 
               <p>동해삼육고등학교는 강원도 동해시에 위치한 사립 고등학교입니다.</p>
               <p>저희 학교는 1964년에 설립된 역사 깊은 학교로, 학생들에게 양질의 교육과 다양한 활동을 제공하고 있습니다.</p>
               <p>학교 연혁 페이지에서 학교의 역사와 교육 철학을 확인하실 수 있습니다.</p>
               <p>교직원 연락처 페이지에서는 학교 및 교직원의 연락처 정보를 확인하실 수 있습니다.</p>    
               <p>기타 메뉴에서 학교 운영 과정을 모두 확인 하실 수 있습니다.</p>
            </div>
         </div>
   )
} 