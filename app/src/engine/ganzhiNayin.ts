import type { FateVector } from '../types/fate'

export type FiveElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water'

export type YearPillarNayin = {
  /** 立春换岁后的公历年份（用于排年柱） */
  ganzhiYear: number
  stem: string
  branch: string
  ganzhi: string
  jiaziIndex: number
  stemIndex: number
  branchIndex: number
  nayin: string
  element: FiveElement
  elementLabel: string
}

const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const

/** 六十甲子纳音（每两甲子一行） */
const NAYIN_ROWS: { name: string; element: FiveElement }[] = [
  { name: '海中金', element: 'metal' },
  { name: '炉中火', element: 'fire' },
  { name: '大林木', element: 'wood' },
  { name: '路旁土', element: 'earth' },
  { name: '剑锋金', element: 'metal' },
  { name: '山头火', element: 'fire' },
  { name: '涧下水', element: 'water' },
  { name: '城头土', element: 'earth' },
  { name: '白蜡金', element: 'metal' },
  { name: '杨柳木', element: 'wood' },
  { name: '泉中水', element: 'water' },
  { name: '屋上土', element: 'earth' },
  { name: '霹雳火', element: 'fire' },
  { name: '松柏木', element: 'wood' },
  { name: '长流水', element: 'water' },
  { name: '沙中金', element: 'metal' },
  { name: '山下火', element: 'fire' },
  { name: '平地木', element: 'wood' },
  { name: '壁上土', element: 'earth' },
  { name: '金箔金', element: 'metal' },
  { name: '覆灯火', element: 'fire' },
  { name: '天河水', element: 'water' },
  { name: '大驿土', element: 'earth' },
  { name: '钗钏金', element: 'metal' },
  { name: '桑柘木', element: 'wood' },
  { name: '大溪水', element: 'water' },
  { name: '沙中土', element: 'earth' },
  { name: '天上火', element: 'fire' },
  { name: '石榴木', element: 'wood' },
  { name: '大海水', element: 'water' },
]

export const ELEMENT_ZH: Record<FiveElement, string> = {
  wood: '木',
  fire: '火',
  earth: '土',
  metal: '金',
  water: '水',
}

/** 纳音五行 → 命运向量主偏置 */
const NAYIN_VECTOR_INFLUENCE: Record<FiveElement, Partial<FateVector>> = {
  wood: { action: 0.12, transition: 0.1, creativeCharge: 0.08 },
  fire: { intuition: 0.1, relationshipPull: 0.08, creativeCharge: 0.1 },
  earth: { stability: 0.12, constraint: 0.08, clarity: 0.06 },
  metal: { clarity: 0.12, riskBias: 0.08, constraint: 0.08 },
  water: { emotionNoise: 0.06, wealthFlow: 0.1, delay: 0.08 },
}

/** 年支五行微调（权重低于纳音） */
const BRANCH_VECTOR_INFLUENCE: Record<number, Partial<FateVector>> = {
  0: { emotionNoise: 0.03, wealthFlow: 0.03 }, // 子水
  1: { stability: 0.03, constraint: 0.02 }, // 丑土
  2: { action: 0.03, transition: 0.03 }, // 寅木
  3: { creativeCharge: 0.03, action: 0.02 }, // 卯木
  4: { stability: 0.03, constraint: 0.02 }, // 辰土
  5: { intuition: 0.03, creativeCharge: 0.02 }, // 巳火
  6: { relationshipPull: 0.03, intuition: 0.03 }, // 午火
  7: { stability: 0.03, clarity: 0.02 }, // 未土
  8: { clarity: 0.03, riskBias: 0.02 }, // 申金
  9: { clarity: 0.03, constraint: 0.02 }, // 酉金
  10: { stability: 0.03, constraint: 0.02 }, // 戌土
  11: { wealthFlow: 0.03, delay: 0.02 }, // 亥水
}

export const ELEMENT_PHASE: Record<FiveElement, number> = {
  wood: 0.35,
  fire: 0.85,
  earth: 1.25,
  metal: 1.65,
  water: 2.05,
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

/** 立春日（公历 2 月，约 3–5 日），寿星公式近似 */
export function getLiChunDay(year: number): number {
  const y = year - 1900
  let day = Math.floor(y * 0.2422 + 4.475) - Math.floor(y / 4)
  if (year >= 2000) day += 1
  return Math.max(3, Math.min(5, day))
}

export function parseBirthDate(birthDate: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate.trim())
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return { year, month, day }
}

/** 立春换岁：立春前算上一年 */
export function getGanzhiYearNumber(year: number, month: number, day: number): number {
  const lichun = getLiChunDay(year)
  if (month < 2 || (month === 2 && day < lichun)) return year - 1
  return year
}

export function getJiaziIndex(ganzhiYear: number): number {
  return mod(ganzhiYear - 4, 60)
}

export function getNayinByJiaziIndex(jiaziIndex: number): { name: string; element: FiveElement } {
  const row = NAYIN_ROWS[Math.floor(mod(jiaziIndex, 60) / 2) % 30]
  return row
}

export function getYearPillarNayin(birthDate: string): YearPillarNayin | null {
  const parsed = parseBirthDate(birthDate)
  if (!parsed) return null

  const ganzhiYear = getGanzhiYearNumber(parsed.year, parsed.month, parsed.day)
  const jiaziIndex = getJiaziIndex(ganzhiYear)
  const stemIndex = mod(jiaziIndex, 10)
  const branchIndex = mod(jiaziIndex, 12)
  const stem = HEAVENLY_STEMS[stemIndex]
  const branch = EARTHLY_BRANCHES[branchIndex]
  const { name: nayin, element } = getNayinByJiaziIndex(jiaziIndex)

  return {
    ganzhiYear,
    stem,
    branch,
    ganzhi: `${stem}${branch}`,
    jiaziIndex,
    stemIndex,
    branchIndex,
    nayin,
    element,
    elementLabel: ELEMENT_ZH[element],
  }
}

function mergeInfluence(
  base: Partial<FateVector>,
  extra: Partial<FateVector>,
  scale: number,
): Partial<FateVector> {
  const out: Partial<FateVector> = { ...base }
  for (const [key, val] of Object.entries(extra)) {
    const k = key as keyof FateVector
    out[k] = (out[k] ?? 0) + val * scale
  }
  return out
}

/** 年柱纳音 + 年支 → 命运向量先验 */
export function getNayinElementInfluence(birthDate: string): Partial<FateVector> {
  const pillar = getYearPillarNayin(birthDate)
  if (!pillar) return {}

  const primary = { ...NAYIN_VECTOR_INFLUENCE[pillar.element] }
  const branch = BRANCH_VECTOR_INFLUENCE[pillar.branchIndex] ?? {}
  return mergeInfluence(primary, branch, 0.35)
}
