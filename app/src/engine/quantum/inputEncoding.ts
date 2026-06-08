import type { BirthInput, ContextInput, MeasurementInput, EmotionType, TimeHorizon, QuestionType } from '../../types/fate'
import { ELEMENT_PHASE, ELEMENT_ZH, getYearPillarNayin } from '../ganzhiNayin'
import { hashString } from '../seededRandom'

export type QuestionFeatures = {
  topicAngle: number
  timePhase: number
  emotionAngle: number
  agencyAngle: number
  decoherence: number
  entangleStrength: number
  keywords: string[]
  topicLabel: string
}

const TOPIC_ANGLES: Record<QuestionType, number> = {
  career: 0.35,
  relationship: 1.1,
  study: 0.75,
  wealth: 0.55,
  social: 0.95,
  creative: 1.35,
  daily: 0.2,
  majorChoice: 1.55,
}

const TIME_PHASE: Record<TimeHorizon, number> = {
  today: 0.15,
  '7days': 0.45,
  '30days': 0.85,
  '3months': 1.25,
  '1year': 1.85,
}

const EMOTION_ANGLE: Record<EmotionType, number> = {
  calm: 0.1,
  hesitant: 0.55,
  excited: 0.85,
  anxious: 1.35,
  tired: 0.7,
  angry: 1.1,
  expectant: 0.4,
  numb: 0.95,
}

const EMOTION_DECOHERENCE: Record<EmotionType, number> = {
  calm: 0.06,
  hesitant: 0.18,
  excited: 0.14,
  anxious: 0.32,
  tired: 0.22,
  angry: 0.26,
  expectant: 0.1,
  numb: 0.2,
}

const TEXT_KEYWORDS: { words: string[]; topicBoost: number; agency: number; deco: number; label: string }[] = [
  { words: ['要不要', '该不该', '能不能', '是否'], topicBoost: 0.2, agency: -0.15, deco: 0.08, label: '决策张力' },
  { words: ['跳槽', '换工作', '辞职', '转行'], topicBoost: 0.35, agency: 0.25, deco: 0.05, label: '路径跃迁' },
  { words: ['复合', '喜欢', '表白', '分手', '感情'], topicBoost: 0.3, agency: 0.1, deco: 0.12, label: '关系纠缠' },
  { words: ['考试', '学习', '考研', '论文'], topicBoost: 0.15, agency: 0.2, deco: 0.04, label: '认知势阱' },
  { words: ['钱', '投资', '理财', '收入'], topicBoost: 0.25, agency: 0.15, deco: 0.06, label: '资源流' },
  { words: ['焦虑', '害怕', '纠结', '迷茫', '压力'], topicBoost: 0.1, agency: -0.2, deco: 0.22, label: '情绪噪声' },
  { words: ['创作', '灵感', '作品', '项目'], topicBoost: 0.28, agency: 0.3, deco: 0.05, label: '创造激发' },
  { words: ['立刻', '马上', '今天', '现在'], topicBoost: 0.05, agency: 0.35, deco: 0.03, label: '即时行动' },
  { words: ['长期', '一年', '未来', '以后'], topicBoost: 0.08, agency: -0.05, deco: 0.02, label: '远期演化' },
]

export function extractQuestionFeatures(context: ContextInput, _birth?: BirthInput): QuestionFeatures {
  const q = context.question.toLowerCase()
  let topicAngle = TOPIC_ANGLES[context.questionType]
  let agencyAngle = 0
  let decoherence = EMOTION_DECOHERENCE[context.emotion]
  let entangleStrength = 0.15
  const keywords: string[] = []
  const topicLabels: string[] = []

  for (const row of TEXT_KEYWORDS) {
    if (row.words.some((w) => q.includes(w))) {
      topicAngle += row.topicBoost
      agencyAngle += row.agency
      decoherence += row.deco
      entangleStrength += 0.08
      keywords.push(...row.words.filter((w) => q.includes(w)))
      topicLabels.push(row.label)
    }
  }

  if (context.situationTags.length >= 2) entangleStrength += 0.12
  if (context.situationTags.includes('ambiguous')) entangleStrength += 0.1

  return {
    topicAngle: Math.min(Math.PI * 0.95, topicAngle),
    timePhase: TIME_PHASE[context.timeHorizon],
    emotionAngle: EMOTION_ANGLE[context.emotion],
    agencyAngle: Math.max(-0.6, Math.min(0.9, agencyAngle)),
    decoherence: Math.min(0.42, decoherence),
    entangleStrength: Math.min(0.55, entangleStrength),
    keywords: [...new Set(keywords)].slice(0, 6),
    topicLabel: topicLabels[0] ?? '命题场',
  }
}

export function birthPhaseParams(birth: BirthInput): {
  theta3: number
  phi0: number
  fiveLabel: string
  ganzhi: string
  nayin: string
} {
  const pillar = birth.birthDate ? getYearPillarNayin(birth.birthDate) : null
  const element = pillar?.element ?? 'earth'
  const elementPhase = ELEMENT_PHASE[element]
  const hash = hashString((birth.birthDate || '') + birth.lifeThemes.join(','))
  const theta3 = elementPhase + ((hash % 360) / 360) * Math.PI * 0.35
  const phi0 = ((hash >> 8) % 628) / 100 + elementPhase * 0.15
  return {
    theta3,
    phi0,
    fiveLabel: pillar?.elementLabel ?? ELEMENT_ZH[element],
    ganzhi: pillar?.ganzhi ?? '—',
    nayin: pillar?.nayin ?? '—',
  }
}

export function ritualBasisRotation(measurement: MeasurementInput): { phi0: number; phi1: number; phi2: number; label: string } {
  const map: Record<MeasurementInput['ritualType'], { p0: number; p1: number; p2: number; label: string }> = {
    doubleSlit: { p0: 0.4, p1: 0.2, p2: 0, label: '双缝：强化前两路径干涉' },
    manyWorlds: { p0: 0.1, p1: 0.1, p2: 0.1, label: '多世界：展平概率分布' },
    schrodinger: { p0: 0.55, p1: 0.35, p2: 0.15, label: '薛定谔：维持叠加' },
    entanglement: { p0: 0.2, p1: 0.9, p2: 0.3, label: '纠缠：耦合命题与关系轴' },
    tunneling: { p0: 0.7, p1: 0.5, p2: 0.6, label: '隧穿：提升低概率突破' },
    decoherence: { p0: 0.15, p1: 0.25, p2: 0.05, label: '退相干：放大噪声诊断' },
  }
  const sym = hashString(measurement.symbolChoice) % 628
  const r = map[measurement.ritualType]
  return {
    phi0: r.p0 + sym / 1000,
    phi1: r.p1,
    phi2: r.p2,
    label: r.label,
  }
}
