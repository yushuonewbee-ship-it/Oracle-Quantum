import {
  type BirthInput,
  type ContextInput,
  type MeasurementInput,
  type FateResult,
  type FateVector,
  type FateBranch,
  type QuestionType,
  type FateVectorKey,
  type ModelTrace,
  type ParameterContribution,
  type OperatorSnapshot,
} from '../types/fate'
import {
  createEmptyVector,
  clampVector,
  overlap,
  probability,
  FATE_VECTOR_KEYS,
} from './fateVector'
import {
  createSeededRandom,
  hashString,
  weightedSample,
} from './seededRandom'
import {
  calculateFiveElements,
  getStrongestElement,
  getWeakestElement,
  getElementMeaning,
  getBirthElementInfluence,
  getBirthTimeInfluence,
  getBirthPlaceInfluence,
  getLifeThemesInfluence,
  getSelfKeywordsInfluence,
} from './divinationMapping'
import { ELEMENT_ZH, getYearPillarNayin, type FiveElement } from './ganzhiNayin'

function birthDateLabel(birthDate: string): string {
  const pillar = getYearPillarNayin(birthDate)
  if (!pillar) return birthDate
  return `${birthDate} · 年柱${pillar.ganzhi} · 纳音${pillar.nayin}`
}
import type { OutcomeState } from './outcomeStates'
import { generateShortAdvice } from './branchAdvice'
import { runQuantumModel } from './quantum/runQuantumModel'
import type { QuantumModelTrace } from '../types/quantum'
// QuantumModelTrace used in buildQuantumExplanationFromTrace

const VECTOR_LABELS: Record<FateVectorKey, string> = {
  action: '行动动量',
  stability: '稳定势阱',
  emotionNoise: '情绪噪声',
  relationshipPull: '关系牵引',
  wealthFlow: '资源流动',
  riskBias: '风险偏置',
  intuition: '直觉相位',
  delay: '延迟惯性',
  transition: '跃迁倾向',
  clarity: '清晰度',
  constraint: '约束势垒',
  creativeCharge: '创造电荷',
}

// Emotion effects on vector
const EMOTION_EFFECTS: Record<string, Partial<FateVector>> = {
  calm: { clarity: 0.1, emotionNoise: -0.1 },
  hesitant: { delay: 0.1, action: -0.05, clarity: -0.05 },
  excited: { action: 0.12, riskBias: 0.08, clarity: -0.03 },
  anxious: { emotionNoise: 0.15, delay: 0.08, clarity: -0.06 },
  tired: { action: -0.1, constraint: 0.08, delay: 0.05 },
  angry: { action: 0.1, clarity: -0.1, riskBias: 0.1 },
  expectant: { intuition: 0.1, creativeCharge: 0.05, emotionNoise: 0.03 },
  numb: { intuition: -0.08, delay: 0.08, emotionNoise: -0.05 },
}

// Situation tag effects
const SITUATION_EFFECTS: Record<string, Partial<FateVector>> = {
  waiting: { delay: 0.08, clarity: 0.05 },
  competing: { action: 0.1, riskBias: 0.05, emotionNoise: 0.05 },
  transition: { transition: 0.12, stability: -0.05 },
  ambiguous: { intuition: 0.08, clarity: -0.06, emotionNoise: 0.05 },
  bottleneck: { constraint: 0.1, creativeCharge: 0.08, action: -0.03 },
  opportunity: { action: 0.1, wealthFlow: 0.05, riskBias: 0.05 },
  farewell: { emotionNoise: 0.08, relationshipPull: -0.05, transition: 0.08 },
  reunion: { relationshipPull: 0.1, intuition: 0.08, stability: 0.05 },
  jobChange: { transition: 0.12, action: 0.1, stability: -0.05 },
  start: { action: 0.12, creativeCharge: 0.08, riskBias: 0.06 },
}

// Time horizon effects
const TIME_HORIZON_EFFECTS: Record<string, Partial<FateVector>> = {
  today: { action: 0.05, delay: -0.05, clarity: 0.03 },
  '7days': { action: 0.03, transition: 0.03 },
  '30days': { stability: 0.03, creativeCharge: 0.03 },
  '3months': { transition: 0.05, intuition: 0.03 },
  '1year': { stability: 0.05, constraint: 0.03, clarity: 0.03 },
}

// Question type base context effects
const QUESTION_TYPE_EFFECTS: Record<QuestionType, Partial<FateVector>> = {
  career: { action: 0.05, clarity: 0.03, stability: 0.02 },
  relationship: { relationshipPull: 0.08, intuition: 0.04, emotionNoise: 0.03 },
  study: { clarity: 0.06, creativeCharge: 0.04, stability: 0.03 },
  wealth: { wealthFlow: 0.06, riskBias: 0.03, clarity: 0.03 },
  social: { relationshipPull: 0.06, action: 0.03, creativeCharge: 0.02 },
  creative: { creativeCharge: 0.1, intuition: 0.05, action: 0.03 },
  daily: { stability: 0.03, clarity: 0.02, action: 0.02 },
  majorChoice: { clarity: 0.05, riskBias: 0.04, transition: 0.03, constraint: 0.03 },
}

