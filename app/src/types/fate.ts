import type { QuantumModelTrace } from './quantum'

export type FateVector = {
  action: number
  stability: number
  emotionNoise: number
  relationshipPull: number
  wealthFlow: number
  riskBias: number
  intuition: number
  delay: number
  transition: number
  clarity: number
  constraint: number
  creativeCharge: number
}

export type FateVectorKey = keyof FateVector

export type QuestionType = 'career' | 'relationship' | 'study' | 'wealth' | 'social' | 'creative' | 'daily' | 'majorChoice'
export type EmotionType = 'calm' | 'hesitant' | 'excited' | 'anxious' | 'tired' | 'angry' | 'expectant' | 'numb'
export type TimeHorizon = 'today' | '7days' | '30days' | '3months' | '1year'
export type RitualType = 'doubleSlit' | 'manyWorlds' | 'schrodinger' | 'entanglement' | 'tunneling' | 'decoherence'

export type BirthInput = {
  birthDate: string
  birthTime?: string
  birthPlace?: string
  genderMode?: string
  lifeThemes: string[]
  selfKeywords: string[]
}

export type ContextInput = {
  question: string
  questionType: QuestionType
  emotion: EmotionType
  situationTags: string[]
  timeHorizon: TimeHorizon
}

export type MeasurementInput = {
  ritualType: RitualType
  symbolChoice: string
  gestureSeed: string
  observeTimestamp: number
}

export type FateBranch = {
  id: string
  label: string
  labelEn: string
  probability: number
  amplitude: number
  phase: number
  risk: number
  reward: number
  cost: number
  shortAdvice: string
  vector: FateVector
}

export type ParameterDelta = {
  key: FateVectorKey
  label: string
  delta: number
  after?: number
}

export type ParameterContribution = {
  id: string
  source: 'birth' | 'context' | 'measurement' | 'system'
  inputLabel: string
  divinationConcept: string
  quantumRole: string
  description: string
  deltas: ParameterDelta[]
}

export type StateSnapshot = {
  id: 'birth' | 'context' | 'measurement' | 'collapse'
  label: string
  formulaLabel: string
  vector: FateVector
  note: string
}

export type OperatorSnapshot = {
  id: string
  label: string
  formula: string
  description: string
  matrixPreview: number[][]
  affectedKeys: FateVectorKey[]
}

export type FormulaSet = {
  stateEvolution: string
  bornRule: string
  decoherence: string
  measurement: string
  normalization: string
}

export type ModelTrace = {
  vectorLabels: Record<FateVectorKey, string>
  formulas: FormulaSet
  inputContributions: ParameterContribution[]
  stateSnapshots: StateSnapshot[]
  operatorSnapshots: OperatorSnapshot[]
  strongestCandidate: {
    id: string
    label: string
    probability: number
  }
  measurementSummary: string
  scienceNote: string
}

export type FateResult = {
  mainBranch: FateBranch
  branches: FateBranch[]
  quantumExplanation: string
  divinationExplanation: string
  actionAdvice: string
  oraclePoem: string
  trace: ModelTrace
  quantumTrace: QuantumModelTrace
  debug: {
    birthVector: FateVector
    currentVector: FateVector
    fiveElementProfile: Record<string, number>
    decoherence: number
    interference: number
    birthNayin: {
      ganzhi: string
      nayin: string
      element: string
      elementLabel: string
      ganzhiYear: number
    } | null
  }
}

export type AppStep =
  | 'landing'
  | 'theory'
  | 'birthInput'
  | 'questionInput'
  | 'ritualSelect'
  | 'observation'
  | 'result'

export type ObservationPhase = 'idle' | 'superposition' | 'interference' | 'decoherence' | 'collapse' | 'reveal'

export type HistoryRecord = {
  id: string
  date: string
  question: string
  questionType: QuestionType
  mainBranchLabel: string
  mainBranchProbability: number
  oraclePoem: string
  result: FateResult
}
