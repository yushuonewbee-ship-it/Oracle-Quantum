import { type FateVector } from '../types/fate'

export const FATE_VECTOR_KEYS: (keyof FateVector)[] = [
  'action', 'stability', 'emotionNoise', 'relationshipPull',
  'wealthFlow', 'riskBias', 'intuition', 'delay',
  'transition', 'clarity', 'constraint', 'creativeCharge',
]

export function createEmptyVector(): FateVector {
  return {
    action: 0.5, stability: 0.5, emotionNoise: 0.5,
    relationshipPull: 0.5, wealthFlow: 0.5, riskBias: 0.5,
    intuition: 0.5, delay: 0.5, transition: 0.5,
    clarity: 0.5, constraint: 0.5, creativeCharge: 0.5,
  }
}

export function normalizeVector(v: FateVector): FateVector {
  let min = Infinity, max = -Infinity
  for (const k of FATE_VECTOR_KEYS) {
    if (v[k] < min) min = v[k]
    if (v[k] > max) max = v[k]
  }
  const range = max - min || 1
  const result = { ...v }
  for (const k of FATE_VECTOR_KEYS) {
    result[k] = (v[k] - min) / range
  }
  return result
}

export function clampVector(v: FateVector): FateVector {
  const result = { ...v }
  for (const k of FATE_VECTOR_KEYS) {
    result[k] = Math.max(0, Math.min(1, v[k]))
  }
  return result
}

export function addVectors(a: FateVector, b: FateVector, weightB = 1): FateVector {
  const result = { ...a }
  for (const k of FATE_VECTOR_KEYS) {
    result[k] = a[k] + b[k] * weightB
  }
  return result
}

export function mixVectors(a: FateVector, b: FateVector, t: number): FateVector {
  const result = { ...a }
  for (const k of FATE_VECTOR_KEYS) {
    result[k] = a[k] + (b[k] - a[k]) * t
  }
  return result
}

export function overlap(a: FateVector, b: FateVector): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (const k of FATE_VECTOR_KEYS) {
    dot += a[k] * b[k]
    normA += a[k] ** 2
    normB += b[k] ** 2
  }
  return dot / Math.max(Math.sqrt(normA) * Math.sqrt(normB), 0.0001)
}

export function probability(current: FateVector, outcome: FateVector): number {
  return overlap(current, outcome) ** 2
}