const RITUAL_EFFECTS: Record<MeasurementInput['ritualType'], {
  label: string
  description: string
  vector: Partial<FateVector>
  weighting: (branch: FateBranch, index: number, count: number) => number
}> = {
  doubleSlit: {
    label: '双缝命运法',
    description: '增强前两条高振幅路径之间的干涉对比，适合二选一困境。',
    vector: { clarity: 0.04, emotionNoise: 0.03, transition: 0.03 },
    weighting: (_branch, index) => (index < 2 ? 1.12 : 0.92),
  },
  manyWorlds: {
    label: '多世界分支法',
    description: '降低过早坍缩，让更多分支保留可见概率。',
    vector: { transition: 0.06, creativeCharge: 0.05, clarity: -0.03 },
    weighting: (_branch, _index, count) => 1 + (count > 4 ? 0.03 : 0),
  },
  schrodinger: {
    label: '薛定谔命题法',
    description: '保留问题的不确定性，在打开盒子前维持较强叠加。',
    vector: { intuition: 0.06, emotionNoise: 0.04, delay: 0.03 },
    weighting: (branch) => 0.94 + branch.amplitude * 0.12,
  },
  entanglement: {
    label: '纠缠合盘法',
    description: '把关系牵引视为测量基底的主轴。',
    vector: { relationshipPull: 0.08, intuition: 0.04 },
    weighting: (branch) => 0.95 + branch.vector.relationshipPull * 0.1,
  },
  tunneling: {
    label: '隧穿突破法',
    description: '提高跨越约束势垒的低概率突破路径。',
    vector: { action: 0.06, constraint: 0.04, riskBias: 0.03 },
    weighting: (branch) => 0.9 + branch.vector.constraint * 0.12 + branch.vector.action * 0.05,
  },
  decoherence: {
    label: '退相干诊断法',
    description: '放大噪声源，帮助识别导致概率分散的变量。',
    vector: { emotionNoise: 0.08, clarity: -0.04 },
    weighting: (branch) => 1 + Math.abs(branch.phase) * 0.03,
  },
}

const SYMBOL_EFFECTS: Record<string, { label: string; concept: string; vector: Partial<FateVector> }> = {
  moon: { label: '月', concept: '周期与变化', vector: { intuition: 0.05, transition: 0.04 } },
  gate: { label: '门', concept: '机遇与边界', vector: { transition: 0.05, constraint: 0.03 } },
  mirror: { label: '镜', concept: '反思与真相', vector: { clarity: 0.06, intuition: 0.02 } },
  fire: { label: '火', concept: '热情与毁灭', vector: { action: 0.06, riskBias: 0.04, emotionNoise: 0.02 } },
  ocean: { label: '海', concept: '深度与流动', vector: { wealthFlow: 0.05, emotionNoise: 0.03, delay: 0.02 } },
  star: { label: '星', concept: '指引与远方', vector: { clarity: 0.04, intuition: 0.04 } },
  eye: { label: '眼', concept: '洞察与觉醒', vector: { clarity: 0.06, constraint: -0.02 } },
  snake: { label: '蛇', concept: '蜕变与智慧', vector: { transition: 0.06, intuition: 0.03, riskBias: 0.02 } },
  clock: { label: '钟', concept: '时机与节奏', vector: { delay: 0.04, stability: 0.04, clarity: 0.02 } },
  flower: { label: '花', concept: '绽放与短暂', vector: { creativeCharge: 0.06, relationshipPull: 0.03 } },
}

const QUESTION_KEYWORDS: { words: string[]; vector: Partial<FateVector>; concept: string }[] = [
  { words: ['跳槽', '换工作', '辞职', '转行', 'offer'], vector: { transition: 0.07, action: 0.04, stability: -0.03 }, concept: '路径跃迁' },
  { words: ['复合', '喜欢', '表白', '分手', '关系', '伴侣'], vector: { relationshipPull: 0.07, emotionNoise: 0.04, intuition: 0.02 }, concept: '关系纠缠' },
  { words: ['考试', '论文', '学习', '考研', '申请'], vector: { clarity: 0.06, constraint: 0.03, creativeCharge: 0.02 }, concept: '认知势阱' },
  { words: ['钱', '投资', '理财', '收入', '副业'], vector: { wealthFlow: 0.07, riskBias: 0.03, clarity: 0.02 }, concept: '资源流' },
  { words: ['焦虑', '害怕', '纠结', '迷茫', '压力'], vector: { emotionNoise: 0.08, clarity: -0.04, delay: 0.03 }, concept: '退相干噪声' },
  { words: ['创作', '作品', '灵感', '项目', '写作'], vector: { creativeCharge: 0.07, intuition: 0.03, action: 0.02 }, concept: '创造激发' },
]

function applyPartial(base: FateVector, partial: Partial<FateVector>): FateVector {
  const result = { ...base }
  for (const [key, val] of Object.entries(partial)) {
    if (val !== undefined) {
      result[key as keyof FateVector] = Math.max(0, Math.min(1, result[key as keyof FateVector] + val))
    }
  }
  return result
}

function vectorDeltas(partial: Partial<FateVector>, vector?: FateVector) {
  return Object.entries(partial)
    .filter(([, val]) => val !== undefined && Math.abs(val) > 0.001)
    .map(([key, val]) => ({
      key: key as FateVectorKey,
      label: VECTOR_LABELS[key as FateVectorKey],
      delta: Number((val ?? 0).toFixed(3)),
      after: vector ? Number(vector[key as FateVectorKey].toFixed(3)) : undefined,
    }))
}

