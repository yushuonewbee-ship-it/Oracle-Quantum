import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw, Share2, History, Trash2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { useFateStore } from '../store/fateStore'
import { toPng } from 'html-to-image'
import ParticleGrid from '../components/ParticleGrid'
import PageTransition from '../components/PageTransition'
import RadialBranchChart from '../components/RadialBranchChart'
import QuantumObservationPanel from '../components/quantum/QuantumObservationPanel'
import type { FateBranch, ParameterContribution } from '../types/fate'

function BranchRow({ branch, isMain }: { branch: FateBranch; isMain: boolean }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      className="panel p-5 transition-all duration-300"
      style={{
        borderColor: isMain ? 'rgba(0, 0, 0, 0.16)' : undefined,
        background: isMain ? 'rgba(0, 0, 0, 0.03)' : undefined,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {isMain && <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--quantum-blue)' }} />}
          <span className={`text-sm ${isMain ? 'font-medium' : ''}`} style={{ color: 'var(--text-primary)' }}>
            {branch.label}
          </span>
          {isMain && (
            <span className="font-data text-[8px] tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--quantum-blue)' }}>
              PRIMARY
            </span>
          )}
        </div>
        <span className="font-data text-sm" style={{ color: isMain ? 'var(--quantum-cyan)' : 'var(--text-secondary)' }}>
          {(branch.probability * 100).toFixed(1)}%
        </span>
      </div>

      {/* Probability bar */}
      <div className="w-full h-[2px] rounded-full overflow-hidden mb-3" style={{ background: 'rgba(0,0,0,0.06)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{
            background: isMain
              ? 'linear-gradient(90deg, #2E4057, #4A6278, #6B6280)'
              : 'linear-gradient(90deg, rgba(90,90,98,0.35), rgba(90,90,98,0.12))',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${branch.probability * 100}%` }}
          transition={{ duration: 1.2, delay: 0.3 }}
        />
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-5 mb-3">
        <span className="font-data text-[9px] tracking-wider" style={{ color: 'var(--text-muted)' }}>
          AMP {branch.amplitude.toFixed(3)}
        </span>
        <span className="font-data text-[9px] tracking-wider" style={{ color: 'var(--text-muted)' }}>
          PH {branch.phase.toFixed(2)}rad
        </span>
        <span className="font-data text-[9px] tracking-wider" style={{ color: branch.risk > 0.5 ? 'var(--risk-red)' : 'var(--prob-green)' }}>
          RISK {(branch.risk * 100).toFixed(0)}%
        </span>
      </div>

      {/* Expand */}
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[11px] transition-colors hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
        <span>展开详情</span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {branch.shortAdvice}
        </motion.p>
      )}
    </motion.div>
  )
}

function Section({ label, labelEn, children, delay = 0 }: { label: string; labelEn: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
    >
      <div className="flex items-baseline gap-3 mb-5">
        <span className="section-label">{label}</span>
        <span className="font-data text-[8px] tracking-[0.2em]" style={{ color: 'var(--text-dim)' }}>{labelEn}</span>
      </div>
      {children}
    </motion.div>
  )
}

function ContributionCard({ contribution }: { contribution: ParameterContribution }) {
  return (
    <div className="panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
          {contribution.divinationConcept}
        </span>
        <span className="font-data text-[8px]" style={{ color: 'var(--text-muted)' }}>
          {contribution.quantumRole}
        </span>
      </div>
      <p className="text-[11px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
        {contribution.description}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {contribution.deltas.map((delta) => (
          <span
            key={delta.key}
            className="font-data rounded-full px-2 py-1 text-[8px]"
            style={{
              background: 'rgba(0,0,0,0.035)',
              color: delta.delta >= 0 ? 'var(--prob-green)' : 'var(--risk-red)',
            }}
          >
            {delta.label} {delta.delta >= 0 ? '+' : ''}{delta.delta.toFixed(2)}
          </span>
        ))}
      </div>
    </div>
  )
}

function OracleProphecyBlock() {
  const oracleStatus = useFateStore((s) => s.oracleStatus)
  const oracleProphecy = useFateStore((s) => s.oracleProphecy)
  const oracleError = useFateStore((s) => s.oracleError)
  const fateResult = useFateStore((s) => s.fateResult)

  if (oracleStatus === 'loading') {
    return (
      <div
        className="relative overflow-hidden rounded-sm p-8 md:p-10"
        style={{
          background:
            'radial-gradient(circle at 25% 20%, rgba(122,90,168,0.16), transparent 55%), radial-gradient(circle at 80% 80%, rgba(72,90,160,0.12), transparent 60%), rgba(8,7,12,0.86)',
          border: '1px solid rgba(216,208,228,0.16)',
        }}
      >
        <div className="font-data text-[10px] tracking-[0.32em] uppercase mb-4" style={{ color: 'rgba(216,208,228,0.55)' }}>
          Drafting Prophecy
        </div>
        <p
          className="font-oracle-script"
          style={{ color: 'rgba(229,221,242,0.88)', fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', lineHeight: 1.4 }}
        >
          神谕未成形…
          <br />
          波正在选择该用哪一句话坍缩进文字。
        </p>
      </div>
    )
  }

  if (oracleStatus === 'error' || !oracleProphecy) {
    return (
      <div
        className="relative overflow-hidden rounded-sm p-8 md:p-10"
        style={{
          background:
            'radial-gradient(circle at 25% 20%, rgba(122,90,168,0.16), transparent 55%), rgba(8,7,12,0.84)',
          border: '1px solid rgba(216,208,228,0.16)',
        }}
      >
        <div className="font-data text-[10px] tracking-[0.32em] uppercase mb-4" style={{ color: 'rgba(216,208,228,0.55)' }}>
          Echo From The Substrate
        </div>
        <p
          className="font-oracle-script whitespace-pre-line"
          style={{ color: 'rgba(229,221,242,0.92)', fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', lineHeight: 1.55 }}
        >
          {fateResult?.oraclePoem ?? '波尚未回响。'}
        </p>
        {oracleStatus === 'error' && oracleError && (
          <p className="mt-4 text-[11px] font-data" style={{ color: 'rgba(184,146,138,0.75)' }}>
            神谕通道未通：{oracleError}
          </p>
        )}
      </div>
    )
  }

  return (
    <div
      className="relative overflow-hidden rounded-sm p-8 md:p-12"
      style={{
        background:
          'radial-gradient(circle at 18% 10%, rgba(122,90,168,0.18), transparent 55%), radial-gradient(circle at 86% 90%, rgba(72,90,160,0.16), transparent 60%), rgba(8,7,12,0.92)',
        border: '1px solid rgba(216,208,228,0.18)',
        boxShadow: '0 30px 60px rgba(0,0,0,0.35)',
      }}
    >
      <div className="font-data text-[10px] tracking-[0.32em] uppercase mb-5" style={{ color: 'rgba(216,208,228,0.62)' }}>
        Quantum Oracle · Prophecy
      </div>
      <div
        className="font-oracle-script whitespace-pre-line"
        style={{
          color: 'rgba(245,240,254,0.94)',
          fontSize: 'clamp(1.15rem, 2.4vw, 1.6rem)',
          lineHeight: 1.65,
        }}
      >
        {oracleProphecy}
      </div>
    </div>
  )
}

export default function ResultPage() {
  const { fateResult, setStep, reset, history, clearHistory } = useFateStore()
  const [showHistory, setShowHistory] = useState(false)
  const [showFormula, setShowFormula] = useState(false)
  const [sharing, setSharing] = useState(false)
  const shareRef = useRef<HTMLDivElement>(null)

  const handleShare = useCallback(async () => {
    if (!shareRef.current || !fateResult) return
    setSharing(true)
    try {
      const dataUrl = await toPng(shareRef.current, { backgroundColor: '#F2F0F5', pixelRatio: 2 })
      const link = document.createElement('a')
      link.download = `quantum-fate-${Date.now()}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Share failed:', err)
    }
    setSharing(false)
  }, [fateResult])

  const handleRestart = () => {
    reset()
    setStep('landing')
  }

  if (!fateResult) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-void)' }}>
        <span className="font-data text-sm" style={{ color: 'var(--text-muted)' }}>NO RESULT DATA</span>
      </div>
    )
  }

  const mainBranch = fateResult.mainBranch
  const elements = fateResult.debug.fiveElementProfile
  const trace = fateResult.trace

  return (
    <PageTransition className="relative min-h-screen" style={{ background: 'var(--bg-void)' }}>
      <ParticleGrid density={0.4} />

      <div ref={shareRef} className="relative z-10">
        {/* Header */}
        <header className="px-4 md:px-10 pt-12 pb-4 max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="section-label mb-3">Observation Report</div>
            <h1 className="font-display text-3xl md:text-4xl mb-2" style={{ color: 'var(--text-primary)' }}>
              命运波函数坍缩结果
            </h1>
            <div className="flex items-center gap-4">
              <span className="font-data text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {new Date().toLocaleString('zh-CN')}
              </span>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--quantum-cyan)' }} />
              <span className="font-data text-[10px]" style={{ color: 'var(--quantum-cyan)' }}>
                CONFIDENCE {(mainBranch.probability * 100).toFixed(1)}%
              </span>
            </div>
          </motion.div>
        </header>

        <main className="px-4 md:px-10 max-w-5xl mx-auto pb-24">
          <div className="divider mb-10" />

          <Section label="神谕" labelEn="ORACLE PROPHECY" delay={0.05}>
            <OracleProphecyBlock />
          </Section>

          <div className="divider my-10" />

          {fateResult.quantumTrace && (
            <>
              <Section label="量子命理模型" labelEn="QUANTUM DIVINATION MODEL" delay={0.08}>
                <QuantumObservationPanel trace={fateResult.quantumTrace} />
              </Section>
              <div className="divider my-10" />
            </>
          )}

          {/* Primary Worldline */}
          <Section label="主世界线" labelEn="PRIMARY WORLDLINE" delay={0.1}>
            <div
              className="relative rounded-lg p-8 md:p-10 overflow-hidden"
              style={{
                border: '1px solid var(--border-default)',
                background: 'linear-gradient(180deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.01) 100%)',
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.05) 0%, transparent 60%)' }}
              />
              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--quantum-blue)' }} />
                  <span className="font-data text-[9px] tracking-[0.2em] uppercase" style={{ color: 'var(--quantum-blue)' }}>
                    COLLAPSED RESULT
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-light mb-4" style={{ color: 'var(--text-primary)' }}>
                  {mainBranch.label}
                </h2>
                <div className="flex flex-wrap items-center gap-6 mb-4">
                  <div>
                    <span className="font-data text-2xl" style={{ color: 'var(--quantum-cyan)' }}>
                      {(mainBranch.probability * 100).toFixed(1)}%
                    </span>
                    <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>坍缩概率</span>
                  </div>
                  <div className="font-data text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    置信度: {mainBranch.probability > 0.5 ? 'HIGH' : mainBranch.probability > 0.3 ? 'MEDIUM' : 'LOW'}
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {mainBranch.shortAdvice}
                </p>
              </div>
            </div>
          </Section>

          <div className="divider my-10" />

          {/* Radial Branch Chart + Branch List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            <Section label="概率分支图" labelEn="PROBABILITY BRANCHES" delay={0.2}>
              <div className="flex justify-center">
                <RadialBranchChart
                  branches={fateResult.branches}
                  mainBranchId={mainBranch.id}
                  size={280}
                />
              </div>
            </Section>

            <div className="space-y-3">
              {fateResult.branches.map((branch) => (
                <BranchRow
                  key={branch.id}
                  branch={branch}
                  isMain={branch.id === mainBranch.id}
                />
              ))}
            </div>
          </div>

          <div className="divider my-10" />

          {/* Quantum Explanation */}
          <Section label="量子机制解释" labelEn="QUANTUM EXPLANATION" delay={0.3}>
            <button onClick={() => setShowFormula(!showFormula)} className="flex items-center gap-1 mb-3 text-[11px] transition-colors hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
              <span>{showFormula ? '收起线路与测量' : '查看线路与测量'}</span>
              {showFormula ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showFormula && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-4 space-y-4 overflow-hidden"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="panel p-5 overflow-x-auto">
                    <div className="section-label mb-4">Executable Circuit</div>
                    <div className="space-y-2 font-mono text-[11px]" style={{ color: 'var(--quantum-blue)' }}>
                      {fateResult.quantumTrace.circuitLines.map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                    </div>
                    <p className="mt-4 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {fateResult.quantumTrace.scienceNote}
                    </p>
                  </div>

                  <div className="panel p-5">
                    <div className="section-label mb-4">Born Measurement</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-sm p-4" style={{ background: 'rgba(0,0,0,0.025)' }}>
                        <div className="font-data text-[8px] mb-2" style={{ color: 'var(--text-muted)' }}>HIGHEST PROJECTION</div>
                        <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{fateResult.quantumTrace.branchProbabilities[0]?.label}</div>
                        <div className="font-data text-lg mt-1" style={{ color: 'var(--quantum-cyan)' }}>
                          {((fateResult.quantumTrace.branchProbabilities[0]?.probability ?? 0) * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="rounded-sm p-4" style={{ background: 'rgba(0,0,0,0.025)' }}>
                        <div className="font-data text-[8px] mb-2" style={{ color: 'var(--text-muted)' }}>OBSERVED COLLAPSE</div>
                        <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{fateResult.quantumTrace.measurement.measuredLabel}</div>
                        <div className="font-data text-lg mt-1" style={{ color: 'var(--collapse-gold)' }}>
                          {(mainBranch.probability * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {fateResult.quantumTrace.measurement.bornRule}。测量基底：{fateResult.quantumTrace.measurement.basisLabel}。
                    </p>
                  </div>

                  <div className="panel p-5 lg:col-span-2">
                    <div className="section-label mb-4">Hamiltonian / Channel Terms</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {fateResult.quantumTrace.hamiltonianTerms.map((term) => (
                        <div key={term.id} className="rounded-sm p-3" style={{ background: 'rgba(0,0,0,0.025)' }}>
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{term.label}</span>
                            <span className="font-data text-[8px]" style={{ color: 'var(--text-muted)' }}>
                              {term.operator} {term.coefficient.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            {term.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="panel p-6">
              <p className="text-sm leading-[1.8]" style={{ color: 'var(--text-secondary)' }}>
                {fateResult.quantumExplanation}
              </p>
            </div>
          </Section>

          <div className="divider my-10" />

          {/* Five Elements */}
          <Section label="命理映射" labelEn="DIVINATION MAPPING" delay={0.4}>
            <div className="panel p-6 mb-6">
              {fateResult.debug.birthNayin && (
                <div
                  className="font-data text-[10px] tracking-wider mb-4 pb-4 border-b"
                  style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}
                >
                  年柱 {fateResult.debug.birthNayin.ganzhi} · 纳音 {fateResult.debug.birthNayin.nayin}（
                  {fateResult.debug.birthNayin.elementLabel}）
                </div>
              )}
              <p className="text-sm leading-[1.8] mb-6" style={{ color: 'var(--text-secondary)' }}>
                {fateResult.divinationExplanation}
              </p>

              {/* Five Elements Bars */}
              <div className="grid grid-cols-5 gap-4">
                {Object.entries(elements).map(([element, value]) => {
                  const names: Record<string, string> = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' }
                  const colors: Record<string, string> = {
                    wood: '#6E7F72', fire: '#9B6B62', earth: '#9A8470', metal: '#B8B4C8', water: '#4A6278',
                  }
                  return (
                    <div key={element} className="text-center">
                      <div className="text-sm mb-2" style={{ color: colors[element] }}>{names[element]}</div>
                      <div className="w-full h-20 rounded-sm relative overflow-hidden" style={{ background: 'rgba(0,0,0,0.04)' }}>
                        <motion.div
                          className="absolute bottom-0 left-0 right-0 rounded-sm"
                          style={{ background: colors[element], opacity: 0.35 }}
                          initial={{ height: 0 }}
                          animate={{ height: `${value * 100}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                        />
                      </div>
                      <div className="font-data text-[9px] mt-1.5" style={{ color: 'var(--text-muted)' }}>{value.toFixed(2)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Section>

          {/* Parameter Trace */}
          <Section label="参数溯源" labelEn="PARAMETER TRACE" delay={0.5}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {trace.inputContributions.map((contribution) => (
                <ContributionCard key={contribution.id} contribution={contribution} />
              ))}
            </div>
          </Section>

          <div className="divider my-10" />

          {/* Action Advice */}
          <Section label="行动建议" labelEn="ACTION GUIDANCE" delay={0.6}>
            <div
              className="rounded-lg p-6"
              style={{
                border: '1px solid var(--border-subtle)',
                background: 'rgba(0, 0, 0, 0.02)',
              }}
            >
              <p className="text-sm leading-[1.8]" style={{ color: 'var(--text-secondary)' }}>
                {fateResult.actionAdvice}
              </p>
            </div>
          </Section>

          <div className="divider my-10" />

          {/* Oracle Poem */}
          <Section label="粒子签文" labelEn="PARTICLE ORACLE" delay={0.7}>
            <div
              className="relative p-8 md:p-10 rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--border-subtle)', background: 'rgba(0, 0, 0, 0.02)' }}
            >
              <div
                className="absolute top-3 left-5 text-5xl font-serif opacity-[0.08]"
                style={{ color: 'var(--phase-purple)' }}
              >
                &ldquo;
              </div>
              <div className="space-y-2 relative">
                {fateResult.oraclePoem.split('\n').filter(Boolean).map((line, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 + i * 0.2 }}
                    className="text-sm md:text-base leading-relaxed pl-4"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {line}
                  </motion.p>
                ))}
              </div>
            </div>
          </Section>

          <div className="divider my-10" />

          {/* Disclaimer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex items-start gap-3 p-4 rounded mb-10"
            style={{ background: 'rgba(0, 0, 0, 0.02)', border: '1px solid var(--border-subtle)' }}
          >
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--risk-red)' }} />
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {trace.scienceNote}
              分享图中不包含你的出生地点和具体生日等敏感信息。
            </p>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="flex flex-wrap gap-3"
          >
            <button onClick={handleRestart} className="btn-secondary">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重新观测</span>
            </button>
            <button
              onClick={handleShare}
              disabled={sharing}
              className="btn-primary"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{sharing ? '生成中...' : '分享图'}</span>
            </button>
            <button onClick={() => setShowHistory(!showHistory)} className="btn-secondary">
              <History className="w-3.5 h-3.5" />
              <span>历史 ({history.length})</span>
            </button>
          </motion.div>
        </main>
      </div>

      {/* History Panel */}
      {showHistory && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[55vh] overflow-y-auto"
          style={{ background: 'var(--bg-primary)', borderTop: '1px solid var(--border-subtle)' }}
        >
          <div className="px-6 md:px-10 py-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-5">
              <span className="section-label">Observation History</span>
              <div className="flex items-center gap-4">
                {history.length > 0 && (
                  <button onClick={clearHistory} className="flex items-center gap-1 text-[11px] transition-colors hover:opacity-70" style={{ color: 'var(--risk-red)' }}>
                    <Trash2 className="w-3 h-3" />
                    <span>清除</span>
                  </button>
                )}
                <button onClick={() => setShowHistory(false)} className="text-[11px] transition-colors hover:opacity-70" style={{ color: 'var(--text-muted)' }}>关闭</button>
              </div>
            </div>

            {history.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>暂无观测记录</p>
            ) : (
              <div className="space-y-2">
                {history.map((record) => (
                  <div key={record.id} className="panel p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{record.question}</p>
                      <div className="flex items-center gap-3 font-data text-[9px]" style={{ color: 'var(--text-muted)' }}>
                        <span>{new Date(record.date).toLocaleDateString('zh-CN')}</span>
                        <span>{record.mainBranchLabel}</span>
                        <span>{(record.mainBranchProbability * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </PageTransition>
  )
}
