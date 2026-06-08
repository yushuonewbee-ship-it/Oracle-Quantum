import type { BirthInput, ContextInput, MeasurementInput, FateBranch } from '../../types/fate'
import type { GateOp, HamiltonianTerm, QuantumModelTrace, QuantumStep, SemanticMapping } from '../../types/quantum'
import {
  createZeroState,
  normalize,
  basisProbabilities,
  blochFromState,
  indexToBitstring,
  gateH,
  gateRy,
  gateRz,
  gateRx,
  applyCNOT,
  applyAmplitudeDamping,
  N_QUBITS,
  type StateVector,
} from './quantumMath'
import { extractQuestionFeatures, birthPhaseParams, ritualBasisRotation } from './inputEncoding'
import { getBranchBasisIndices, getOutcomeList } from './branchBasis'
import { hashString, createSeededRandom, weightedSample } from '../seededRandom'
import type { OutcomeState } from '../outcomeStates'
import { generateShortAdvice } from '../branchAdvice'

const QUBIT_LABELS: QuantumModelTrace['qubitLabels'] = [
  'q₀ 命题域',
  'q₁ 时间窗',
  'q₂ 情绪/行动',
  'q₃ 命理先验',
]

function makeStep(
  id: QuantumStep['id'],
  label: string,
  formula: string,
  gates: GateOp[],
  state: StateVector,
  note: string,
): QuantumStep {
  return {
    id,
    label,
    formula,
    gates,
    basisProbabilities: basisProbabilities(state),
    bloch: [0, 1, 2, 3].map((q) => ({
      qubit: q,
      label: QUBIT_LABELS[q],
      ...blochFromState(state, q),
    })),
    note,
  }
}

function branchProbabilityFromState(state: StateVector, branchIndex: number): number {
  let p = 0
  for (let q3 = 0; q3 < 2; q3++) {
    const idx = branchIndex | (q3 << 3)
    const a = state[idx]
    p += a.re * a.re + a.im * a.im
  }
  return p
}

function buildBranchesFromQuantum(
  state: StateVector,
  outcomes: OutcomeState[],
  basisMap: Record<string, number>,
  context: ContextInput,
): FateBranch[] {
  const raw = outcomes.map((o) => {
    const idx = basisMap[o.id] ?? 0
    const prob = branchProbabilityFromState(state, idx)
    const amp = Math.sqrt(Math.max(0, prob))
    return {
      outcome: o,
      idx,
      probability: prob,
      amplitude: amp,
      phase: Math.atan2(state[idx]?.im ?? 0, state[idx]?.re ?? 1),
    }
  })

  let total = raw.reduce((s, r) => s + r.probability, 0)
  if (total < 1e-9) total = 1

  const sorted = [...raw].sort((a, b) => b.probability - a.probability)
  const branches: FateBranch[] = sorted.map((r) => ({
      id: r.outcome.id,
      label: r.outcome.label,
      labelEn: r.outcome.labelEn,
      probability: r.probability / total,
      amplitude: r.amplitude,
      phase: r.phase,
      risk: r.outcome.vector.riskBias * 0.8 + r.outcome.vector.transition * 0.2,
      reward: r.outcome.vector.action * 0.4 + r.outcome.vector.creativeCharge * 0.3 + r.outcome.vector.wealthFlow * 0.3,
      cost: r.outcome.vector.delay * 0.5 + r.outcome.vector.constraint * 0.5,
      shortAdvice: generateShortAdvice(r.outcome.id, context.questionType),
      vector: r.outcome.vector,
  }))
  branches.sort((a, b) => b.probability - a.probability)
  return branches
}

export type QuantumModelResult = {
  quantumTrace: QuantumModelTrace
  branches: FateBranch[]
  collapsed: FateBranch
  finalState: StateVector
}

