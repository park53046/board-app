import Image from 'next/image';

export default function Home() {
  return (
    <div>
      <h1 className="mt-6 text-lg leading-8 text-white-600 px-10 py-10 rounded-xl shadow-lg">
        동해삼육고등학교에 오신것을 환영합니다.</h1>

      <div className="p-10">
        <h1 className="text-5xl font-extrabold text-indigo-500 tracking-tight">
          WELCOME TO DONGHAE SAHMYOOK SCHOOL</h1>

          <Image
            src="/image.jpg"
            alt="동해삼육고등학교 전경"
            width={1600}
            height={900}
            style={{ width: '100%', height: 'auto' }} />  
      </div>    
      <div>
          <p className="mt-6 text-lg leading-8 text-white-600 px-10 py-10 rounded-xl shadow-lg">  
            저희 학교는 1964년에 설립된 역사 깊은 학교로, 학생들에게 양질의 교육과 다양한 활동을 제공하고 있습니다.
            학교의 목표는 학생들이 학문적 성취뿐만 아니라 인격적 성장과 사회적 책임감을 갖춘 인재로 성장하도록 돕는 것입니다.
            저희 학교는 다양한 학문 분야에서 우수한 교육을 제공하며, 학생들이 자신의 잠재력을 최대한 발휘할 수 있도록 지원합니다.
          </p>
      </div>
    </div>    

  )
}  