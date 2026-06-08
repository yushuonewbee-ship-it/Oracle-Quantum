/** 4-qubit 量子命理模型 trace 类型 */

export type ComplexAmplitude = { re: number; im: number }

export type GateOp = {
  id: string
  symbol: string
  label: string
  qubits: number[]
  params?: Record<string, number>
  semanticSource?: string
}

export type HamiltonianTerm = {
  id: string
  label: string
  source: 'birth' | 'question_text' | 'context' | 'measurement'
  qubits: number[]
  coefficient: number
  operator: 'X' | 'Y' | 'Z' | 'ZZ' | 'damping'
  description: string
}

export type SemanticMapping = {
  source: 'birth' | 'context' | 'measurement' | 'question_text'
  input: string
  gates: string[]
  description: string
}

export type QubitBloch = {
  qubit: number
  label: string
  x: number
  y: number
  z: number
}

export type QuantumStep = {
  id: 'birth' | 'question' | 'context' | 'ritual' | 'measure'
  label: string
  formula: string
  gates: GateOp[]
  /** 全希尔伯特空间各基态概率 |ψ_i|² */
  basisProbabilities: number[]
  bloch: QubitBloch[]
  note: string
}

export type BranchProbability = {
  branchId: string
  label: string
  labelEn: string
  index: number
  bitstring: string
  probability: number
  amplitude: number
}

export type MeasurementTrace = {
  basisLabel: string
  measuredBranchId: string
  measuredLabel: string
  randomSeed: string
  bornRule: string
}

export type QuantumModelTrace = {
  nQubits: number
  qubitLabels: [string, string, string, string]
  steps: QuantumStep[]
  hamiltonianTerms: HamiltonianTerm[]
  semanticMappings: SemanticMapping[]
  branchProbabilities: BranchProbability[]
  measurement: MeasurementTrace
  circuitLines: string[]
  scienceNote: string
}
