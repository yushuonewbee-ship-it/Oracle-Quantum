import { type FateVector } from '../types/fate'
import { getNayinElementInfluence } from './ganzhiNayin'

// Five Elements mapping to vector dimensions
const FIVE_ELEMENTS: Record<string, (keyof FateVector)[]> = {
  wood: ['action', 'transition', 'creativeCharge'],
  fire: ['intuition', 'relationshipPull', 'creativeCharge'],
  earth: ['stability', 'constraint', 'clarity'],
  metal: ['clarity', 'riskBias', 'constraint'],
  water: ['emotionNoise', 'wealthFlow', 'delay'],
}

export function calculateFiveElements(vector: FateVector): Record<string, number> {
  const profile: Record<string, number> = {}
  for (const [element, keys] of Object.entries(FIVE_ELEMENTS)) {
    profile[element] = keys.reduce((sum, k) => sum + vector[k], 0) / keys.length
  }
  return profile
}

export function getStrongestElement(profile: Record<string, number>): { element: string; value: number } {
  let strongest = { element: 'wood', value: -Infinity }
  for (const [element, value] of Object.entries(profile)) {
    if (value > strongest.value) {
      strongest = { element, value }
    }
  }
  return strongest
}

export function getWeakestElement(profile: Record<string, number>): { element: string; value: number } {
  let weakest = { element: 'wood', value: Infinity }
  for (const [element, value] of Object.entries(profile)) {
    if (value < weakest.value) {
      weakest = { element, value }
    }
  }
  return weakest
}

const ELEMENT_MEANINGS: Record<string, string> = {
  wood: '流动、探索与生长',
  fire: '直觉、热情与创造力',
  earth: '稳定、承载与沉淀',
  metal: '锐利、决断与秩序',
  water: '情感、资源与适应性',
}

export function getElementMeaning(element: string): string {
  return ELEMENT_MEANINGS[element] || '未知'
}

/** 出生日期 → 年柱纳音五行对命运向量的先验偏置 */
export function getBirthElementInfluence(birthDate: string): Partial<FateVector> {
  return getNayinElementInfluence(birthDate)
}

// Birth time influence on vector
export function getBirthTimeInfluence(birthTime?: string): Partial<FateVector> {
  if (!birthTime || birthTime === 'unknown') {
    return { clarity: -0.05, delay: 0.05 }
  }
  const [hours] = birthTime.split(':').map(Number)
  const influence: Partial<FateVector> = {}

  if (hours >= 5 && hours < 11) {
    // Morning
    influence.action = 0.1
    influence.delay = -0.05
  } else if (hours >= 11 && hours < 17) {
    // Afternoon
    influence.action = 0.05
    influence.clarity = 0.05
  } else if (hours >= 17 && hours < 23) {
    // Evening
    influence.intuition = 0.08
    influence.relationshipPull = 0.05
  } else {
    // Night
    influence.delay = 0.1
    influence.emotionNoise = -0.03
  }

  return influence
}

// Birth place influence (deterministic hash-based)
export function getBirthPlaceInfluence(birthPlace?: string): Partial<FateVector> {
  const place = birthPlace || 'unknown-place'
  let hash = 0
  for (let i = 0; i < place.length; i++) {
    hash = ((hash << 5) - hash + place.charCodeAt(i)) | 0
  }
  hash = Math.abs(hash)

  const norm = (hash % 1000) / 1000
  return {
    stability: (norm - 0.5) * 0.1,
    wealthFlow: (Math.sin(norm * Math.PI * 2) * 0.5) * 0.1,
  }
}

// Life themes influence
export function getLifeThemesInfluence(themes: string[]): Partial<FateVector> {
  const influence: Partial<FateVector> = {}
  const themeMap: Record<string, Partial<FateVector>> = {
    'career': { action: 0.1, clarity: 0.05 },
    'relationship': { relationshipPull: 0.1, intuition: 0.05 },
    'wealth': { wealthFlow: 0.1, riskBias: 0.05 },
    'study': { clarity: 0.1, creativeCharge: 0.05 },
    'family': { stability: 0.1, constraint: 0.05 },
    'creative': { creativeCharge: 0.12, intuition: 0.08 },
    'health': { stability: 0.08, action: 0.05 },
    'growth': { transition: 0.1, action: 0.05 },
  }

  for (const theme of themes) {
    const themeInfluence = themeMap[theme]
    if (themeInfluence) {
      for (const [key, val] of Object.entries(themeInfluence)) {
        influence[key as keyof FateVector] = (influence[key as keyof FateVector] || 0) + val
      }
    }
  }

  return influence
}

// Self keywords influence
export function getSelfKeywordsInfluence(keywords: string[]): Partial<FateVector> {
  const influence: Partial<FateVector> = {}
  const keywordMap: Record<string, Partial<FateVector>> = {
    'rational': { clarity: 0.08, emotionNoise: -0.05 },
    'sensitive': { intuition: 0.08, emotionNoise: 0.05 },
    'adventurous': { action: 0.08, riskBias: 0.06 },
    'stable': { stability: 0.08, transition: -0.04 },
    'anxious': { emotionNoise: 0.1, delay: 0.05, clarity: -0.04 },
    'executive': { action: 0.1, delay: -0.06 },
    'creative': { creativeCharge: 0.08, intuition: 0.05 },
    'introverted': { relationshipPull: -0.04, creativeCharge: 0.04 },
    'extroverted': { relationshipPull: 0.06, action: 0.04 },
    'perfectionist': { clarity: 0.06, constraint: 0.06, delay: 0.04 },
  }

  for (const kw of keywords) {
    const kwInfluence = keywordMap[kw]
    if (kwInfluence) {
      for (const [key, val] of Object.entries(kwInfluence)) {
        influence[key as keyof FateVector] = (influence[key as keyof FateVector] || 0) + val
      }
    }
  }

  return influence
}