function makeContribution({
  id,
  source,
  inputLabel,
  divinationConcept,
  quantumRole,
  description,
  vector,
  after,
}: {
  id: string
  source: ParameterContribution['source']
  inputLabel: string
  divinationConcept: string
  quantumRole: string
  description: string
  vector: Partial<FateVector>
  after?: FateVector
}): ParameterContribution | null {
  const deltas = vectorDeltas(vector, after)
  if (deltas.length === 0) return null
  return { id, source, inputLabel, divinationConcept, quantumRole, description, deltas }
}

function compactContribution(contribution: ParameterContribution | null, target: ParameterContribution[]) {
  if (contribution) target.push(contribution)
}

function createDiagonalPreview(partial: Partial<FateVector>, size = 5): number[][] {
  const keys = FATE_VECTOR_KEYS.slice(0, size)
  return keys.map((rowKey, row) => keys.map((_, col) => {
    if (row !== col) return 0
    return Number((1 + (partial[rowKey] ?? 0)).toFixed(2))
  }))
}

function createOperatorSnapshot(id: string, label: string, formula: string, description: string, vector: Partial<FateVector>): OperatorSnapshot {
  return {
    id,
    label,
    formula,
    description,
    matrixPreview: createDiagonalPreview(vector),
    affectedKeys: Object.keys(vector) as FateVectorKey[],
  }
}

function getQuestionTextInfluence(question: string): { vector: Partial<FateVector>; matchedConcepts: string[] } {
  const vector: Partial<FateVector> = {}
  const matchedConcepts: string[] = []
  const normalized = question.toLowerCase()

  for (const entry of QUESTION_KEYWORDS) {
    if (!entry.words.some((word) => normalized.includes(word.toLowerCase()))) continue
    matchedConcepts.push(entry.concept)
    for (const [key, val] of Object.entries(entry.vector)) {
      vector[key as FateVectorKey] = (vector[key as FateVectorKey] || 0) + (val || 0)
    }
  }

  return { vector, matchedConcepts }
}

function applyMeasurementTransform(vector: FateVector, measurement: MeasurementInput): FateVector {
  const ritual = RITUAL_EFFECTS[measurement.ritualType]
  const symbol = SYMBOL_EFFECTS[measurement.symbolChoice]
  let result = { ...vector }
  if (ritual) result = applyPartial(result, ritual.vector)
  if (symbol) result = applyPartial(result, symbol.vector)
  return clampVector(result)
}

