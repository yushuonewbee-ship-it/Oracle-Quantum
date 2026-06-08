import type { ComplexAmplitude } from '../../types/quantum'

export const N_QUBITS = 4
export const HILBERT_DIM = 1 << N_QUBITS

export type StateVector = ComplexAmplitude[]

export function c(re: number, im = 0): ComplexAmplitude {
  return { re, im }
}

export function cloneState(state: StateVector): StateVector {
  return state.map((a) => ({ re: a.re, im: a.im }))
}

export function createZeroState(): StateVector {
  const state = Array.from({ length: HILBERT_DIM }, () => c(0))
  state[0] = c(1)
  return state
}

export function norm(state: StateVector): number {
  let s = 0
  for (const a of state) {
    s += a.re * a.re + a.im * a.im
  }
  return Math.sqrt(s)
}

export function normalize(state: StateVector): StateVector {
  const n = norm(state)
  if (n < 1e-12) return createZeroState()
  return state.map((a) => ({ re: a.re / n, im: a.im / n }))
}

export function basisProbabilities(state: StateVector): number[] {
  return state.map((a) => a.re * a.re + a.im * a.im)
}

export function indexToBitstring(index: number, nQubits = N_QUBITS): string {
  return index.toString(2).padStart(nQubits, '0')
}

function getBit(index: number, qubit: number): number {
  return (index >> qubit) & 1
}

function setBit(index: number, qubit: number, value: number): number {
  if (value) return index | (1 << qubit)
  return index & ~(1 << qubit)
}

/** 单 qubit 门：matrix 为 [[a,b],[c,d]] 复数 */
export function applySingleQubitGate(
  state: StateVector,
  qubit: number,
  matrix: [[ComplexAmplitude, ComplexAmplitude], [ComplexAmplitude, ComplexAmplitude]],
): StateVector {
  const result = Array.from({ length: HILBERT_DIM }, () => c(0))
  const m = matrix
  for (let i = 0; i < HILBERT_DIM; i++) {
    if (getBit(i, qubit) !== 0) continue
    const i0 = setBit(i, qubit, 0)
    const i1 = setBit(i, qubit, 1)
    const v0 = state[i0]
    const v1 = state[i1]
    result[i0] = c(
      m[0][0].re * v0.re - m[0][0].im * v0.im + m[0][1].re * v1.re - m[0][1].im * v1.im,
      m[0][0].re * v0.im + m[0][0].im * v0.re + m[0][1].re * v1.im + m[0][1].im * v1.re,
    )
    result[i1] = c(
      m[1][0].re * v0.re - m[1][0].im * v0.im + m[1][1].re * v1.re - m[1][1].im * v1.im,
      m[1][0].re * v0.im + m[1][0].im * v0.re + m[1][1].re * v1.im + m[1][1].im * v1.re,
    )
  }
  return result
}

export function applyCNOT(state: StateVector, control: number, target: number): StateVector {
  const result = cloneState(state)
  for (let i = 0; i < HILBERT_DIM; i++) {
    if (getBit(i, control) === 1 && getBit(i, target) === 0) {
      const j = i | (1 << target)
      result[i] = state[j]
      result[j] = state[i]
    }
  }
  return result
}

function rxMatrix(theta: number): [[ComplexAmplitude, ComplexAmplitude], [ComplexAmplitude, ComplexAmplitude]] {
  const c0 = Math.cos(theta / 2)
  const s0 = Math.sin(theta / 2)
  return [
    [c(c0), c(0, -s0)],
    [c(0, -s0), c(c0)],
  ]
}

function ryMatrix(theta: number): [[ComplexAmplitude, ComplexAmplitude], [ComplexAmplitude, ComplexAmplitude]] {
  const c0 = Math.cos(theta / 2)
  const s0 = Math.sin(theta / 2)
  return [
    [c(c0), c(-s0)],
    [c(s0), c(c0)],
  ]
}

function rzMatrix(phi: number): [[ComplexAmplitude, ComplexAmplitude], [ComplexAmplitude, ComplexAmplitude]] {
  const e0 = c(Math.cos(phi / 2), Math.sin(phi / 2))
  const e1 = c(Math.cos(phi / 2), -Math.sin(phi / 2))
  return [
    [e0, c(0)],
    [c(0), e1],
  ]
}

const HADAMARD: [[ComplexAmplitude, ComplexAmplitude], [ComplexAmplitude, ComplexAmplitude]] = [
  [c(1 / Math.SQRT2), c(1 / Math.SQRT2)],
  [c(1 / Math.SQRT2), c(-1 / Math.SQRT2)],
]

export function gateH(state: StateVector, q: number) {
  return applySingleQubitGate(state, q, HADAMARD)
}

export function gateRx(state: StateVector, q: number, theta: number) {
  return applySingleQubitGate(state, q, rxMatrix(theta))
}

export function gateRy(state: StateVector, q: number, theta: number) {
  return applySingleQubitGate(state, q, ryMatrix(theta))
}

export function gateRz(state: StateVector, q: number, phi: number) {
  return applySingleQubitGate(state, q, rzMatrix(phi))
}

/** 简化退相干：向 |0⟩ 混合 */
export function applyAmplitudeDamping(state: StateVector, qubit: number, gamma: number): StateVector {
  const g = Math.min(0.45, Math.max(0, gamma))
  const next = cloneState(state)
  for (let i = 0; i < HILBERT_DIM; i++) {
    if (getBit(i, qubit) === 1) {
      const i0 = setBit(i, qubit, 0)
      const amp = state[i]
      next[i] = c(amp.re * (1 - g), amp.im * (1 - g))
      next[i0] = c(
        next[i0].re + amp.re * g,
        next[i0].im + amp.im * g,
      )
    }
  }
  return normalize(next)
}

/** 边缘 Bloch 坐标（单 qubit 约化密度矩阵简化） */
export function blochFromState(state: StateVector, qubit: number): { x: number; y: number; z: number } {
  let p0 = 0
  let p1 = 0
  let re01 = 0
  let im01 = 0
  for (let i = 0; i < HILBERT_DIM; i++) {
    if (getBit(i, qubit) === 0) p0 += state[i].re ** 2 + state[i].im ** 2
    else p1 += state[i].re ** 2 + state[i].im ** 2
  }
  // 近似：用相邻比特平均的相干项
  for (let i = 0; i < HILBERT_DIM; i++) {
    const j = setBit(i, qubit, 1 - getBit(i, qubit))
    if (getBit(i, qubit) === 0) {
      re01 += state[i].re * state[j].re + state[i].im * state[j].im
      im01 += state[i].re * state[j].im - state[i].im * state[j].re
    }
  }
  const scale = Math.max(p0 + p1, 1e-9)
  const x = (2 * re01) / scale
  const y = (2 * im01) / scale
  const z = (p0 - p1) / scale
  const len = Math.hypot(x, y, z) || 1
  return { x: x / len, y: y / len, z: z / len }
}
