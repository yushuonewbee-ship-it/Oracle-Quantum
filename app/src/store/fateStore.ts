import { create } from 'zustand'
import {
  type BirthInput,
  type ContextInput,
  type MeasurementInput,
  type FateResult,
  type AppStep,
  type ObservationPhase,
  type HistoryRecord,
} from '../types/fate'

interface FateState {
  currentStep: AppStep
  setStep: (step: AppStep) => void

  birthWizardStep: number
  questionWizardStep: number
  setBirthWizardStep: (step: number) => void
  setQuestionWizardStep: (step: number) => void

  birthInput: BirthInput
  setBirthInput: (input: Partial<BirthInput>) => void

  contextInput: ContextInput
  setContextInput: (input: Partial<ContextInput>) => void

  measurementInput: MeasurementInput
  setMeasurementInput: (input: Partial<MeasurementInput>) => void

  observationPhase: ObservationPhase
  setObservationPhase: (phase: ObservationPhase) => void

  fateResult: FateResult | null
  setFateResult: (result: FateResult) => void

  history: HistoryRecord[]
  addHistory: (record: HistoryRecord) => void
  clearHistory: () => void

  isObserving: boolean
  setIsObserving: (val: boolean) => void

  oracleProphecy: string | null
  oracleStatus: 'idle' | 'loading' | 'success' | 'error'
  oracleError: string | null
  setOracleProphecy: (text: string | null) => void
  setOracleStatus: (status: 'idle' | 'loading' | 'success' | 'error', error?: string | null) => void

  reset: () => void
}

const defaultBirthInput: BirthInput = {
  birthDate: '',
  birthTime: '',
  birthPlace: '',
  genderMode: '',
  lifeThemes: [],
  selfKeywords: [],
}

const defaultContextInput: ContextInput = {
  question: '',
  questionType: 'daily',
  emotion: 'calm',
  situationTags: [],
  timeHorizon: '7days',
}

const defaultMeasurementInput: MeasurementInput = {
  ritualType: 'doubleSlit',
  symbolChoice: 'star',
  gestureSeed: '',
  observeTimestamp: 0,
}

function loadHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem('quantum-fate-history')
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

export const useFateStore = create<FateState>((set, get) => ({
  currentStep: 'landing',
  setStep: (step) => set({ currentStep: step }),

  birthWizardStep: 0,
  questionWizardStep: 0,
  setBirthWizardStep: (step) => set({ birthWizardStep: step }),
  setQuestionWizardStep: (step) => set({ questionWizardStep: step }),

  birthInput: { ...defaultBirthInput },
  setBirthInput: (input) => set((s) => ({ birthInput: { ...s.birthInput, ...input } })),

  contextInput: { ...defaultContextInput },
  setContextInput: (input) => set((s) => ({ contextInput: { ...s.contextInput, ...input } })),

  measurementInput: { ...defaultMeasurementInput },
  setMeasurementInput: (input) => set((s) => ({ measurementInput: { ...s.measurementInput, ...input } })),

  observationPhase: 'idle',
  setObservationPhase: (phase) => set({ observationPhase: phase }),

  fateResult: null,
  setFateResult: (result) => set({ fateResult: result }),

  history: loadHistory(),
  addHistory: (record) => {
    const newHistory = [record, ...get().history].slice(0, 50)
    set({ history: newHistory })
    try {
      localStorage.setItem('quantum-fate-history', JSON.stringify(newHistory))
    } catch { /* ignore */ }
  },
  clearHistory: () => {
    set({ history: [] })
    try {
      localStorage.removeItem('quantum-fate-history')
    } catch { /* ignore */ }
  },

  isObserving: false,
  setIsObserving: (val) => set({ isObserving: val }),

  oracleProphecy: null,
  oracleStatus: 'idle',
  oracleError: null,
  setOracleProphecy: (text) => set({ oracleProphecy: text }),
  setOracleStatus: (status, error = null) =>
    set({ oracleStatus: status, oracleError: status === 'error' ? error : null }),

  reset: () => set({
    currentStep: 'landing',
    birthWizardStep: 0,
    questionWizardStep: 0,
    birthInput: { ...defaultBirthInput },
    contextInput: { ...defaultContextInput },
    measurementInput: { ...defaultMeasurementInput },
    observationPhase: 'idle',
    fateResult: null,
    isObserving: false,
    oracleProphecy: null,
    oracleStatus: 'idle',
    oracleError: null,
  }),
}))