function buildTrace({
  birth,
  context,
  measurement,
  birthVector,
  contextVector,
  measurementVector,
  collapsed,
  branches,
  decoherence,
}: {
  birth: BirthInput
  context: ContextInput
  measurement: MeasurementInput
  birthVector: FateVector
  contextVector: FateVector
  measurementVector: FateVector
  collapsed: FateBranch
  branches: FateBranch[]
  decoherence: number
}): ModelTrace {
  const contributions: ParameterContribution[] = []
  const dateInfluence = getBirthElementInfluence(birth.birthDate)
  const timeInfluence = getBirthTimeInfluence(birth.birthTime)
  const placeInfluence = getBirthPlaceInfluence(birth.birthPlace)
  const themeInfluence = getLifeThemesInfluence(birth.lifeThemes)
  const keywordInfluence = getSelfKeywordsInfluence(birth.selfKeywords)
  const questionInfluence = getQuestionTextInfluence(context.question)
  const ritual = RITUAL_EFFECTS[measurement.ritualType]
  const symbol = SYMBOL_EFFECTS[measurement.symbolChoice]

  compactContribution(makeContribution({
    id: 'birth-date',
    source: 'birth',
    inputLabel: birth.birthDate ? birthDateLabel(birth.birthDate) : '未填写日期',
    divinationConcept: '年柱纳音',
    quantumRole: '初始化 |psi_birth>',
    description: '出生日期按立春换岁排年柱，纳音五行设定命运态的初始幅度分布。',
    vector: dateInfluence,
    after: birthVector,
  }), contributions)
  compactContribution(makeContribution({
    id: 'birth-time',
    source: 'birth',
    inputLabel: birth.birthTime || '未知时辰',
    divinationConcept: '时辰相位',
    quantumRole: '细调初始相位',
    description: '出生时间提供昼夜节律的相位修正，影响行动、直觉或延迟项。',
    vector: timeInfluence,
    after: birthVector,
  }), contributions)
  compactContribution(makeContribution({
    id: 'birth-place',
    source: 'birth',
    inputLabel: birth.birthPlace || '未知地点',
    divinationConcept: '空间扰动',
    quantumRole: '本地势场扰动',
    description: '出生地点通过稳定的本地哈希进入模型，作为空间环境的弱扰动。',
    vector: placeInfluence,
    after: birthVector,
  }), contributions)
  compactContribution(makeContribution({
    id: 'life-themes',
    source: 'birth',
    inputLabel: birth.lifeThemes.length ? birth.lifeThemes.join(', ') : '未选择主题',
    divinationConcept: '长期命题',
    quantumRole: '先验权重修正',
    description: '人生主题定义长期关注的方向，相当于给相关维度添加先验权重。',
    vector: themeInfluence,
    after: birthVector,
  }), contributions)
  compactContribution(makeContribution({
    id: 'self-keywords',
    source: 'birth',
    inputLabel: birth.selfKeywords.length ? birth.selfKeywords.join(', ') : '未选择关键词',
    divinationConcept: '自我画像',
    quantumRole: '观察者先验',
    description: '自我关键词让观察者自身成为模型的一部分，校正初始态。',
    vector: keywordInfluence,
    after: birthVector,
  }), contributions)
  compactContribution(makeContribution({
    id: 'question-type',
    source: 'context',
    inputLabel: context.questionType,
    divinationConcept: '问事宫位',
    quantumRole: '选择结果态空间',
    description: '问题类型决定本次要投影到哪一组可能结果态。',
    vector: QUESTION_TYPE_EFFECTS[context.questionType],
    after: contextVector,
  }), contributions)
  compactContribution(makeContribution({
    id: 'question-text',
    source: 'context',
    inputLabel: context.question || '未检测到关键词',
    divinationConcept: questionInfluence.matchedConcepts.join(' / ') || '自由命题',
    quantumRole: '文本扰动项',
    description: '自由文本通过本地关键词词典转成轻量扰动，使核心问题实际进入计算。',
    vector: questionInfluence.vector,
    after: contextVector,
  }), contributions)
  compactContribution(makeContribution({
    id: 'emotion',
    source: 'context',
    inputLabel: context.emotion,
    divinationConcept: '情绪气候',
    quantumRole: '退相干噪声',
    description: '情绪被建模为噪声与清晰度的变化，影响概率分布是否分散。',
    vector: EMOTION_EFFECTS[context.emotion],
    after: contextVector,
  }), contributions)
  compactContribution(makeContribution({
    id: 'situation-tags',
    source: 'context',
    inputLabel: context.situationTags.length ? context.situationTags.join(', ') : '无处境标签',
    divinationConcept: '当下局势',
    quantumRole: '情境哈密顿量',
    description: '处境标签对当前态施加外部条件，改变行动、约束和关系等分量。',
    vector: context.situationTags.reduce<Partial<FateVector>>((acc, tag) => {
      const effect = SITUATION_EFFECTS[tag]
      if (!effect) return acc
      for (const [key, val] of Object.entries(effect)) acc[key as FateVectorKey] = (acc[key as FateVectorKey] || 0) + (val || 0)
      return acc
    }, {}),
    after: contextVector,
  }), contributions)
  compactContribution(makeContribution({
    id: 'time-horizon',
    source: 'context',
    inputLabel: context.timeHorizon,
    divinationConcept: '应期尺度',
    quantumRole: '演化时间窗',
    description: '时间跨度改变演化窗口，短期强调行动，长期强调稳定和约束。',
    vector: TIME_HORIZON_EFFECTS[context.timeHorizon],
    after: contextVector,
  }), contributions)
  compactContribution(makeContribution({
    id: 'ritual',
    source: 'measurement',
    inputLabel: ritual?.label ?? measurement.ritualType,
    divinationConcept: '观测仪式',
    quantumRole: '测量算符 M',
    description: ritual?.description ?? '测量方式改变坍缩前的基底权重。',
    vector: ritual?.vector ?? {},
    after: measurementVector,
  }), contributions)
  compactContribution(makeContribution({
    id: 'symbol',
    source: 'measurement',
    inputLabel: symbol ? `${symbol.label} / ${symbol.concept}` : measurement.symbolChoice,
    divinationConcept: '观测符号',
    quantumRole: '测量基底偏置',
    description: '符号不再只是随机种子，而是作为测量基底的方向性偏置。',
    vector: symbol?.vector ?? {},
    after: measurementVector,
  }), contributions)

  const operatorSnapshots = [
    createOperatorSnapshot('time', '时间演化算符', 'U_{time}', '用月相近似和年周期调整直觉、清晰度、跃迁和噪声。', { intuition: 0.06, clarity: 0.06, transition: 0.04, emotionNoise: 0.04 }),
    createOperatorSnapshot('context', '上下文哈密顿量', 'U_{context}', '由问题类型、自由文本、情绪、处境和时空跨度共同形成。', {
      ...QUESTION_TYPE_EFFECTS[context.questionType],
      ...questionInfluence.vector,
      ...EMOTION_EFFECTS[context.emotion],
    }),
    createOperatorSnapshot('measurement', '测量算符', 'M_{ritual,symbol}', '仪式和符号共同决定最终投影前的测量基底。', {
      ...(ritual?.vector ?? {}),
      ...(symbol?.vector ?? {}),
    }),
  ]

  return {
    vectorLabels: VECTOR_LABELS,
    formulas: {
      stateEvolution: '\\lvert\\psi_{now}\\rangle = M_{ritual,symbol} U_{context} U_{time} \\lvert\\psi_{birth}\\rangle',
      bornRule: 'P_i = \\frac{\\lvert\\langle r_i \\mid \\psi_{now}\\rangle\\rvert^2}{\\sum_j \\lvert\\langle r_j \\mid \\psi_{now}\\rangle\\rvert^2}',
      decoherence: `D = 0.8\\,\\eta_{emotion} + 0.2\\,(1-C) = ${decoherence.toFixed(3)}`,
      measurement: `\\operatorname{collapse}(\\psi) \\sim M(${ritual?.label ?? measurement.ritualType}, ${symbol?.label ?? measurement.symbolChoice})`,
      normalization: `\\sum_i P_i = ${branches.reduce((sum, branch) => sum + branch.probability, 0).toFixed(3)}`,
    },
    inputContributions: contributions,
    stateSnapshots: [
      { id: 'birth', label: '出生先验态', formulaLabel: '|psi_birth>', vector: birthVector, note: '由出生信息、人生主题和自我关键词初始化。' },
      { id: 'context', label: '问题上下文态', formulaLabel: 'U_context |psi_birth>', vector: contextVector, note: '问题、情绪、处境与时间尺度共同演化。' },
      { id: 'measurement', label: '测量基底态', formulaLabel: 'M |psi_now>', vector: measurementVector, note: '仪式和符号将当前态投影到偏置后的测量基底。' },
      { id: 'collapse', label: '坍缩结果态', formulaLabel: '|r_k>', vector: collapsed.vector, note: `本次观测最终坍缩到「${collapsed.label}」。` },
    ],
    operatorSnapshots,
    strongestCandidate: {
      id: branches[0]?.id ?? collapsed.id,
      label: branches[0]?.label ?? collapsed.label,
      probability: branches[0]?.probability ?? collapsed.probability,
    },
    measurementSummary: `${ritual?.label ?? measurement.ritualType} 将 ${symbol?.label ?? measurement.symbolChoice} 作为测量基底偏置；最高候选为「${branches[0]?.label ?? collapsed.label}」，实际坍缩为「${collapsed.label}」。`,
    scienceNote: '这是量子启发式决策模型：命理概念承担结构化先验输入的角色，公式用于解释本应用内部概率机制，并不代表真实物理实验或未来预测。',
  }
}

