import Image from 'next/image';

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-4">
      <h1 className="mt-8 text-2xl font-bold text-slate-800">
        VIKI샘의 코딩 교실에 오신 것을 환영합니다.
      </h1>

      <div className="py-8">
        <h1 className="text-4xl md:text-3xl font-extrabold text-indigo-600 tracking-tight mb-6">
          Welcome to VIKI Coding-Room..!
        </h1>

        <Image
          src="/home-hero-v4.jpg"
          alt="미래형 AI 컴퓨터실"
          width={1600}
          height={900}
          className="block w-full h-auto rounded-2xl"
        />
      </div>

      <div className="space-y-6 pb-14">
        <p className="text-base leading-8 text-slate-700 bg-white/75 px-8 py-6 rounded-2xl shadow">
           현대 사회는 이른바 &quot;인공지능 사회&quot;라고도 불립니다. 이런 세상에서는 자신의 정체성을 알리기 위한
          다양한 방법이 존재합니다. 그 중 하나가 바로 &quot;홈페이지&quot;입니다. 홈페이지는 개인이나 단체가 자신을 소개하고,
          정보를 공유하며, 소통할 수 있는 공간입니다. 이 공간을 통해 우리는 자신의 생각과 아이디어를 세상에 알릴 수 있습니다.
          사이버 세상에 자신을 공개하고 자신의 존재를 알리는 것은 매우 중요합니다. 이를 통해 우리는 다른 사람들과 연결되고, 새로운 기회를 발견하며,
          자신의 능력을 발휘할 수 있습니다. 홈페이지를 통해 우리는 자신을 표현하고, 다른 사람들과 소통하며, 세상과 연결될 수 있습니다.
          따라서 홈페이지는 단순한 웹사이트가 아니라, 우리의 정체성을 나타내는 중요한 도구입니다. 이를 통해 우리는 세상에 자신을 알리고, 더 나은 미래를 향해 나아갈 수 있습니다.
        </p>
        <p className="text-base leading-8 text-slate-700 bg-white/75 px-8 py-6 rounded-2xl shadow">
          홈페이지를 만드는 것은 단순히 기술적인 작업이 아니라, 자신의 생각과 아이디어를 시각적으로 표현하는 과정입니다. 이를 통해 우리는 창의력과 문제 해결 능력을 향상시킬 수 있습니다.
          또한, 홈페이지를 운영하면서 우리는 다양한 기술과 도구를 배우게 되며, 이는 우리의 전문성을 높이는 데 큰 도움이 됩니다. 따라서 홈페이지란 단순한 개인 공간이나 제품소개가
          아닌, 브랜드의 얼굴이라 하겠습니다. 아름답게 메이커 업 해볼까요.? ㅋㅋ
        </p>
      </div>
    </div>
  );
}
