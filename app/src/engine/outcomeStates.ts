import { type FateVector, type QuestionType } from '../types/fate'
import { createEmptyVector } from './fateVector'

export type OutcomeState = {
  id: string
  label: string
  labelEn: string
  vector: FateVector
}

function createOutcomeVector(modifications: Partial<FateVector>): FateVector {
  const base = createEmptyVector()
  for (const [key, value] of Object.entries(modifications)) {
    base[key as keyof FateVector] = value
  }
  return base
}

const CAREER_OUTCOMES: OutcomeState[] = [
  {
    id: 'stay', label: '维持现状', labelEn: 'Maintain Status Quo',
    vector: createOutcomeVector({ stability: 0.9, action: 0.2, transition: 0.1, riskBias: 0.2, constraint: 0.8 }),
  },
  {
    id: 'move', label: '主动转向', labelEn: 'Active Pivot',
    vector: createOutcomeVector({ action: 0.9, transition: 0.9, stability: 0.2, riskBias: 0.7, delay: 0.1 }),
  },
  {
    id: 'wait', label: '等待窗口', labelEn: 'Wait for Window',
    vector: createOutcomeVector({ delay: 0.9, clarity: 0.8, action: 0.3, emotionNoise: 0.2, stability: 0.7 }),
  },
  {
    id: 'sidePath', label: '副线试探', labelEn: 'Side Path Probe',
    vector: createOutcomeVector({ creativeCharge: 0.8, action: 0.7, riskBias: 0.4, delay: 0.3, stability: 0.4 }),
  },
]

const RELATIONSHIP_OUTCOMES: OutcomeState[] = [
  {
    id: 'approach', label: '主动靠近', labelEn: 'Active Approach',
    vector: createOutcomeVector({ action: 0.9, relationshipPull: 0.9, riskBias: 0.6, emotionNoise: 0.5, delay: 0.1 }),
  },
  {
    id: 'observe', label: '继续观察', labelEn: 'Continue Observation',
    vector: createOutcomeVector({ clarity: 0.9, delay: 0.8, emotionNoise: 0.2, action: 0.2, stability: 0.7 }),
  },
  {
    id: 'release', label: '松手脱钩', labelEn: 'Let Go',
    vector: createOutcomeVector({ relationshipPull: 0.1, clarity: 0.8, stability: 0.6, emotionNoise: 0.3, constraint: 0.7 }),
  },
  {
    id: 'repair', label: '沟通修复', labelEn: 'Communication Repair',
    vector: createOutcomeVector({ relationshipPull: 0.8, action: 0.7, clarity: 0.7, creativeCharge: 0.5, emotionNoise: 0.4 }),
  },
]

const STUDY_OUTCOMES: OutcomeState[] = [
  {
    id: 'deepDive', label: '深度钻研', labelEn: 'Deep Dive',
    vector: createOutcomeVector({ clarity: 0.9, creativeCharge: 0.7, action: 0.6, stability: 0.8, delay: 0.3 }),
  },
  {
    id: 'broaden', label: '拓展视野', labelEn: 'Broaden Horizons',
    vector: createOutcomeVector({ creativeCharge: 0.9, transition: 0.7, intuition: 0.8, stability: 0.3 }),
  },
  {
    id: 'rest', label: '暂停休整', labelEn: 'Pause and Rest',
    vector: createOutcomeVector({ stability: 0.8, delay: 0.9, emotionNoise: 0.3, action: 0.1 }),
  },
  {
    id: 'seekHelp', label: '求助请教', labelEn: 'Seek Guidance',
    vector: createOutcomeVector({ relationshipPull: 0.8, clarity: 0.6, action: 0.5, constraint: 0.4 }),
  },
]

const WEALTH_OUTCOMES: OutcomeState[] = [
  {
    id: 'conserve', label: '保守储蓄', labelEn: 'Conservative Saving',
    vector: createOutcomeVector({ stability: 0.9, riskBias: 0.1, constraint: 0.9, action: 0.2, wealthFlow: 0.3 }),
  },
  {
    id: 'invest', label: '积极投资', labelEn: 'Active Investment',
    vector: createOutcomeVector({ riskBias: 0.9, action: 0.9, wealthFlow: 0.8, stability: 0.2, transition: 0.7 }),
  },
  {
    id: 'diversify', label: '分散配置', labelEn: 'Diversify Allocation',
    vector: createOutcomeVector({ riskBias: 0.5, clarity: 0.8, stability: 0.6, creativeCharge: 0.5 }),
  },
  {
    id: 'hold', label: '观望不动', labelEn: 'Wait and See',
    vector: createOutcomeVector({ delay: 0.9, clarity: 0.7, stability: 0.8, action: 0.1 }),
  },
]

