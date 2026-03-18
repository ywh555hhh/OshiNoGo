const KANA_PLACEHOLDER_FILE = 'kana-placeholder.svg'

export const HEADER_COPY = {
  eyebrow: '平假名 / 片假名训练场',
  title: '从认读到整词，把假名练熟一点。',
  description:
    '先用 recognition 认识字形和 romaji，再用 dictation 练听到就能写，最后到 words 看看自己能不能把反应带进真实单词。',
  modeBadges: ['recognition · 认读', 'dictation · 听写', 'words · 整词'] as const,
} as const

export const ONBOARDING_COPY = {
  title: '欢迎来到 OshiNoGo 假名训练场',
  description:
    '第一次打开先看这一页就够了：知道从哪开始、为什么有些题会卡住，以及哪些能力受浏览器环境影响。',
  guideCards: [
    {
      title: '① recognition',
      description: '先练看到就能读。随机给出单个假名，先把形 → 音这一步练顺。',
    },
    {
      title: '② dictation',
      description: '再练听到就能写。没听清就重播，先把音 → 形的映射慢慢做稳。',
    },
    {
      title: '③ words',
      description: '最后看整词迁移。用纯假名单词检查你能不能把单字反应带进真实读法。',
    },
  ],
  specialKanaTitle: '特殊假名说明',
  specialKanaPoints: [
    'じ / ぢ 在现代日语里通常都读作 ji。',
    'ず / づ 在现代日语里通常都读作 zu。',
    '它们的差别更多来自书写习惯、词源或构词规则，不是第一天就必须完全分清。',
    '初学阶段先知道“这里有特殊点”就够了，先把整体节奏练起来。',
  ],
  speechTitle: '语音边界',
  speechBody: 'dictation 和 words 使用浏览器原生 speechSynthesis，不走后端 TTS。不同浏览器、系统语音包和设备上的效果会不同。',
  storageTitle: '保存边界',
  storageBody:
    '主题、上次模式、训练偏好、累计统计和最近一次摘要只保存在当前浏览器 localStorage。换设备或清空浏览器数据后不会自动同步。',
  mindsetTitle: '训练心态提示',
  mindsetPoints: ['没听清就重播。', '一时卡住就跳过，不必把自己钉在一题上。', '先求熟，再求快；速度是熟悉之后自然长出来的。'],
  dismissLabel: '稍后再看',
  confirmLabel: '我知道怎么开始了',
} as const

export const TRAINING_HINT_COPY = {
  recognition:
    '浊音里有两组特殊对应：じ / ぢ 常写作 ji，ず / づ 常写作 zu。现代发音里多半同读，先知道这是特殊点就够了。',
  dictation:
    '听写里要特别留意：じ / ぢ、ず / づ 单独听时常不区分。先理解它们属于规则上的特殊例外，卡住就跳过，不必把节奏停死。',
} as const

export const FOOTNOTE_COPY = {
  badge: 'Kana footnote',
  title: '把 Kana 留在页脚，训练先放前面。',
  lead:
    '这里的 kana 既是假名的 romaji，也悄悄呼应有马加奈。梗可以留，但主角还是你眼前这一组题。',
  notes: [
    '如果你刚好会被 じ / ぢ、ず / づ 绕住，放心，这几组本来就是初学者最容易疑惑的地方之一。',
    '这个区域只负责补充气氛和注脚，不会打断训练节奏；练累了再回来看看就好。',
  ],
  asideTitle: '特殊点，先知道就好',
  asideBody:
    '现代发音里，じ / ぢ 通常都读作 ji，ず / づ 通常都读作 zu。真正的区别常常要到词源、构词和书写习惯里才会展开。',
  placeholderTitle: '加奈图片占位',
  placeholderCaption: '这里先放稳定占位图，后续直接替换成正式加奈图片即可，不会把版式撑乱。',
  placeholderAlt: '加奈图片占位图，后续可替换为正式图片。',
  placeholderPathHint: '后续只需要替换同名占位资源即可。',
} as const

export const KANA_PLACEHOLDER_SRC = `${import.meta.env.BASE_URL}${KANA_PLACEHOLDER_FILE}`