export function runQuantumModel(input: {
  birth: BirthInput
  context: ContextInput
  measurement: MeasurementInput
}): QuantumModelResult {
  const { birth, context, measurement } = input
  const features = extractQuestionFeatures(context, birth)
  const birthParams = birthPhaseParams(birth)
  const ritual = ritualBasisRotation(measurement)
  const outcomes = getOutcomeList(context.questionType)
  const basisMap = getBranchBasisIndices(context.questionType)

  const gates: GateOp[] = []
  const hamiltonianTerms: HamiltonianTerm[] = []
  const semanticMappings: SemanticMapping[] = []
  const circuitLines: string[] = []
  const steps: QuantumStep[] = []

  let state = createZeroState()

  // —— 出生制备 ——
  state = gateH(state, 0)
  gates.push({ id: 'h0', symbol: 'H', label: 'Hadamard q₀', qubits: [0], semanticSource: '系统叠加' })
  state = gateRz(state, 3, birthParams.theta3)
  gates.push({ id: 'rz3', symbol: 'Rz', label: `Rz(q₃, ${birthParams.theta3.toFixed(2)})`, qubits: [3], params: { phi: birthParams.theta3 }, semanticSource: '出生日期' })
  hamiltonianTerms.push({
    id: 'h_birth_phase',
    label: '出生相位势场',
    source: 'birth',
    qubits: [3],
    coefficient: birthParams.theta3,
    operator: 'Z',
    description: '出生日期与季节相位写入命理先验 qubit 的 Z 轴势场。',
  })
  state = gateRy(state, 3, birthParams.phi0)
  gates.push({ id: 'ry3', symbol: 'Ry', label: `Ry(q₃, ${birthParams.phi0.toFixed(2)})`, qubits: [3], params: { theta: birthParams.phi0 }, semanticSource: '年柱纳音' })
  state = normalize(state)
  circuitLines.push('|0⟩ — H — Rz₃ — Ry₃  →  |ψ_birth⟩')
  semanticMappings.push({
    source: 'birth',
    input: `${birth.birthDate} · 年柱${birthParams.ganzhi} · 纳音${birthParams.nayin}`,
    gates: ['H(q₀)', `Rz(q₃)`, `Ry(q₃)`],
    description: '出生年柱纳音制备命理先验 qubit，并在命题域打开叠加。',
  })
  steps.push(makeStep('birth', '先验制备', '|ψ_birth⟩ = Ry₃ Rz₃ H |0⟩', [...gates], state, `年柱${birthParams.ganzhi}，纳音${birthParams.nayin}（${birthParams.fiveLabel}）写入 q₃。`))

  // —— 提问编码 ——
  state = gateRy(state, 0, features.topicAngle)
  gates.push({ id: 'ry0t', symbol: 'Ry', label: 'Ry(q₀, topic)', qubits: [0], params: { theta: features.topicAngle }, semanticSource: context.question })
  hamiltonianTerms.push({
    id: 'h_question_topic',
    label: '命题域旋转势',
    source: 'question_text',
    qubits: [0],
    coefficient: features.topicAngle,
    operator: 'Y',
    description: '问题域与关键词决定命题 qubit 绕 Y 轴旋转的角度。',
  })
  state = gateRz(state, 1, features.timePhase)
  gates.push({ id: 'rz1', symbol: 'Rz', label: 'Rz(q₁, time)', qubits: [1], params: { phi: features.timePhase }, semanticSource: context.timeHorizon })
  state = gateRy(state, 2, features.emotionAngle)
  gates.push({ id: 'ry2e', symbol: 'Ry', label: 'Ry(q₂, emotion)', qubits: [2], params: { theta: features.emotionAngle }, semanticSource: context.emotion })
  hamiltonianTerms.push({
    id: 'h_emotion_drive',
    label: '情绪驱动项',
    source: 'context',
    qubits: [2],
    coefficient: features.emotionAngle,
    operator: 'Y',
    description: '当前情绪改变情绪/行动 qubit 的旋转幅度。',
  })
  state = gateRx(state, 2, Math.PI * 0.25 * features.agencyAngle)
  gates.push({ id: 'rx2a', symbol: 'Rx', label: 'Rx(q₂, agency)', qubits: [2], params: { theta: features.agencyAngle }, semanticSource: context.question })
  if (features.entangleStrength > 0.2) {
    state = applyCNOT(state, 0, 2)
    gates.push({ id: 'cx02', symbol: 'CX', label: 'CNOT q₀→q₂', qubits: [0, 2], semanticSource: '多标签/关系纠缠' })
    hamiltonianTerms.push({
      id: 'h_topic_emotion_coupling',
      label: '命题-情绪耦合项',
      source: 'question_text',
      qubits: [0, 2],
      coefficient: features.entangleStrength,
      operator: 'ZZ',
      description: '当问题同时包含决策、关系或多标签张力时，命题域与情绪行动轴发生纠缠。',
    })
  }
  state = normalize(state)
  circuitLines.push('|ψ_birth⟩ — Ry₀ — Rz₁ — Ry₂ — Rx₂ — [CX]  →  |ψ_question⟩')
  semanticMappings.push({
    source: 'question_text',
    input: context.question.slice(0, 48) + (context.question.length > 48 ? '…' : ''),
    gates: ['Ry(q₀)', 'Rz(q₁)', 'Ry(q₂)', 'Rx(q₂)', features.entangleStrength > 0.2 ? 'CX(q₀,q₂)' : ''].filter(Boolean),
    description: `文本特征「${features.topicLabel}」映射为旋转角；关键词：${features.keywords.join('、') || '无'}`,
  })
  steps.push(makeStep('question', '提问扰动', 'U_question |ψ_birth⟩', gates.slice(-5), state, `命题域 ${context.questionType}，时间窗 ${context.timeHorizon}。`))

  // —— 情境/退相干 ——
  state = applyAmplitudeDamping(state, 2, features.decoherence)
  gates.push({ id: 'damp2', symbol: 'D', label: 'AmpDamp q₂', qubits: [2], params: { gamma: features.decoherence }, semanticSource: context.emotion })
  hamiltonianTerms.push({
    id: 'noise_emotion_damping',
    label: '情绪退相干通道',
    source: 'context',
    qubits: [2],
    coefficient: features.decoherence,
    operator: 'damping',
    description: '情绪噪声通过振幅阻尼通道降低行动 qubit 的相干性。',
  })
  state = normalize(state)
  circuitLines.push('|ψ_question⟩ — D₂(γ)  →  |ψ_context⟩')
  semanticMappings.push({
    source: 'context',
    input: `情绪 ${context.emotion} · 标签 ${context.situationTags.join(',') || '无'}`,
    gates: [`D(q₂, γ=${features.decoherence.toFixed(2)})`],
    description: '情绪与处境标签通过退相干通道写入 q₂。',
  })
  steps.push(makeStep('context', '情境演化', '|ψ_context⟩ = D₂ U_context |ψ_question⟩', [gates[gates.length - 1]], state, `退相干强度 γ=${features.decoherence.toFixed(2)}`))

  // —— 仪式测量基底 ——
  state = gateRz(state, 0, ritual.phi0)
  state = gateRz(state, 1, ritual.phi1)
  state = gateRz(state, 2, ritual.phi2)
  hamiltonianTerms.push({
    id: 'h_measurement_basis',
    label: '仪式测量基底偏转',
    source: 'measurement',
    qubits: [0, 1, 2],
    coefficient: ritual.phi0 + ritual.phi1 + ritual.phi2,
    operator: 'Z',
    description: '仪式与符号不直接改写结果，而是旋转最终测量基底。',
  })
  gates.push(
    { id: 'rz0m', symbol: 'Rz', label: 'Rz ritual q₀', qubits: [0], params: { phi: ritual.phi0 }, semanticSource: measurement.ritualType },
    { id: 'rz1m', symbol: 'Rz', label: 'Rz ritual q₁', qubits: [1], params: { phi: ritual.phi1 }, semanticSource: measurement.symbolChoice },
    { id: 'rz2m', symbol: 'Rz', label: 'Rz ritual q₂', qubits: [2], params: { phi: ritual.phi2 }, semanticSource: measurement.ritualType },
  )
  state = normalize(state)
  circuitLines.push('|ψ_context⟩ — Rz₀ — Rz₁ — Rz₂  →  测量基底旋转')
  semanticMappings.push({
    source: 'measurement',
    input: `${measurement.ritualType} · 符号 ${measurement.symbolChoice}`,
    gates: ['Rz(q₀)', 'Rz(q₁)', 'Rz(q₂)'],
    description: ritual.label,
  })
  steps.push(makeStep('ritual', '测量基底', 'M_ritual |ψ_context⟩', gates.slice(-3), state, ritual.label))

  // —— Born 概率 ——
  const branchProbs = outcomes.map((o) => {
    const idx = basisMap[o.id] ?? 0
    const p = branchProbabilityFromState(state, idx)
    return {
      branchId: o.id,
      label: o.label,
      labelEn: o.labelEn,
      index: idx,
      bitstring: indexToBitstring(idx, N_QUBITS),
      probability: p,
      amplitude: Math.sqrt(Math.max(0, p)),
    }
  })
  const probSum = branchProbs.reduce((s, b) => s + b.probability, 0) || 1
  for (const b of branchProbs) b.probability /= probSum

  steps.push(
    makeStep(
      'measure',
      'Born 规则',
      'P(i) = |⟨i|ψ⟩|²',
      [],
      state,
      branchProbs
        .slice()
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 3)
        .map((b) => `${b.label} ${(b.probability * 100).toFixed(1)}%`)
        .join(' · '),
    ),
  )

  const branches = buildBranchesFromQuantum(state, outcomes, basisMap, context)

  const seedStr = [
    measurement.gestureSeed,
    measurement.symbolChoice,
    measurement.ritualType,
    Math.floor(measurement.observeTimestamp / 60000).toString(),
  ].join('|')
  const random = createSeededRandom(hashString(seedStr))
  const collapsed = weightedSample(branches, branches.map((b) => b.probability), random)

  const quantumTrace: QuantumModelTrace = {
    nQubits: N_QUBITS,
    qubitLabels: QUBIT_LABELS,
    steps,
    hamiltonianTerms,
    semanticMappings,
    branchProbabilities: branchProbs.sort((a, b) => b.probability - a.probability),
    measurement: {
      basisLabel: ritual.label,
      measuredBranchId: collapsed.id,
      measuredLabel: collapsed.label,
      randomSeed: seedStr,
      bornRule: 'P(branch_i)=|⟨branch_i|ψ_final⟩|²',
    },
    circuitLines,
    scienceNote:
      '本系统使用 4-qubit 复数态矢量与标准量子门（H、Rx/Ry/Rz、CNOT、振幅阻尼）进行演化；命理语义通过门参数编码，分支概率由 Born 规则给出。这是量子启发式命理模型，不是对真实物理系统的模拟。',
  }

  return { quantumTrace, branches, collapsed, finalState: state }
}