const SOCIAL_OUTCOMES: OutcomeState[] = [
  {
    id: 'engage', label: '积极参与', labelEn: 'Active Engagement',
    vector: createOutcomeVector({ action: 0.9, relationshipPull: 0.9, creativeCharge: 0.6, emotionNoise: 0.5 }),
  },
  {
    id: 'stepBack', label: '适度抽离', labelEn: 'Step Back',
    vector: createOutcomeVector({ clarity: 0.8, relationshipPull: 0.3, stability: 0.7, emotionNoise: 0.2 }),
  },
  {
    id: 'rebuild', label: '重建连接', labelEn: 'Rebuild Connections',
    vector: createOutcomeVector({ relationshipPull: 0.9, action: 0.7, intuition: 0.8, creativeCharge: 0.5 }),
  },
  {
    id: 'observe', label: '静观其变', labelEn: 'Watch and Wait',
    vector: createOutcomeVector({ clarity: 0.9, delay: 0.8, stability: 0.7, action: 0.2 }),
  },
]

const CREATIVE_OUTCOMES: OutcomeState[] = [
  {
    id: 'execute', label: '全力创作', labelEn: 'Full Creation',
    vector: createOutcomeVector({ creativeCharge: 0.95, action: 0.9, riskBias: 0.6, emotionNoise: 0.6 }),
  },
  {
    id: 'iterate', label: '小步迭代', labelEn: 'Small Iterations',
    vector: createOutcomeVector({ creativeCharge: 0.7, action: 0.7, clarity: 0.7, stability: 0.5 }),
  },
  {
    id: 'absorb', label: '吸收养分', labelEn: 'Absorb Inspiration',
    vector: createOutcomeVector({ intuition: 0.9, creativeCharge: 0.6, delay: 0.7, relationshipPull: 0.6 }),
  },
  {
    id: 'complete', label: '完成交付', labelEn: 'Complete and Deliver',
    vector: createOutcomeVector({ action: 0.9, clarity: 0.8, constraint: 0.7, creativeCharge: 0.5 }),
  },
]

const DAILY_OUTCOMES: OutcomeState[] = [
  {
    id: 'flow', label: '顺势而为', labelEn: 'Go with Flow',
    vector: createOutcomeVector({ intuition: 0.8, action: 0.6, stability: 0.5, creativeCharge: 0.6 }),
  },
  {
    id: 'focus', label: '专注一事', labelEn: 'Single Focus',
    vector: createOutcomeVector({ clarity: 0.9, stability: 0.8, creativeCharge: 0.2, action: 0.7 }),
  },
  {
    id: 'rest', label: '休养生息', labelEn: 'Rest and Recover',
    vector: createOutcomeVector({ stability: 0.9, delay: 0.9, action: 0.1, emotionNoise: 0.2 }),
  },
  {
    id: 'explore', label: '探索新境', labelEn: 'Explore New',
    vector: createOutcomeVector({ transition: 0.9, creativeCharge: 0.8, action: 0.7, stability: 0.2 }),
  },
]

const MAJOR_CHOICE_OUTCOMES: OutcomeState[] = [
  {
    id: 'commit', label: '确认推进', labelEn: 'Commit and Proceed',
    vector: createOutcomeVector({ action: 0.9, clarity: 0.8, riskBias: 0.6, stability: 0.5 }),
  },
  {
    id: 'delay', label: '延迟决策', labelEn: 'Delay Decision',
    vector: createOutcomeVector({ delay: 0.95, clarity: 0.7, stability: 0.8, action: 0.1 }),
  },
  {
    id: 'splitTest', label: '小规模试探', labelEn: 'Small Scale Test',
    vector: createOutcomeVector({ creativeCharge: 0.8, riskBias: 0.4, action: 0.7, clarity: 0.6 }),
  },
  {
    id: 'exit', label: '退出当前路径', labelEn: 'Exit Current Path',
    vector: createOutcomeVector({ transition: 0.9, relationshipPull: 0.2, stability: 0.3, clarity: 0.8 }),
  },
  {
    id: 'unexpected', label: '接受突变', labelEn: 'Embrace the Unexpected',
    vector: createOutcomeVector({ creativeCharge: 0.9, intuition: 0.9, riskBias: 0.8, stability: 0.1 }),
  },
]

const OUTCOME_MAP: Record<QuestionType, OutcomeState[]> = {
  career: CAREER_OUTCOMES,
  relationship: RELATIONSHIP_OUTCOMES,
  study: STUDY_OUTCOMES,
  wealth: WEALTH_OUTCOMES,
  social: SOCIAL_OUTCOMES,
  creative: CREATIVE_OUTCOMES,
  daily: DAILY_OUTCOMES,
  majorChoice: MAJOR_CHOICE_OUTCOMES,
}

export function createOutcomeStates(questionType: QuestionType): OutcomeState[] {
  return OUTCOME_MAP[questionType] || DAILY_OUTCOMES
}
