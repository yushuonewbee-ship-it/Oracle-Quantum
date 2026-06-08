import { motion } from 'framer-motion'
import type { ParameterContribution } from '../types/fate'
import type { QuantumModelTrace } from '../types/quantum'

type ParameterExplainerPanelProps = {
  title?: string
  contributions: ParameterContribution[]
  compact?: boolean
  ghost?: boolean
  quantumTrace?: QuantumModelTrace
}

export default function ParameterExplainerPanel({
  title = '参数进入模型',
  contributions,
  compact = false,
  ghost = false,
  quantumTrace,
}: ParameterExplainerPanelProps) {
  const panelClass = ghost ? 'panel-ghost' : 'panel'
  const visible = contributions.filter((item) => item.deltas.length > 0).slice(0, compact ? 2 : 4)
  const topDeltas = visible
    .flatMap((item) => item.deltas.map((delta) => ({ ...delta, source: item.inputLabel })))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, compact ? 4 : 6)

  if (visible.length === 0) {
    return (
      <div className={`${panelClass} mt-8 p-4 text-center`}>
        <div className="section-label mb-2">{title}</div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          完成当前输入后，这里会显示它如何进入态矢量与测量算符。
        </p>
      </div>
    )
  }

  return (
    <motion.div
      className={`${panelClass} mt-8 p-4`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <div>
          <div className="section-label mb-1">{title}</div>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            命理输入被转译为量子门、势场项与测量基底
          </p>
        </div>
        <span className="font-data text-[9px]" style={{ color: 'var(--quantum-cyan)' }}>
          TRACE {quantumTrace ? quantumTrace.semanticMappings.length : visible.length}
        </span>
      </div>

      {quantumTrace && (
        <div className="mb-4 space-y-2">
          {quantumTrace.semanticMappings.slice(0, compact ? 3 : 5).map((mapping, index) => (
            <div key={`${mapping.source}-${index}`} className="rounded-sm p-3" style={{ background: 'rgba(216,208,228,0.045)' }}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <span className="font-data text-[8px] uppercase" style={{ color: 'rgba(197,184,216,0.72)' }}>
                  {mapping.source}
                </span>
                <span className="text-[11px] truncate max-w-[220px]" style={{ color: 'rgba(247,246,250,0.82)' }}>
                  {mapping.input}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'rgba(181,168,192,0.68)' }}>
                {mapping.description}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {mapping.gates.map((gate) => (
                  <span
                    key={`${mapping.source}-${gate}`}
                    className="font-data rounded-full px-2 py-1 text-[8px]"
                    style={{ color: 'rgba(216,208,228,0.85)', background: 'rgba(122,110,142,0.18)' }}
                  >
                    {gate}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {!compact && quantumTrace.hamiltonianTerms.length > 0 && (
            <div className="grid gap-2 md:grid-cols-2">
              {quantumTrace.hamiltonianTerms.map((term) => (
                <div key={term.id} className="rounded-sm p-3" style={{ background: 'rgba(0,0,0,0.035)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px]" style={{ color: 'var(--text-primary)' }}>{term.label}</span>
                    <span className="font-data text-[8px]" style={{ color: 'var(--text-muted)' }}>
                      {term.operator} {term.coefficient.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {term.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {visible.map((item) => (
          <div key={item.id} className="rounded-sm p-3" style={{ background: 'rgba(0,0,0,0.025)' }}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                {item.divinationConcept}
              </span>
              <span className="font-data text-[8px]" style={{ color: 'var(--text-muted)' }}>
                {item.quantumRole}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
              {item.description}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {item.deltas.slice(0, 4).map((delta) => (
                <span
                  key={`${item.id}-${delta.key}`}
                  className="font-data rounded-full px-2 py-1 text-[8px]"
                  style={{
                    color: delta.delta >= 0 ? 'var(--prob-green)' : 'var(--risk-red)',
                    background: 'rgba(0,0,0,0.035)',
                  }}
                >
                  {delta.label} {delta.delta >= 0 ? '+' : ''}{delta.delta.toFixed(2)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {topDeltas.length > 0 && (
        <div className="mt-4 space-y-2">
          {topDeltas.map((delta) => (
            <div key={`${delta.source}-${delta.key}`} className="grid grid-cols-[86px_1fr_42px] items-center gap-2">
              <span className="font-data text-[8px] truncate" style={{ color: 'var(--text-muted)' }}>
                {delta.label}
              </span>
              <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, Math.abs(delta.delta) * 900)}%`,
                    background: delta.delta >= 0 ? 'var(--prob-green)' : 'var(--risk-red)',
                    opacity: 0.6,
                  }}
                />
              </div>
              <span className="font-data text-[8px] text-right" style={{ color: 'var(--text-dim)' }}>
                {delta.delta >= 0 ? '+' : ''}{delta.delta.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