export function previewBirthContributions(birth: BirthInput): ParameterContribution[] {
  const birthVector = createBirthVector(birth)
  const contributions: ParameterContribution[] = []
  compactContribution(makeContribution({
    id: 'birth-date-preview',
    source: 'birth',
    inputLabel: birth.birthDate ? birthDateLabel(birth.birthDate) : '选择出生日期后生成',
    divinationConcept: '年柱纳音',
    quantumRole: '初始化 |psi_birth>',
    description: '出生日期按立春换岁排年柱，纳音五行决定初始态中行动、直觉、清晰度等维度的基准。',
    vector: birth.birthDate ? getBirthElementInfluence(birth.birthDate) : {},
    after: birthVector,
  }), contributions)
  compactContribution(makeContribution({
    id: 'birth-time-preview',
    source: 'birth',
    inputLabel: birth.birthTime || '未知时辰',
    divinationConcept: '时辰相位',
    quantumRole: '细调初始相位',
    description: '出生时间会把昼夜节律转成行动、直觉或延迟的轻量修正。',
    vector: getBirthTimeInfluence(birth.birthTime),
    after: birthVector,
  }), contributions)
  compactContribution(makeContribution({
    id: 'birth-themes-preview',
    source: 'birth',
    inputLabel: birth.lifeThemes.length ? birth.lifeThemes.join(', ') : '选择人生主题后生成',
    divinationConcept: '长期命题',
    quantumRole: '先验权重修正',
    description: '人生主题会提升对应结果空间的长期权重。',
    vector: getLifeThemesInfluence(birth.lifeThemes),
    after: birthVector,
  }), contributions)
  compactContribution(makeContribution({
    id: 'birth-keywords-preview',
    source: 'birth',
    inputLabel: birth.selfKeywords.length ? birth.selfKeywords.join(', ') : '选择自我描述后生成',
    divinationConcept: '观察者画像',
    quantumRole: '观察者先验',
    description: '自我描述让观察者状态参与初始态构造。',
    vector: getSelfKeywordsInfluence(birth.selfKeywords),
    after: birthVector,
  }), contributions)
  return contributions
}

export function previewContextContributions(context: ContextInput): ParameterContribution[] {
  const base = createEmptyVector()
  const vector = evolveFateVector({ birthVector: base, context, now: new Date() })
  const questionInfluence = getQuestionTextInfluence(context.question)
  const situationVector = context.situationTags.reduce<Partial<FateVector>>((acc, tag) => {
    const effect = SITUATION_EFFECTS[tag]
    if (!effect) return acc
    for (const [key, val] of Object.entries(effect)) acc[key as FateVectorKey] = (acc[key as FateVectorKey] || 0) + (val || 0)
    return acc
  }, {})
  const contributions: ParameterContribution[] = []
  compactContribution(makeContribution({
    id: 'context-question-type-preview',
    source: 'context',
    inputLabel: context.questionType,
    divinationConcept: '问事宫位',
    quantumRole: '选择结果态空间',
    description: '问题类型决定本次观测要投影到哪一组结果态。',
    vector: QUESTION_TYPE_EFFECTS[context.questionType],
    after: vector,
  }), contributions)
  compactContribution(makeContribution({
    id: 'context-question-text-preview',
    source: 'context',
    inputLabel: context.question || '输入问题后进行关键词扰动',
    divinationConcept: questionInfluence.matchedConcepts.join(' / ') || '自由命题',
    quantumRole: '文本扰动项',
    description: '自由文本会被本地关键词词典转成向量扰动。',
    vector: questionInfluence.vector,
    after: vector,
  }), contributions)
  compactContribution(makeContribution({
    id: 'context-emotion-preview',
    source: 'context',
    inputLabel: context.emotion,
    divinationConcept: '情绪气候',
    quantumRole: '退相干噪声',
    description: '情绪主要调节噪声和清晰度，影响概率分布集中程度。',
    vector: EMOTION_EFFECTS[context.emotion],
    after: vector,
  }), contributions)
  compactContribution(makeContribution({
    id: 'context-situation-preview',
    source: 'context',
    inputLabel: context.situationTags.length ? context.situationTags.join(', ') : '选择处境标签后生成',
    divinationConcept: '当下局势',
    quantumRole: '情境哈密顿量',
    description: '处境标签给当前态施加外部约束或机会扰动。',
    vector: situationVector,
    after: vector,
  }), contributions)
  return contributions
}

