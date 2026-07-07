import Image from "next/image";
export default function AboutPage(){
   return (
         <div>
            <h1 className="mt-6 text-lg leading-8 text-white-600 px-10 py-5 rounded-xl shadow-lg"> 
               학교 연혁 페이지 입니다. 
               지난 60년의 학교 역사를 한눈에 볼 수 있습니다.</h1>
               <div className="mt-6 text-lg leading-8 text-white-600 px-10 py-2 rounded-xl shadow-lg">
                  <p>1964년: 동해삼육고등학교 설립</p>
                  <p>1970년: 새로운 교육과정 도입</p>
                  <p>1980년: 학교 건물 리모델링</p>
                  <p>2000년: 디지털 교육 환경 구축</p>
                  <p>2020년: 새로운 학교 철학 수립</p>
                  <p>2025년: Digital Education Initiative School 확정</p>
                  <p>2030년: Digital Education Center 설립 예정</p>
               </div>
         
               <div className="p-10">
                  <h1 className="text-4xl font-extrabold text-indigo-600 tracking-brighter leading-tight mb-4">
                     2030 SMART SCHOOL LAYOUT </h1>
            
                     <Image
                        src="/layout.jpg"
                        alt="스마트 동해삼육고등학교"
                        width={800}
                        height={600}
                        style={{ width: '100%', height: 'auto' }} /> 
               </div>
         </div>
   )
}

         
   
