import { findLanguage } from '../../shared/contracts/languages.js';

const baseSlides = [
  {
    title: 'Opening Keynote: Brewing Across Asia',
    body: 'Welcome to Asia Brew Conference. Today we connect brewers, growers, equipment makers, and researchers across the region.',
    imageLabel: 'Copper mash tun / opening slide'
  },
  {
    title: 'Panel: Yeast, Terroir, and Local Ingredients',
    body: 'Speakers discuss how yeast choice, local grains, and climate affect fermentation character and consistency.',
    imageLabel: 'Fermentation tanks / technical panel'
  },
  {
    title: 'Workshop: Hop Aroma and Dry-Hop Timing',
    body: 'A practical session on dry-hop contact time, temperature, oxygen pickup, and sensory evaluation.',
    imageLabel: 'Hops and sensory glasses / workshop'
  }
];

const localized = {
  'ja-JP': [
    ['基調講演：アジアをつなぐ醸造', 'Asia Brew Conferenceへようこそ。本日は地域のブルワー、生産者、設備メーカー、研究者をつなぎます。'],
    ['パネル：酵母、テロワール、地域素材', '酵母の選択、地域の穀物、気候が発酵の個性と安定性にどう影響するかを議論します。'],
    ['ワークショップ：ホップ香とドライホップのタイミング', 'ドライホップの接触時間、温度、酸素混入、官能評価について扱います。']
  ],
  'ko-KR': [
    ['기조연설: 아시아를 잇는 양조', 'Asia Brew Conference에 오신 것을 환영합니다. 오늘 우리는 지역의 양조인, 생산자, 장비사, 연구자를 연결합니다.'],
    ['패널: 효모, 테루아, 지역 재료', '효모 선택, 지역 곡물, 기후가 발효의 특성과 일관성에 미치는 영향을 논의합니다.'],
    ['워크숍: 홉 아로마와 드라이홉 타이밍', '드라이홉 접촉 시간, 온도, 산소 유입, 관능 평가를 다룹니다.']
  ],
  'zh-CN': [
    ['主题演讲：连接亚洲酿造', '欢迎来到 Asia Brew Conference。今天我们连接区域内的酿酒师、种植者、设备制造商和研究人员。'],
    ['圆桌：酵母、风土与本地原料', '讲者讨论酵母选择、本地谷物和气候如何影响发酵风味与稳定性。'],
    ['工作坊：酒花香气与干投时机', '实践讨论干投接触时间、温度、氧气摄入和感官评估。']
  ]
};

export function getSlides(languageCode) {
  const language = findLanguage(languageCode);
  const translated = localized[language.code];
  return baseSlides.map((slide, index) => {
    const pair = translated?.[index];
    return {
      index,
      total: baseSlides.length,
      title: pair?.[0] || slide.title,
      body: pair?.[1] || slide.body,
      imageLabel: slide.imageLabel
    };
  });
}

export function getCurrentSlide(languageCode, index = 0) {
  const slides = getSlides(languageCode);
  return slides[Math.max(0, Math.min(index, slides.length - 1))];
}