export function previewMeasurementContributions(measurement: MeasurementInput): ParameterContribution[] {
  const base = createEmptyVector()
  const vector = applyMeasurementTransform(base, measurement)
  const ritual = RITUAL_EFFECTS[measurement.ritualType]
  const symbol = SYMBOL_EFFECTS[measurement.symbolChoice]
  const contributions: ParameterContribution[] = []
  compactContribution(makeContribution({
    id: 'measurement-ritual-preview',
    source: 'measurement',
    inputLabel: ritual?.label ?? measurement.ritualType,
    divinationConcept: '观测仪式',
    quantumRole: '测量算符 M',
    description: ritual?.description ?? '测量仪式会改变坍缩前的分支权重。',
    vector: ritual?.vector ?? {},
    after: vector,
  }), contributions)
  compactContribution(makeContribution({
    id: 'measurement-symbol-preview',
    source: 'measurement',
    inputLabel: symbol ? `${symbol.label} / ${symbol.concept}` : measurement.symbolChoice,
    divinationConcept: '观测符号',
    quantumRole: '测量基底偏置',
    description: '符号会偏置测量基底，使特定维度更容易参与坍缩。',
    vector: symbol?.vector ?? {},
    after: vector,
  }), contributions)
  return contributions
}

export function createBirthVector(birth: BirthInput): FateVector {
  const base = createEmptyVector()

  // Deterministic seed from birth info
  const birthSeedStr = [
    birth.birthDate,
    birth.birthTime ?? 'unknown-time',
    birth.birthPlace ?? 'unknown-place',
    birth.lifeThemes.join(','),
    birth.selfKeywords.join(','),
  ].join('|')
  const birthSeed = hashString(birthSeedStr)
  const random = createSeededRandom(birthSeed)

  // Apply element influence from birth date
  const dateInfluence = getBirthElementInfluence(birth.birthDate)
  let vector = applyPartial(base, dateInfluence)

  // Apply birth time influence
  const timeInfluence = getBirthTimeInfluence(birth.birthTime)
  vector = applyPartial(vector, timeInfluence)

  // Apply birth place influence
  const placeInfluence = getBirthPlaceInfluence(birth.birthPlace)
  vector = applyPartial(vector, placeInfluence)

  // Apply life themes
  const themesInfluence = getLifeThemesInfluence(birth.lifeThemes)
  vector = applyPartial(vector, themesInfluence)

  // Apply self keywords
  const keywordsInfluence = getSelfKeywordsInfluence(birth.selfKeywords)
  vector = applyPartial(vector, keywordsInfluence)

  // Add small random variation based on seed for personality uniqueness
  for (const k of FATE_VECTOR_KEYS) {
    vector[k] = Math.max(0, Math.min(1, vector[k] + (random() - 0.5) * 0.08))
  }

  return vector
}

export function evolveFateVector({
  birthVector,
  context,
  now,
}: {
  birthVector: FateVector
  context: ContextInput
  now: Date
}): FateVector {
  let vector = { ...birthVector }

  // Time evolution - periodic functions
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000)
  const lunarLikePhase = Math.sin((dayOfYear / 29.53) * Math.PI * 2)
  const yearlyPhase = Math.sin((dayOfYear / 365.25) * Math.PI * 2)

  // Lunar phase effects
  if (lunarLikePhase > 0) {
    vector.intuition = Math.min(1, vector.intuition + lunarLikePhase * 0.06)
  } else {
    vector.clarity = Math.min(1, vector.clarity + Math.abs(lunarLikePhase) * 0.06)
  }

  // Yearly phase effects
  vector.transition = Math.min(1, vector.transition + yearlyPhase * 0.04)

  // Critical point noise enhancement
  const criticality = Math.abs(lunarLikePhase) * Math.abs(yearlyLikePhase(yearlyPhase))
  if (criticality > 0.7) {
    vector.emotionNoise = Math.min(1, vector.emotionNoise + (criticality - 0.7) * 0.2)
  }

  // Question type context
  const questionEffect = QUESTION_TYPE_EFFECTS[context.questionType]
  if (questionEffect) {
    vector = applyPartial(vector, questionEffect)
  }

  // Free-form question text perturbation
  const questionTextEffect = getQuestionTextInfluence(context.question).vector
  if (Object.keys(questionTextEffect).length > 0) {
    vector = applyPartial(vector, questionTextEffect)
  }

  // Emotion perturbation
  const emotionEffect = EMOTION_EFFECTS[context.emotion]
  if (emotionEffect) {
    vector = applyPartial(vector, emotionEffect)
  }

  // Situation tags
  for (const tag of context.situationTags) {
    const tagEffect = SITUATION_EFFECTS[tag]
    if (tagEffect) {
      vector = applyPartial(vector, tagEffect)
    }
  }

  // Time horizon
  const horizonEffect = TIME_HORIZON_EFFECTS[context.timeHorizon]
  if (horizonEffect) {
    vector = applyPartial(vector, horizonEffect)
  }

  return clampVector(vector)
}

function yearlyLikePhase(phase: number): number {
  return phase
}

