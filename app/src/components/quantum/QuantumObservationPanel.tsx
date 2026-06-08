import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { QuantumModelTrace } from '../../types/quantum'
import { indexToBitstring } from '../../engine/quantum/quantumMath'

type QuantumObservationPanelProps = {
  trace: QuantumModelTrace
  compact?: boolean
  activeStepIndex?: number
}

export default function QuantumObservationPanel({
  trace,
  compact = false,
  activeStepIndex,
}: QuantumObservationPanelProps) {
  const [internalIndex, setInternalIndex] = useState(trace.steps.length - 1)
  const stepIndex = activeStepIndex ?? internalIndex
  const step = trace.steps[stepIndex] ?? trace.steps[0]

  const topBasis = useMemo(() => {
    if (!step) return []
    return step.basisProbabilities
      .map((p, i) => ({ i, p, bit: indexToBitstring(i, trace.nQubits) }))
      .sort((a, b) => b.p - a.p)
      .slice(0, compact ? 4 : 8)
  }, [step, trace.nQubits, compact])

  const topBranches = useMemo(
    () => trace.branchProbabilities.slice(0, compact ? 4 : trace.branchProbabilities.length),
    [trace.branchProbabilities, compact],
  )

  if (!step) return null

  return (
    <div
      className="w-full rounded-sm overflow-hidden"
      style={{
        background: 'rgba(8, 7, 12, 0.55)',
        border: '1px solid rgba(216, 208, 228, 0.1)',
      }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(216,208,228,0.08)' }}>
        <div className="font-data text-[9px] tracking-[0.22em] uppercase" style={{ color: 'rgba(181,168,192,0.62)' }}>
          Quantum Register · {trace.nQubits} qubits
        </div>
        <div className="mt-1 text-sm" style={{ color: 'rgba(247,246,250,0.9)' }}>
          {step.label}
        </div>
        <div className="font-data text-[10px] mt-1" style={{ color: 'rgba(197,184,216,0.75)' }}>
          {step.formula}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 px-3 py-2 border-b" style={{ borderColor: 'rgba(216,208,228,0.06)' }}>
        {trace.steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => activeStepIndex === undefined && setInternalIndex(i)}
            className="font-data text-[8px] px-2 py-1 rounded transition-colors"
            style={{
              background: i === stepIndex ? 'rgba(93,83,112,0.45)' : 'rgba(216,208,228,0.06)',
              color: i === stepIndex ? 'rgba(247,246,250,0.95)' : 'rgba(181,168,192,0.55)',
            }}
          >
            {s.id.toUpperCase()}
          </button>
        ))}
      </div>

      <div className={`grid gap-4 p-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        <div>
          <div className="font-data text-[8px] tracking-wider mb-2" style={{ color: 'rgba(181,168,192,0.5)' }}>
            CIRCUIT
          </div>
          <div className="space-y-1 font-mono text-[10px] leading-relaxed" style={{ color: 'rgba(216,208,228,0.82)' }}>
            {trace.circuitLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          {step.gates.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {step.gates.map((g) => (
                <span
                  key={g.id}
                  className="font-data text-[8px] px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(216,208,228,0.08)', color: 'rgba(197,184,216,0.9)' }}
                >
                  {g.symbol}({g.qubits.join(',')})
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="font-data text-[8px] tracking-wider mb-2" style={{ color: 'rgba(181,168,192,0.5)' }}>
            BORN COLLAPSE
          </div>
          <div className="space-y-1.5">
            {topBranches.map((branch) => (
              <div key={branch.branchId} className="flex items-center gap-2">
                <span className="text-[10px] w-16 shrink-0 truncate" style={{ color: 'rgba(216,208,228,0.76)' }}>
                  {branch.label}
                </span>
                <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(216,208,228,0.08)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background:
                        branch.branchId === trace.measurement.measuredBranchId
                          ? 'linear-gradient(90deg, rgba(197,184,216,0.95), rgba(122,110,142,0.8))'
                          : 'linear-gradient(90deg, rgba(122,110,142,0.55), rgba(197,184,216,0.32))',
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${branch.probability * 100}%` }}
                    transition={{ duration: 0.55 }}
                  />
                </div>
                <span className="font-data text-[8px] w-10 text-right" style={{ color: 'rgba(216,208,228,0.72)' }}>
                  {(branch.probability * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed" style={{ color: 'rgba(181,168,192,0.55)' }}>
            坍缩到：{trace.measurement.measuredLabel} · {trace.measurement.bornRule}
          </p>
        </div>

        <div>
          <div className="font-data text-[8px] tracking-wider mb-2" style={{ color: 'rgba(181,168,192,0.5)' }}>
            |ψ⟩ BASIS PROBABILITIES
          </div>
          <div className="space-y-1.5">
            {topBasis.map((row) => (
              <div key={row.i} className="flex items-center gap-2">
                <span className="font-data text-[8px] w-10 shrink-0" style={{ color: 'rgba(181,168,192,0.55)' }}>
                  |{row.bit}⟩
                </span>
                <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(216,208,228,0.08)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, rgba(122,110,142,0.9), rgba(197,184,216,0.7))' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${row.p * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="font-data text-[8px] w-10 text-right" style={{ color: 'rgba(216,208,228,0.72)' }}>
                  {(row.p * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {!compact && (
          <>
          <div>
            <div className="font-data text-[8px] tracking-wider mb-2" style={{ color: 'rgba(181,168,192,0.5)' }}>
              HAMILTONIAN / CHANNEL TERMS
            </div>
            <div className="space-y-2">
              {trace.hamiltonianTerms.map((term) => (
                <div key={term.id} className="p-2 rounded-sm" style={{ background: 'rgba(0,0,0,0.18)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px]" style={{ color: 'rgba(216,208,228,0.82)' }}>{term.label}</span>
                    <span className="font-data text-[8px]" style={{ color: 'rgba(181,168,192,0.58)' }}>
                      {term.operator} · {term.coefficient.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed" style={{ color: 'rgba(181,168,192,0.54)' }}>
                    {term.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="font-data text-[8px] tracking-wider mb-2" style={{ color: 'rgba(181,168,192,0.5)' }}>
              BLOCH (REDUCED)
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {step.bloch.map((b) => (
                <div key={b.qubit} className="p-2 rounded-sm" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <div className="text-[10px] mb-1 truncate" style={{ color: 'rgba(216,208,228,0.75)' }}>
                    {b.label}
                  </div>
                  <div className="font-data text-[8px] space-y-0.5" style={{ color: 'rgba(181,168,192,0.55)' }}>
                    <div>x {b.x.toFixed(2)}</div>
                    <div>y {b.y.toFixed(2)}</div>
                    <div>z {b.z.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-4 py-3 border-t text-[11px] leading-relaxed"
          style={{ borderColor: 'rgba(216,208,228,0.08)', color: 'rgba(197,184,216,0.78)' }}
        >
          {step.note}
        </motion.div>
      </AnimatePresence>

      {!compact && trace.semanticMappings.length > 0 && (
        <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(216,208,228,0.08)' }}>
          <div className="font-data text-[8px] tracking-wider mb-2" style={{ color: 'rgba(181,168,192,0.5)' }}>
            INPUT → GATES
          </div>
          <div className="space-y-2">
            {trace.semanticMappings.map((m, i) => (
              <div key={i} className="text-[11px]">
                <span className="font-data text-[8px] mr-2" style={{ color: 'rgba(122,110,142,0.9)' }}>
                  {m.source}
                </span>
                <span style={{ color: 'rgba(247,246,250,0.85)' }}>{m.input}</span>
                <div className="mt-0.5" style={{ color: 'rgba(181,168,192,0.55)' }}>
                  {m.gates.join(' · ')} — {m.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
