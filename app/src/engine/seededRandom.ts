// Seeded pseudo-random number generator (Mulberry32)
export function createSeededRandom(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Simple string hash (djb2)
export function hashString(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function seededRandomInRange(random: () => number, min: number, max: number): number {
  return min + random() * (max - min)
}

export function seededRandomInt(random: () => number, min: number, max: number): number {
  return Math.floor(seededRandomInRange(random, min, max + 1))
}

// Weighted random selection
export function weightedSample<T>(
  items: T[],
  weights: number[],
  random: () => number
): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  let r = random() * totalWeight
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}