export function calculateBranches(
  currentVector: FateVector,
  outcomeStates: OutcomeState[],
  context: ContextInput
): FateBranch[] {
  // Calculate base probabilities
  const branches: FateBranch[] = outcomeStates.map((state) => {
    const prob = probability(currentVector, state.vector)
    const amp = overlap(currentVector, state.vector)
    return {
      id: state.id,
      label: state.label,
      labelEn: state.labelEn,
      probability: prob,
      amplitude: amp,
      phase: Math.atan2(state.vector.emotionNoise - 0.5, state.vector.clarity - 0.5),
      risk: state.vector.riskBias * 0.8 + state.vector.transition * 0.2,
      reward: state.vector.action * 0.4 + state.vector.creativeCharge * 0.3 + state.vector.wealthFlow * 0.3,
      cost: state.vector.delay * 0.5 + state.vector.constraint * 0.5,
      shortAdvice: generateShortAdvice(state.id, context.questionType),
      vector: state.vector,
    }
  })

  // Apply interference effects
  const emotionNoise = currentVector.emotionNoise
  const clarity = currentVector.clarity
  const decoherencePenalty = emotionNoise * 0.15
  const interferenceBoost = (1 - clarity) * 0.1

  // Adjust probabilities
  let totalProb = 0
  for (const b of branches) {
    b.probability = Math.max(0.02, b.probability - decoherencePenalty / branches.length + interferenceBoost * b.amplitude)
    totalProb += b.probability
  }

  // Normalize
  for (const b of branches) {
    b.probability = b.probability / totalProb
  }

  // Sort by probability descending
  branches.sort((a, b) => b.probability - a.probability)

  return branches
}

export function collapseBranch(
  branches: FateBranch[],
  measurement: MeasurementInput
): FateBranch {
  // Deterministic weighted random collapse
  const measurementSeedStr = [
    measurement.gestureSeed,
    measurement.symbolChoice,
    measurement.ritualType,
    Math.floor(measurement.observeTimestamp / 60000).toString(), // minute-level bucket
  ].join('|')
  const seed = hashString(measurementSeedStr)
  const random = createSeededRandom(seed)

  const weights = branches.map((b) => b.probability)
  return weightedSample(branches, weights, random)
}

export function buildFateResult({
  birthVector,
  contextVector,
  currentVector,
  branches,
  collapsed,
  input,
  quantumTrace,
}: {
  birthVector: FateVector
  contextVector: FateVector
  currentVector: FateVector
  branches: FateBranch[]
  collapsed: FateBranch
  input: {
    birth: BirthInput
    context: ContextInput
    measurement: MeasurementInput
  }
  quantumTrace: QuantumModelTrace
}): FateResult {
  const fiveElementProfile = calculateFiveElements(currentVector)
  const strongElement = getStrongestElement(fiveElementProfile)
  const weakElement = getWeakestElement(fiveElementProfile)

  const decoherence = currentVector.emotionNoise * 0.8 + (1 - currentVector.clarity) * 0.2
  const interference = branches.length > 1
    ? branches[0].amplitude * branches[1].amplitude * (1 - Math.abs(branches[0].phase - branches[1].phase) / Math.PI)
    : 0

  // Build quantum explanation
  const strongest = branches[0]
  const second = branches[1]
  let interferenceSentence = ''
  if (interference > 0.15) {
    interferenceSentence = `由于${strongest.label}与${second.label}之间存在明显相位冲突，系统在两者间产生了量子干涉效应，建议你关注不确定性较高的领域。`
  } else if (interference > 0.05) {
    interferenceSentence = `${strongest.label}与${second.label}之间存在一定的相位共振，你的内心可能存在两种声音的拉扯。`
  } else {
    interferenceSentence = '各分支之间的相位相对独立，当前命运态较为清晰。'
  }

  let decoherenceSentence = ''
  if (decoherence > 0.5) {
    decoherenceSentence = '情绪噪声较高，导致概率分布较为分散，建议你平复情绪后重新观测。'
  } else if (decoherence > 0.3) {
    decoherenceSentence = '当前存在一定的情绪扰动，对结果产生了轻微的退相干效应。'
  } else {
    decoherenceSentence = '当前命运态较为纯净，退相干效应微弱，结果可信度高。'
  }

  const collapseSentence = collapsed.id === strongest.id
    ? `本次测量坍缩到了同一个最强候选「${collapsed.label}」，说明测量基底与最高概率路径一致。`
    : `最高候选是「${strongest.label}」，但测量算符与符号偏置让本次实际坍缩到「${collapsed.label}」，这是概率测量而非最大值选择。`
  const quantumExplanation = `本次观测中，「${strongest.label}」结果态与当前命运波函数的重叠最高，振幅达到 ${(strongest.amplitude * 100).toFixed(1)}%。${collapseSentence}同时，「${second?.label || '无'}」分支仍保持可见强度，说明你的系统并未完全坍缩到单一路径。${interferenceSentence}${decoherenceSentence}`

  const pillar = input.birth.birthDate ? getYearPillarNayin(input.birth.birthDate) : null
  const elementZh = (el: string) => ELEMENT_ZH[el as FiveElement] ?? el
  const nayinLead = pillar
    ? `年柱${pillar.ganzhi}，纳音「${pillar.nayin}」属${pillar.elementLabel}，为本命五行基调。`
    : ''
  const divinationExplanation = `${nayinLead}结合当下问题场后，态向量中${elementZh(strongElement.element)}偏强，象征${getElementMeaning(strongElement.element)}；${elementZh(weakElement.element)}偏弱，象征${getElementMeaning(weakElement.element)}相对不足。此为纳音先验与当前输入叠加后的概率显现，而非单一年份标签的绝对预言。`

  // Build action advice
  const actionAdvice = generateActionAdvice(input.context.questionType, input.context.timeHorizon, collapsed.id)

  // Build oracle poem
  const oraclePoem = generateOraclePoem(collapsed.id, collapsed.probability)

  const trace = buildTrace({
    birth: input.birth,
    context: input.context,
    measurement: input.measurement,
    birthVector,
    contextVector,
    measurementVector: currentVector,
    collapsed,
    branches,
    decoherence,
  })

  return {
    mainBranch: collapsed,
    branches,
    quantumExplanation,
    divinationExplanation,
    actionAdvice,
    oraclePoem,
    trace,
    quantumTrace,
    debug: {
      birthVector,
      currentVector,
      fiveElementProfile,
      decoherence,
      interference,
      birthNayin: pillar
        ? {
            ganzhi: pillar.ganzhi,
            nayin: pillar.nayin,
            element: pillar.element,
            elementLabel: pillar.elementLabel,
            ganzhiYear: pillar.ganzhiYear,
          }
        : null,
    },
  }
}

function generateActionAdvice(questionType: QuestionType, timeHorizon: string, outcomeId: string): string {
  const horizonMap: Record<string, string> = {
    today: '今天',
    '7days': '未来7天',
    '30days': '未来30天',
    '3months': '未来3个月',
    '1year': '未来1年',
  }
  const horizon = horizonMap[timeHorizon] || '近期'

  const adviceMap: Record<QuestionType, string> = {
    career: `${horizon}内，尝试与一位业内人士交流、更新你的简历、或者完成一个小的技能提升。不要立刻做不可逆决定，先让市场给你反馈。`,
    relationship: `${horizon}内，主动发起一次轻松的对话，表达你的感受但不过度施压。观察对方的反应，给彼此留出呼吸空间。`,
    study: `${horizon}内，把学习目标拆解为可执行的小任务，每天推进一点点。遇到瓶颈时，主动向老师或同学请教。`,
    wealth: `${horizon}内，审视你的支出结构，设定一个明确的储蓄或投资目标。避免冲动消费和高风险投资。`,
    social: `${horizon}内，选择1-2个核心关系投入精力，不必强求融入所有圈子。真诚的连接胜过广泛的社交。`,
    creative: `${horizon}内，完成一个最小可行版本的作品并展示出来，而不是等待完美。灵感往往在行动中涌现。`,
    daily: `${horizon}内，保持规律的作息，专注于当下最重要的一件事。小小的确定性可以带来大大的安心。`,
    majorChoice: `${horizon}内，列出每个选项的利弊清单，与信任的人讨论。给自己设定一个决策截止日期，避免无限拖延。`,
  }

  const branchAdvice = generateShortAdvice(outcomeId, questionType)
  const baseAdvice = adviceMap[questionType] || `${horizon}内，采取一个低成本的小行动来验证方向，不要急于做出重大决定。`
  return `${baseAdvice} 因为本次坍缩分支指向「${branchAdvice}」，建议把它作为第一步验证动作。`
}

function generateOraclePoem(_outcomeId: string, probability: number): string {
  const poems: Record<string, string[]> = {
    default: [
      '波没有拒绝你，\n它只是要求你晚一点观测。\n当门还没有打开，\n先让手靠近门把。',
      '概率在呼吸，\n命运在叠加。\n你选择的方向，\n正在被光雕刻。',
      '不是尘埃落定，\n而是波函数正在坍缩。\n你的观测，\n就是答案的一部分。',
    ],
  }

  const poemPool = poems[_outcomeId] || poems.default
  const index = Math.floor(probability * poemPool.length) % poemPool.length
  return poemPool[index]
}

// Main engine entry point
export function runQuantumFateEngine(input: {
  birth: BirthInput
  context: ContextInput
  measurement: MeasurementInput
  now?: Date
}): FateResult {
  const birthVector = createBirthVector(input.birth)
  const contextVector = evolveFateVector({
    birthVector,
    context: input.context,
    now: input.now ?? new Date(),
  })
  const currentVector = applyMeasurementTransform(contextVector, input.measurement)

  const { branches, collapsed, quantumTrace } = runQuantumModel({
    birth: input.birth,
    context: input.context,
    measurement: input.measurement,
  })

  const result = buildFateResult({
    birthVector,
    contextVector,
    currentVector,
    branches,
    collapsed,
    input,
    quantumTrace,
  })

  return {
    ...result,
    quantumExplanation: buildQuantumExplanationFromTrace(quantumTrace, collapsed, branches),
  }
}

function buildQuantumExplanationFromTrace(
  trace: QuantumModelTrace,
  collapsed: FateBranch,
  branches: FateBranch[],
): string {
  const top = branches[0]
  const second = branches[1]
  const measureStep = trace.steps.find((s) => s.id === 'measure')
  const mapping = trace.semanticMappings.find((m) => m.source === 'question_text')
  return [
    `4-qubit 寄存器经 ${trace.steps.length} 步演化后，Born 规则给出分支概率。`,
    mapping ? `你的提问「${mapping.input}」被编码为 ${mapping.gates.join('、')}。` : '',
    `最高概率分支为「${top?.label}」（${((top?.probability ?? 0) * 100).toFixed(1)}%），`,
    second ? `次高为「${second.label}」（${(second.probability * 100).toFixed(1)}%）。` : '',
    `本次测量坍缩到「${collapsed.label}」。`,
    measureStep?.note ? `测量前 Top 概率：${measureStep.note}。` : '',
    trace.scienceNote,
  ]
    .filter(Boolean)
    .join('')
}
